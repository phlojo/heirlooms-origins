"use server"

import { createClient } from "@/lib/supabase/server"
import { collectionSchema, type CollectionInput } from "@/lib/schemas"
import { revalidatePath } from "next/cache"
import { getArtifactsByCollection } from "./artifacts"
import { deleteCloudinaryMedia, extractPublicIdFromUrl } from "./cloudinary"
import { generateSlug, generateUniqueSlug } from "@/lib/utils/slug"

/**
 * Server action to create a new collection
 */
export async function createCollection(input: CollectionInput) {
  // Validate input with Zod
  const validatedFields = collectionSchema.safeParse(input)

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

  const baseSlug = generateSlug(validatedFields.data.title)
  const slug = await generateUniqueSlug(baseSlug, async (testSlug) => {
    const { data } = await supabase.from("collections").select("id").eq("slug", testSlug).single()
    return !!data
  })

  // Insert collection into database
  const { data, error } = await supabase
    .from("collections")
    .insert({
      title: validatedFields.data.title,
      description: validatedFields.data.description,
      is_public: validatedFields.data.is_public,
      slug, // Add slug to insert
      user_id: user.id,
    })
    .select()
    .single()

  if (error) {
    console.error("[v0] Collection creation error:", error)
    return { success: false, error: "Failed to create collection. Please try again." }
  }

  revalidatePath("/collections")
  return { success: true, data }
}

/**
 * Server action to get a collection by ID
 */
export async function getCollection(id: string) {
  const supabase = await createClient()

  const { data, error } = await supabase.from("collections").select("*").eq("id", id).single()

  if (error) {
    console.error("[v0] Collection fetch error:", error)
    return null
  }

  return data
}

/**
 * Server action to get a collection by slug
 */
export async function getCollectionBySlug(slug: string) {
  const supabase = await createClient()

  try {
    const { data, error } = await supabase.from("collections").select("*").eq("slug", slug).single()

    if (error) {
      console.error("[v0] Collection fetch error:", error)
      return null
    }

    return data
  } catch (err) {
    // Handle rate limiting or network errors
    console.error("[v0] Collection fetch error:", err)
    if (err instanceof Error && err.message.includes("Too Many")) {
      console.error("[v0] Rate limit exceeded when fetching collection")
    }
    return null
  }
}

/**
 * Server action to get previous and next collections based on filter mode
 * @param collectionId - Current collection ID
 * @param userId - Current user ID (null if not logged in)
 * @param mode - Filter mode: "all" (public only), "mine" (user's collections only), or "both" (public + user's)
 */
export async function getAdjacentCollections(
  collectionId: string,
  userId: string | null,
  mode: "all" | "mine" | "both" = "both",
) {
  const supabase = await createClient()

  const { data: currentCollection } = await supabase
    .from("collections")
    .select("user_id, is_public, created_at")
    .eq("id", collectionId)
    .single()

  if (!currentCollection) {
    return { previous: null, next: null }
  }

  // Build query based on mode
  let query = supabase
    .from("collections")
    .select("id, title, slug, created_at, user_id, is_public")
    .order("created_at", { ascending: false })

  if (mode === "all") {
    // Only public collections
    query = query.eq("is_public", true)
  } else if (mode === "mine") {
    // Only user's collections
    if (!userId) {
      return { previous: null, next: null }
    }
    query = query.eq("user_id", userId)
  } else {
    // Both public and user's collections
    if (userId) {
      query = query.or(`is_public.eq.true,user_id.eq.${userId}`)
    } else {
      query = query.eq("is_public", true)
    }
  }

  const { data: collections, error } = await query

  if (error || !collections) {
    console.error("[v0] Error fetching adjacent collections:", error)
    return { previous: null, next: null }
  }

  // Find the current collection's index
  const currentIndex = collections.findIndex((c) => c.id === collectionId)

  if (currentIndex === -1) {
    return { previous: null, next: null }
  }

  // Previous is the one before in the array (newer), next is the one after (older)
  const previous = currentIndex > 0 ? collections[currentIndex - 1] : null
  const next = currentIndex < collections.length - 1 ? collections[currentIndex + 1] : null

  return { previous, next }
}

/**
 * Server action to find the closest collection when switching filter modes
 * @param currentCollectionId - Current collection ID
 * @param currentCreatedAt - Current collection's created_at timestamp
 * @param userId - Current user ID
 * @param targetMode - Target filter mode to switch to
 */
export async function getClosestCollection(
  currentCollectionId: string,
  currentCreatedAt: string,
  userId: string,
  targetMode: "all" | "mine",
) {
  const supabase = await createClient()

  let query = supabase
    .from("collections")
    .select("id, title, slug, created_at")
    .order("created_at", { ascending: false })

  if (targetMode === "all") {
    query = query.eq("is_public", true)
  } else if (targetMode === "mine") {
    query = query.eq("user_id", userId)
  }

  const { data: collections, error } = await query

  if (error || !collections || collections.length === 0) {
    return null
  }

  // Check if current collection is in the filtered list
  const currentInList = collections.find((c) => c.id === currentCollectionId)
  if (currentInList) {
    return currentInList
  }

  // Find the closest next collection (older or same timestamp)
  const closestNext = collections.find((c) => new Date(c.created_at) <= new Date(currentCreatedAt))

  return closestNext || collections[0]
}

/**
 * Server action to delete a collection and all its artifacts
 * Also deletes associated media from Cloudinary
 */
export async function deleteCollection(collectionId: string) {
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Unauthorized" }
  }

  // Verify ownership
  const collection = await getCollection(collectionId)
  if (!collection) {
    return { success: false, error: "Collection not found" }
  }

  if (collection.user_id !== user.id) {
    return { success: false, error: "You do not have permission to delete this collection" }
  }

  // Get all artifacts in the collection to delete their media
  const artifacts = await getArtifactsByCollection(collectionId)

  // Delete media from Cloudinary for each artifact
  const mediaUrls: string[] = []
  artifacts.forEach((artifact) => {
    if (artifact.media_urls && Array.isArray(artifact.media_urls)) {
      mediaUrls.push(...artifact.media_urls)
    }
  })

  // Delete each media file from Cloudinary
  for (const url of mediaUrls) {
    const publicId = await extractPublicIdFromUrl(url)
    if (publicId) {
      await deleteCloudinaryMedia(publicId)
    }
  }

  // Delete the collection (artifacts will cascade delete due to foreign key constraint)
  const { error } = await supabase.from("collections").delete().eq("id", collectionId)

  if (error) {
    console.error("[v0] Collection deletion error:", error)
    return { success: false, error: "Failed to delete collection. Please try again." }
  }

  // Revalidate paths
  revalidatePath("/collections")
  revalidatePath(`/collections/${collection.slug}`)

  return { success: true }
}
