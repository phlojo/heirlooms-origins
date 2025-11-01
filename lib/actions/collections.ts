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

  const { data, error } = await supabase.from("collections").select("*").eq("slug", slug).single()

  if (error) {
    console.error("[v0] Collection fetch error:", error)
    return null
  }

  return data
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
