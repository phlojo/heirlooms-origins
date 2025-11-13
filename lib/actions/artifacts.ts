"use server"

import { createClient } from "@/lib/supabase/server"
import {
  createArtifactSchema,
  updateArtifactSchema,
  type CreateArtifactInput,
  type UpdateArtifactInput,
} from "@/lib/schemas"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { deleteCloudinaryMedia, extractPublicIdFromUrl } from "./cloudinary"

/**
 * Server action to create a new artifact
 */
export async function createArtifact(input: CreateArtifactInput) {
  console.log("[v0] === SERVER ACTION: createArtifact START ===")
  console.log("[v0] Input received:", input)

  // Validate input with Zod
  const validatedFields = createArtifactSchema.safeParse(input)

  if (!validatedFields.success) {
    console.log("[v0] Validation failed:", validatedFields.error)
    return {
      error: "Invalid input",
      fieldErrors: validatedFields.error.flatten().fieldErrors,
    }
  }

  console.log("[v0] Validation passed, validated data:", validatedFields.data)

  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()

  console.log("[v0] User authenticated:", user?.id)

  if (!user) {
    console.log("[v0] No user found, returning unauthorized")
    return { error: "Unauthorized" }
  }

  const uniqueMediaUrls = Array.from(new Set(validatedFields.data.media_urls || []))

  if (uniqueMediaUrls.length !== (validatedFields.data.media_urls?.length || 0)) {
    console.log(
      "[v0] Duplicate media URLs detected before database insert:",
      "Original count:",
      validatedFields.data.media_urls?.length,
      "Unique count:",
      uniqueMediaUrls.length,
      "URLs:",
      validatedFields.data.media_urls,
    )
  }

  const insertData = {
    title: validatedFields.data.title,
    description: validatedFields.data.description,
    collection_id: validatedFields.data.collectionId,
    year_acquired: validatedFields.data.year_acquired,
    origin: validatedFields.data.origin,
    media_urls: uniqueMediaUrls,
    user_id: user.id,
  }

  console.log("[v0] Inserting into database:", insertData)

  // Insert artifact into database
  const { data, error } = await supabase.from("artifacts").insert(insertData).select().single()

  console.log("[v0] Database insert result - data:", data, "error:", error)

  if (error) {
    console.error("[v0] Artifact creation error:", error)
    return { error: "Failed to create artifact. Please try again." }
  }

  console.log("[v0] Artifact created successfully with ID:", data.id)
  console.log("[v0] Revalidating paths...")

  revalidatePath("/artifacts")
  revalidatePath("/collections")
  if (validatedFields.data.collectionId) {
    revalidatePath(`/collections/${validatedFields.data.collectionId}`)
  }

  redirect(`/artifacts/${data.id}`)
}

/**
 * Server action to get artifacts by collection ID
 */
export async function getArtifactsByCollection(collectionId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("artifacts")
    .select(`
      *,
      collection:collections(id, title)
    `)
    .eq("collection_id", collectionId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[v0] Error fetching artifacts:", error)
    return []
  }

  return data
}

/**
 * Server action to get a single artifact by ID with collection info
 */
export async function getArtifactById(artifactId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("artifacts")
    .select(`
      *,
      collection:collections(id, title, is_public, slug)
    `)
    .eq("id", artifactId)
    .single()

  if (error) {
    console.error("[v0] Error fetching artifact:", error)
    return null
  }

  if (data) {
    const { data: profile } = await supabase.from("profiles").select("display_name").eq("id", data.user_id).single()

    return {
      ...data,
      author_name: profile?.display_name || null,
    }
  }

  return data
}

/**
 * Server action to get previous and next artifacts in the same collection
 */
export async function getAdjacentArtifacts(artifactId: string, collectionId: string) {
  const supabase = await createClient()

  // Get all artifacts in the collection ordered by created_at
  const { data: artifacts, error } = await supabase
    .from("artifacts")
    .select("id, title, created_at")
    .eq("collection_id", collectionId)
    .order("created_at", { ascending: false })

  if (error || !artifacts) {
    console.error("[v0] Error fetching adjacent artifacts:", error)
    return { previous: null, next: null, currentPosition: 0, totalCount: 0 }
  }

  // Find the current artifact's index
  const currentIndex = artifacts.findIndex((a) => a.id === artifactId)

  if (currentIndex === -1) {
    return { previous: null, next: null, currentPosition: 0, totalCount: artifacts.length }
  }

  // Previous is the one before in the array (newer), next is the one after (older)
  const previous = currentIndex > 0 ? artifacts[currentIndex - 1] : null
  const next = currentIndex < artifacts.length - 1 ? artifacts[currentIndex + 1] : null

  return {
    previous,
    next,
    currentPosition: currentIndex + 1,
    totalCount: artifacts.length,
  }
}

/**
 * Server action to get all artifacts from public collections
 */
