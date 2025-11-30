"use server"

import { createClient } from "@/lib/supabase/server"
import { collectionSchema, type CollectionInput } from "@/lib/schemas"
import { revalidatePath } from "next/cache"
import { getArtifactsByCollection, deleteArtifact } from "./artifacts"
import { generateSlug, generateUniqueSlug } from "@/lib/utils/slug"
import { isCurrentUserAdmin } from "@/lib/utils/admin"
import { getPrimaryVisualMediaUrl } from "@/lib/media"

export async function createCollection(input: CollectionInput) {
  const validatedFields = collectionSchema.safeParse(input)

  if (!validatedFields.success) {
    return {
      success: false,
      error: "Invalid input",
      fieldErrors: validatedFields.error.flatten().fieldErrors,
    }
  }

  const supabase = await createClient()

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

  const { data, error } = await supabase
    .from("collections")
    .insert({
      title: validatedFields.data.title,
      description: validatedFields.data.description,
      is_public: validatedFields.data.is_public,
      slug,
      user_id: user.id,
      primary_type_id: validatedFields.data.primary_type_id,
    })
    .select()
    .single()

  if (error) {
    console.error("Collection creation error:", error)
    return { success: false, error: "Failed to create collection. Please try again." }
  }

  revalidatePath("/collections")
  return { success: true, data }
}

export async function getCollection(id: string) {
  const supabase = await createClient()

  const { data, error } = await supabase.from("collections").select("*").eq("id", id).single()

  if (error) {
    console.error("Collection fetch error:", error)
    return null
  }

  return data
}

export async function getCollectionBySlug(slug: string) {
  const supabase = await createClient()

  try {
    const { data, error } = await supabase.from("collections").select("*").eq("slug", slug).single()

    if (error) {
      console.error("Collection fetch error:", error)
      return null
    }

    return data
  } catch (err) {
    console.error("Collection fetch error:", err)
    return null
  }
}

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

  let query = supabase
    .from("collections")
    .select("id, title, slug, created_at, user_id, is_public")
    .order("created_at", { ascending: false })

  if (mode === "all") {
    query = query.eq("is_public", true)
  } else if (mode === "mine") {
    if (!userId) {
      return { previous: null, next: null }
    }
    query = query.eq("user_id", userId)
  } else {
    if (userId) {
      query = query.or(`is_public.eq.true,user_id.eq.${userId}`)
    } else {
      query = query.eq("is_public", true)
    }
  }

  const { data: collections, error } = await query

  if (error || !collections) {
    console.error("Error fetching adjacent collections:", error)
    return { previous: null, next: null }
  }

  const currentIndex = collections.findIndex((c) => c.id === collectionId)

  if (currentIndex === -1) {
    return { previous: null, next: null }
  }

  const previous = currentIndex > 0 ? collections[currentIndex - 1] : null
  const next = currentIndex < collections.length - 1 ? collections[currentIndex + 1] : null

  return { previous, next }
}

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

  const currentInList = collections.find((c) => c.id === currentCollectionId)
  if (currentInList) {
    return currentInList
  }

  const closestNext = collections.find((c) => new Date(c.created_at) <= new Date(currentCreatedAt))

  return closestNext || collections[0]
}

export async function updateCollection(collectionId: string, input: CollectionInput) {
  const validatedFields = collectionSchema.safeParse(input)

  if (!validatedFields.success) {
    return {
      success: false,
      error: "Invalid input",
      fieldErrors: validatedFields.error.flatten().fieldErrors,
    }
  }

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Unauthorized" }
  }

  const isAdmin = await isCurrentUserAdmin()

  const collection = await getCollection(collectionId)
  if (!collection) {
    return { success: false, error: "Collection not found" }
  }

  if (!isAdmin && collection.user_id !== user.id) {
    return { success: false, error: "Unauthorized" }
  }

  const { data, error } = await supabase
    .from("collections")
    .update({
      title: validatedFields.data.title,
      description: validatedFields.data.description,
      is_public: validatedFields.data.is_public,
      updated_at: new Date().toISOString(),
      primary_type_id: validatedFields.data.primary_type_id,
    })
    .eq("id", collectionId)
    .select()
    .single()

  if (error) {
    console.error("Collection update error:", error)
    return { success: false, error: "Failed to update collection. Please try again." }
  }

  revalidatePath("/collections")
  revalidatePath(`/collections/${collection.slug}`)
  return { success: true, data }
}

