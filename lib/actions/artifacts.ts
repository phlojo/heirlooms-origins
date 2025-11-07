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
  // Validate input with Zod
  const validatedFields = createArtifactSchema.safeParse(input)

  if (!validatedFields.success) {
    return {
      error: "Invalid input",
      fieldErrors: validatedFields.error.flatten().fieldErrors,
    }
  }

  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Unauthorized" }
  }

  // Insert artifact into database
  const { data, error } = await supabase
    .from("artifacts")
    .insert({
      title: validatedFields.data.title,
      description: validatedFields.data.description,
      collection_id: validatedFields.data.collectionId,
      year_acquired: validatedFields.data.year_acquired,
      origin: validatedFields.data.origin,
      media_urls: validatedFields.data.media_urls,
      user_id: user.id,
    })
    .select()
    .single()

  if (error) {
    console.error("[v0] Artifact creation error:", error)
    return { error: "Failed to create artifact. Please try again." }
  }

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
    return { previous: null, next: null }
  }

  // Find the current artifact's index
  const currentIndex = artifacts.findIndex((a) => a.id === artifactId)

  if (currentIndex === -1) {
    return { previous: null, next: null }
  }

  // Previous is the one before in the array (newer), next is the one after (older)
  const previous = currentIndex > 0 ? artifacts[currentIndex - 1] : null
  const next = currentIndex < artifacts.length - 1 ? artifacts[currentIndex + 1] : null

  return { previous, next }
}

/**
 * Server action to get all artifacts from public collections
 */
export async function getAllPublicArtifacts() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("artifacts")
    .select(`
      *,
      collection:collections!inner(id, title, is_public)
    `)
    .eq("collection.is_public", true)
    .order("created_at", { ascending: false })

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
 * Server action to update an existing artifact
 */
export async function updateArtifact(input: UpdateArtifactInput, oldMediaUrls: string[] = []) {
  // Validate input with Zod
  const validatedFields = updateArtifactSchema.safeParse(input)

  if (!validatedFields.success) {
    return {
      success: false,
      error: "Invalid input",
      fieldErrors: validatedFields.error.flatten().fieldErrors,
    }
  }

  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Unauthorized" }
  }

  // Verify ownership
  const { data: existingArtifact } = await supabase
    .from("artifacts")
    .select("user_id, collection_id, collection:collections(slug)")
    .eq("id", validatedFields.data.id)
    .single()

  if (!existingArtifact || existingArtifact.user_id !== user.id) {
    return { success: false, error: "Unauthorized" }
  }

  // Delete removed images from Cloudinary
  const newMediaUrls = validatedFields.data.media_urls || []
  const removedUrls = oldMediaUrls.filter((url) => !newMediaUrls.includes(url))

  for (const url of removedUrls) {
    const publicId = await extractPublicIdFromUrl(url)
    if (publicId) {
      await deleteCloudinaryMedia(publicId)
    }
  }

  // Update artifact in database
  const { data, error } = await supabase
    .from("artifacts")
    .update({
      title: validatedFields.data.title,
      description: validatedFields.data.description,
      year_acquired: validatedFields.data.year_acquired,
      origin: validatedFields.data.origin,
      media_urls: validatedFields.data.media_urls,
      updated_at: new Date().toISOString(),
    })
    .eq("id", validatedFields.data.id)
    .select()
    .single()

  if (error) {
    console.error("[v0] Artifact update error:", error)
    return { success: false, error: "Failed to update artifact. Please try again." }
  }

  revalidatePath(`/artifacts/${data.id}`)
  revalidatePath("/collections")
  if (existingArtifact.collection?.slug) {
    revalidatePath(`/collections/${existingArtifact.collection.slug}`)
  } else {
    revalidatePath(`/collections/${existingArtifact.collection_id}`)
  }

  return { success: true, data }
}