export async function getAllPublicArtifacts(excludeUserId?: string) {
  const supabase = await createClient()

  let query = supabase
    .from("artifacts")
    .select(`
      *,
      collection:collections!inner(id, title, is_public)
    `)
    .eq("collection.is_public", true)

  // Exclude the current user's artifacts if specified
  if (excludeUserId) {
    query = query.neq("user_id", excludeUserId)
  }

  const { data, error } = await query.order("created_at", { ascending: false })

  if (error) {
    console.error("[v0] Error fetching public artifacts:", error)
    return []
  }

  const userIds = [...new Set(data.map((artifact) => artifact.user_id))]
  const { data: profiles } = await supabase.from("profiles").select("id, display_name").in("id", userIds)

  const profileMap = new Map(profiles?.map((p) => [p.id, p.display_name]) || [])

  return data.map((artifact) => ({
    ...artifact,
    author_name: profileMap.get(artifact.user_id) || null,
  }))
}

/**
 * Server action to get artifacts created by the current user
 */
export async function getMyArtifacts(userId: string) {
  const supabase = await createClient()

  console.log("[v0] getMyArtifacts - Fetching artifacts for user:", userId)

  const { data, error } = await supabase
    .from("artifacts")
    .select(`
      *,
      collection:collections(id, title, is_public)
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  console.log("[v0] getMyArtifacts - Found artifacts:", data?.length, "Error:", error)
  console.log(
    "[v0] getMyArtifacts - Artifacts with null collection_id:",
    data?.filter((a) => a.collection_id === null).length,
  )

  if (error) {
    console.error("[v0] Error fetching my artifacts:", error)
    return []
  }

  return data.map((artifact) => ({
    ...artifact,
    author_name: null, // User's own artifacts don't need author name
  }))
}

/**
 * Server action to update an existing artifact
 */
export async function updateArtifact(input: UpdateArtifactInput, oldMediaUrls: string[] = []) {
  console.log("[v0] === SERVER ACTION: updateArtifact START ===")
  console.log("[v0] Input received:", input)

  // Validate input with Zod
  const validatedFields = updateArtifactSchema.safeParse(input)

  if (!validatedFields.success) {
    console.log("[v0] Validation failed:", validatedFields.error)
    return {
      success: false,
      error: "Invalid input",
      fieldErrors: validatedFields.error.flatten().fieldErrors,
    }
  }

  console.log("[v0] Validation passed, validated data:", validatedFields.data)

  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()

  console.log("[v0] User authenticated:", user?.id)

  if (!user) {
    console.log("[v0] No user found, returning unauthorized")
    return { success: false, error: "Unauthorized" }
  }

  // Verify ownership
  const { data: existingArtifact } = await supabase
    .from("artifacts")
    .select("user_id, collection_id, collection:collections(slug)")
    .eq("id", validatedFields.data.id)
    .single()

  if (!existingArtifact || existingArtifact.user_id !== user.id) {
    console.log("[v0] Unauthorized access attempt, returning unauthorized")
    return { success: false, error: "Unauthorized" }
  }

  console.log("[v0] Ownership verified, existing artifact:", existingArtifact)

  // Delete removed images from Cloudinary
  const newMediaUrls = validatedFields.data.media_urls || []
  const removedUrls = oldMediaUrls.filter((url) => !newMediaUrls.includes(url))

  for (const url of removedUrls) {
    const publicId = await extractPublicIdFromUrl(url)
    if (publicId) {
      await deleteCloudinaryMedia(publicId)
    }
  }

  // Deduplicate media_urls before updating in database
  const uniqueMediaUrls = Array.from(new Set(newMediaUrls))

  if (uniqueMediaUrls.length !== newMediaUrls.length) {
    console.log(
      "[v0] Duplicate media URLs detected before database update:",
      "Original count:",
      newMediaUrls.length,
      "Unique count:",
      uniqueMediaUrls.length,
      "URLs:",
      newMediaUrls,
    )
  }

  const updateData = {
    title: validatedFields.data.title,
    description: validatedFields.data.description,
    year_acquired: validatedFields.data.year_acquired,
    origin: validatedFields.data.origin,
    media_urls: uniqueMediaUrls,
    updated_at: new Date().toISOString(),
  }

  console.log("[v0] Updating in database:", updateData)

  // Update artifact in database
  const { data, error } = await supabase
    .from("artifacts")
    .update(updateData)
    .eq("id", validatedFields.data.id)
    .select()
    .single()

  console.log("[v0] Database update result - data:", data, "error:", error)

  if (error) {
    console.error("[v0] Artifact update error:", error)
    return { success: false, error: "Failed to update artifact. Please try again." }
  }

  console.log("[v0] Artifact updated successfully with ID:", data.id)
  console.log("[v0] Revalidating paths...")

  revalidatePath(`/artifacts/${data.id}`)
  revalidatePath("/collections")
  if (existingArtifact.collection?.slug) {
    revalidatePath(`/collections/${existingArtifact.collection.slug}`)
  } else {
    revalidatePath(`/collections/${existingArtifact.collection_id}`)
  }

  console.log("[v0] Paths revalidated, returning success with data:", data)
  return { success: true, data }
}