export async function getOrCreateUncategorizedCollection(userId: string) {
  console.log("[v0] getOrCreateUncategorizedCollection - Starting for userId:", userId)

  const supabase = await createClient()

  const { data: userCollections, error: fetchError } = await supabase
    .from("collections")
    .select("*")
    .eq("user_id", userId)
    .ilike("slug", "uncategorized%") // Match "uncategorized" or "uncategorized-{anything}"
    .limit(1)

  console.log("[v0] getOrCreateUncategorizedCollection - Query result:", {
    found: !!userCollections && userCollections.length > 0,
    error: fetchError,
  })

  if (fetchError) {
    console.error("[v0] getOrCreateUncategorizedCollection - Fetch error:", fetchError)
  }

  if (userCollections && userCollections.length > 0) {
    console.log("[v0] getOrCreateUncategorizedCollection - Found existing:", userCollections[0].id)
    return { success: true, data: userCollections[0] }
  }

  const uniqueSlug = `uncategorized-${userId.substring(0, 8)}`
  console.log("[v0] getOrCreateUncategorizedCollection - Creating new with slug:", uniqueSlug)

  const { data, error } = await supabase
    .from("collections")
    .insert({
      user_id: userId,
      title: "Uncategorized Artifacts",
      description:
        "This collection holds your uncategorized artifacts — items you've created without assigning a collection, or ones that remained after a collection was deleted.",
      slug: uniqueSlug, // Use unique slug per user
      is_public: false,
    })
    .select()
    .single()

  if (error) {
    console.error("[v0] getOrCreateUncategorizedCollection - Create error:", error)
    return { success: false, error: "Failed to create uncategorized collection" }
  }

  console.log("[v0] getOrCreateUncategorizedCollection - Created successfully:", data.id)
  return { success: true, data }
}

export async function deleteCollection(collectionId: string, deleteArtifacts = false) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Unauthorized" }
  }

  const isAdmin = await isCurrentUserAdmin()

  const collection = await getCollection(collectionId)
  if (!collection) {
    return { success: false, error: "Collection not found" }
  }

  if (!isAdmin && collection.user_id !== user.id) {
    return { success: false, error: "You do not have permission to delete this collection" }
  }

  if (deleteArtifacts) {
    // Use deleteArtifact for each artifact - handles both storage backends,
    // gallery media, media blocks, and user_media cleanup
    const artifacts = await getArtifactsByCollection(collectionId)

    console.log("[deleteCollection] Deleting artifacts with media:", {
      collectionId,
      artifactCount: artifacts.length,
    })

    for (const artifact of artifacts) {
      const result = await deleteArtifact(artifact.id, true) // true = delete media
      if (!result.success) {
        console.error("[deleteCollection] Failed to delete artifact:", {
          artifactId: artifact.id,
          error: result.error,
        })
        // Continue with other artifacts even if one fails
      }
    }
  } else {
    const uncategorizedResult = await getOrCreateUncategorizedCollection(user.id)
    if (!uncategorizedResult.success || !uncategorizedResult.data) {
      return { success: false, error: "Failed to get uncategorized collection" }
    }

    const { error: updateError } = await supabase
      .from("artifacts")
      .update({ collection_id: uncategorizedResult.data.id })
      .eq("collection_id", collectionId)

    if (updateError) {
      console.error("Error moving artifacts to Uncategorized:", updateError)
      return {
        success: false,
        error: `Failed to move artifacts to Uncategorized: ${updateError.message || JSON.stringify(updateError)}`,
      }
    }
  }

  const { error } = await supabase.from("collections").delete().eq("id", collectionId)

  if (error) {
    console.error("Collection deletion error:", error)
    return { success: false, error: "Failed to delete collection. Please try again." }
  }

  revalidatePath("/collections")
  revalidatePath(`/collections/${collection.slug}`)

  return { success: true }
}

export async function getAllPublicCollectionsPaginated(
  excludeUserId?: string,
  limit = 24,
  cursor?: { createdAt: string; id: string },
) {
  const supabase = await createClient()

  try {
    const isAdmin = await isCurrentUserAdmin()

    let query = supabase
      .from("collections")
      .select("*")
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(limit + 1)

    if (excludeUserId) {
      query = query.neq("user_id", excludeUserId)
    }

    if (cursor) {
      query = query.or(`created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`)
    }

    const { data: collections, error } = await query

    if (error) {
      console.error("Error fetching paginated public collections:", error)
      return { collections: [], hasMore: false }
    }

    const hasMore = collections.length > limit
    const resultCollections = hasMore ? collections.slice(0, limit) : collections

    const collectionsWithImages = await Promise.all(
      resultCollections.map(async (collection) => {
        const { count } = await supabase
          .from("artifacts")
          .select("*", { count: "exact", head: true })
          .eq("collection_id", collection.id)

        const { data: artifacts } = await supabase
          .from("artifacts")
          .select("media_urls, thumbnail_url")
          .eq("collection_id", collection.id)
          .order("created_at", { ascending: false })
          .limit(5)

        const thumbnailImages =
          artifacts?.map((artifact) =>
            getPrimaryVisualMediaUrl(artifact.media_urls) || artifact.thumbnail_url
          ).filter(Boolean) || []

        return {
          ...collection,
          thumbnailImages,
          itemCount: count || 0,
          slug: collection.slug,
        }
      }),
    )

    const filteredCollections = isAdmin
      ? collectionsWithImages
      : collectionsWithImages.filter((collection) => collection.itemCount > 0)

    return { collections: filteredCollections, hasMore }
  } catch (error) {
    console.error("Unexpected error in getAllPublicCollectionsPaginated:", error)
    return { collections: [], hasMore: false }
  }
}

export async function getMyCollectionsPaginated(
  userId: string,
  limit = 24,
  cursor?: { createdAt: string; id: string },
) {
  const supabase = await createClient()

  try {
    let query = supabase
      .from("collections")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(limit + 1)

    if (cursor) {
      query = query.or(`created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`)
    }

    const { data: collections, error } = await query

    if (error) {
      console.error("Error fetching paginated user collections:", error)
      return { collections: [], hasMore: false }
    }

    const hasMore = collections.length > limit
    const resultCollections = hasMore ? collections.slice(0, limit) : collections

    const collectionsWithImages = await Promise.all(
      resultCollections.map(async (collection) => {
        const { count } = await supabase
          .from("artifacts")
          .select("*", { count: "exact", head: true })
          .eq("collection_id", collection.id)

        const { data: artifacts } = await supabase
          .from("artifacts")
          .select("media_urls, thumbnail_url")
          .eq("collection_id", collection.id)
          .order("created_at", { ascending: false })
          .limit(5)

        const thumbnailImages =
          artifacts?.map((artifact) =>
            getPrimaryVisualMediaUrl(artifact.media_urls) || artifact.thumbnail_url
          ).filter(Boolean) || []

        const isUncategorized = collection.slug.startsWith("uncategorized")

        return {
          ...collection,
          thumbnailImages,
          itemCount: count || 0,
          slug: collection.slug,
          isUnsorted: isUncategorized,
        }
      }),
    )

    collectionsWithImages.sort((a, b) => {
      if (a.isUnsorted) return -1
      if (b.isUnsorted) return 1
      return 0
    })

    return { collections: collectionsWithImages, hasMore }
  } catch (error) {
    console.error("Unexpected error in getMyCollectionsPaginated:", error)
    return { collections: [], hasMore: false }
  }
}

export async function getMyCollections(userId: string) {
  const supabase = await createClient()

  try {
    const { data: collections, error } = await supabase
      .from("collections")
      .select("id, title, slug")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching user collections:", error)
      return { collections: [], error: error.message }
    }

    const sortedCollections = collections.sort((a, b) => {
      const aIsUncategorized = a.slug.startsWith("uncategorized")
      const bIsUncategorized = b.slug.startsWith("uncategorized")
      if (aIsUncategorized) return -1
      if (bIsUncategorized) return 1
      return 0
    })

    return { collections: sortedCollections, error: null }
  } catch (error) {
    console.error("Unexpected error in getMyCollections:", error)
    return { collections: [], error: "Failed to fetch collections" }
  }
}

/**
 * Get user's collections with thumbnail images for the Collection Picker
 * Returns id, title, slug, thumbnailImages (up to 4), and itemCount
 */
export async function getMyCollectionsWithThumbnails(userId: string) {
  const supabase = await createClient()

  try {
    const { data: collections, error } = await supabase
      .from("collections")
      .select("id, title, slug")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching user collections:", error)
      return { collections: [], error: error.message }
    }

    // Enrich with thumbnails and item counts
    const collectionsWithThumbnails = await Promise.all(
      collections.map(async (collection) => {
        const { count } = await supabase
          .from("artifacts")
          .select("*", { count: "exact", head: true })
          .eq("collection_id", collection.id)

        const { data: artifacts } = await supabase
          .from("artifacts")
          .select("media_urls, thumbnail_url")
          .eq("collection_id", collection.id)
          .order("created_at", { ascending: false })
          .limit(4)

        const thumbnailImages =
          artifacts?.map((artifact) =>
            getPrimaryVisualMediaUrl(artifact.media_urls) || artifact.thumbnail_url
          ).filter(Boolean) || []

        const isUncategorized = collection.slug.startsWith("uncategorized")

        return {
          ...collection,
          thumbnailImages: thumbnailImages as string[],
          itemCount: count || 0,
          isUncategorized,
        }
      }),
    )

    // Sort with Uncategorized first
    collectionsWithThumbnails.sort((a, b) => {
      if (a.isUncategorized) return -1
      if (b.isUncategorized) return 1
      return 0
    })

    return { collections: collectionsWithThumbnails, error: null }
  } catch (error) {
    console.error("Unexpected error in getMyCollectionsWithThumbnails:", error)
    return { collections: [], error: "Failed to fetch collections" }
  }
}
