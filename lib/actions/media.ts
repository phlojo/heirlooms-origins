"use server"

import { createClient } from "@/lib/supabase/server"
import {
  createUserMediaSchema,
  updateUserMediaSchema,
  createArtifactMediaSchema,
  updateArtifactMediaSchema,
  reorderMediaSchema,
  type CreateUserMediaInput,
  type UpdateUserMediaInput,
  type CreateArtifactMediaInput,
  type UpdateArtifactMediaInput,
  type ReorderMediaInput,
} from "@/lib/schemas"
import {
  type UserMedia,
  type ArtifactMedia,
  type ArtifactMediaWithFile,
  type ArtifactMediaWithDerivatives,
  type UserMediaWithDerivatives,
} from "@/lib/types/media"
import { getSmallThumbnailUrl, getThumbnailUrl, getMediumUrl, getLargeUrl } from "@/lib/cloudinary"
import { revalidatePath } from "next/cache"

// ============================================================================
// User Media CRUD Operations
// ============================================================================

/**
 * Create a new user_media record
 * Used when uploading new media files
 */
export async function createUserMedia(
  input: CreateUserMediaInput
): Promise<{ data?: UserMedia; error?: string }> {
  const validatedFields = createUserMediaSchema.safeParse(input)

  if (!validatedFields.success) {
    console.error("[createUserMedia] Validation failed:", validatedFields.error.flatten())
    return { error: "Invalid input" }
  }

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Unauthorized" }
  }

  // Verify user_id matches authenticated user
  if (validatedFields.data.user_id !== user.id) {
    return { error: "Unauthorized - cannot create media for another user" }
  }

  const { data, error } = await supabase
    .from("user_media")
    .insert(validatedFields.data)
    .select()
    .single()

  if (error) {
    console.error("[createUserMedia] Database error:", error)
    return { error: "Failed to create media record" }
  }

  return { data }
}

/**
 * Update user_media metadata (dimensions, processing status)
 */
export async function updateUserMedia(
  input: UpdateUserMediaInput
): Promise<{ data?: UserMedia; error?: string }> {
  const validatedFields = updateUserMediaSchema.safeParse(input)

  if (!validatedFields.success) {
    return { error: "Invalid input" }
  }

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Unauthorized" }
  }

  const { id, ...updates } = validatedFields.data

  // RLS will ensure user can only update their own media
  const { data, error } = await supabase
    .from("user_media")
    .update(updates)
    .eq("id", id)
    .select()
    .single()

  if (error) {
    console.error("[updateUserMedia] Database error:", error)
    return { error: "Failed to update media" }
  }

  return { data }
}

/**
 * Get user's media library (all their uploaded media)
 * Optional filtering by media_type
 */
export async function getUserMediaLibrary(params?: {
  media_type?: "image" | "video" | "audio"
  limit?: number
  offset?: number
}): Promise<{ data?: UserMediaWithDerivatives[]; error?: string; count?: number }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Unauthorized" }
  }

  let query = supabase
    .from("user_media")
    .select("*", { count: "exact" })
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  if (params?.media_type) {
    query = query.eq("media_type", params.media_type)
  }

  if (params?.limit) {
    query = query.limit(params.limit)
  }

  if (params?.offset) {
    query = query.range(params.offset, params.offset + (params.limit || 50) - 1)
  }

  const { data, error, count } = await query

  if (error) {
    console.error("[getUserMediaLibrary] Database error:", error)
    return { error: "Failed to fetch media library" }
  }

  // Add derivative URLs
  const mediaWithDerivatives: UserMediaWithDerivatives[] = (data || []).map((media) => ({
    ...media,
    smallThumbnailUrl: getSmallThumbnailUrl(media.public_url),
    thumbnailUrl: getThumbnailUrl(media.public_url),
    mediumUrl: getMediumUrl(media.public_url),
    largeUrl: getLargeUrl(media.public_url),
    fullResUrl: media.public_url,
  }))

  return { data: mediaWithDerivatives, count: count || 0 }
}

/**
 * Delete user_media record
 * Note: This will cascade delete artifact_media links due to foreign key constraint
 */
export async function deleteUserMedia(mediaId: string): Promise<{ error?: string }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Unauthorized" }
  }

  // RLS will ensure user can only delete their own media
  const { error } = await supabase.from("user_media").delete().eq("id", mediaId)

  if (error) {
    console.error("[deleteUserMedia] Database error:", error)
    return { error: "Failed to delete media" }
  }

  return {}
}

/**
 * Permanently delete media from storage and all database references
 * This removes:
 * - The file from Supabase Storage or Cloudinary
 * - The user_media record
 * - All artifact_media links (cascade)
 * - References in artifacts.media_urls arrays
 * - References in AI metadata (image_captions, video_summaries, audio_transcripts)
 */
export async function permanentlyDeleteMedia(
  mediaUrl: string
): Promise<{ error?: string }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Unauthorized" }
  }

  console.log("[permanentlyDeleteMedia] Starting deletion for URL:", mediaUrl)

  // Import storage utilities dynamically to avoid circular dependencies
  const { isSupabaseStorageUrl, isCloudinaryUrl } = await import("@/lib/media")
  const { deleteFromSupabaseStorage } = await import("@/lib/actions/supabase-storage")
  const { deleteCloudinaryMedia, extractPublicIdFromUrl } = await import("@/lib/actions/cloudinary")

  // 1. Delete from storage
  if (isSupabaseStorageUrl(mediaUrl)) {
    console.log("[permanentlyDeleteMedia] Deleting from Supabase Storage")
    const storageResult = await deleteFromSupabaseStorage(mediaUrl)
    if (storageResult.error) {
      console.error("[permanentlyDeleteMedia] Storage deletion error:", storageResult.error)
      // Continue anyway - file might already be deleted
    }
  } else if (isCloudinaryUrl(mediaUrl)) {
    console.log("[permanentlyDeleteMedia] Deleting from Cloudinary")
    const publicId = await extractPublicIdFromUrl(mediaUrl)
    if (publicId) {
      await deleteCloudinaryMedia(publicId)
    }
  }

  // 2. Find and delete user_media record (this will cascade delete artifact_media links)
  const { data: userMedia } = await supabase
    .from("user_media")
    .select("id")
    .eq("public_url", mediaUrl)
    .eq("user_id", user.id)
    .single()

  if (userMedia) {
    console.log("[permanentlyDeleteMedia] Deleting user_media record:", userMedia.id)
    const { error: deleteError } = await supabase
      .from("user_media")
      .delete()
      .eq("id", userMedia.id)

    if (deleteError) {
      console.error("[permanentlyDeleteMedia] Failed to delete user_media:", deleteError)
    }
  }

  // 3. Remove from all artifacts.media_urls arrays and AI metadata
  const { data: artifacts } = await supabase
    .from("artifacts")
    .select("id, slug, media_urls, thumbnail_url, image_captions, video_summaries, audio_transcripts")
    .eq("user_id", user.id)
    .contains("media_urls", [mediaUrl])

  if (artifacts && artifacts.length > 0) {
    console.log("[permanentlyDeleteMedia] Updating", artifacts.length, "artifacts")

    const { isImageUrl, isVideoUrl } = await import("@/lib/media")

    for (const artifact of artifacts) {
      const updatedMediaUrls = (artifact.media_urls || []).filter((url: string) => url !== mediaUrl)

      const updatedImageCaptions = { ...(artifact.image_captions || {}) }
      delete updatedImageCaptions[mediaUrl]

      const updatedVideoSummaries = { ...(artifact.video_summaries || {}) }
      delete updatedVideoSummaries[mediaUrl]

      const updatedAudioTranscripts = { ...(artifact.audio_transcripts || {}) }
      delete updatedAudioTranscripts[mediaUrl]

      // Update thumbnail if it was the deleted media
      let newThumbnailUrl = artifact.thumbnail_url
      if (artifact.thumbnail_url === mediaUrl) {
        // Get gallery media URLs (in order) for this artifact
        const { data: galleryLinks } = await supabase
          .from("artifact_media")
          .select("media:user_media(public_url)")
          .eq("artifact_id", artifact.id)
          .eq("role", "gallery")
          .order("sort_order", { ascending: true })

        const galleryUrls = (galleryLinks || [])
          .map((link: any) => link.media?.public_url)
          .filter((url: string | undefined): url is string =>
            url !== undefined && url !== mediaUrl && (isImageUrl(url) || isVideoUrl(url))
          )

        // Get visual URLs from media blocks (not in gallery)
        const galleryUrlSet = new Set(galleryUrls)
        const blockVisualUrls = updatedMediaUrls.filter(
          (url: string) => !galleryUrlSet.has(url) && (isImageUrl(url) || isVideoUrl(url))
        )

        // Combine: gallery first, then blocks
        const allVisualUrls = [...galleryUrls, ...blockVisualUrls]
        newThumbnailUrl = allVisualUrls[0] || null

        console.log("[permanentlyDeleteMedia] Auto-selecting new thumbnail:", {
          artifactId: artifact.id,
          galleryCount: galleryUrls.length,
          blockCount: blockVisualUrls.length,
          newThumbnail: newThumbnailUrl || "NONE",
        })
      }

      const { error: updateError } = await supabase
        .from("artifacts")
        .update({
          media_urls: updatedMediaUrls,
          thumbnail_url: newThumbnailUrl,
          image_captions: updatedImageCaptions,
          video_summaries: updatedVideoSummaries,
          audio_transcripts: updatedAudioTranscripts,
          updated_at: new Date().toISOString(),
        })
        .eq("id", artifact.id)

      if (updateError) {
        console.error("[permanentlyDeleteMedia] Failed to update artifact", artifact.id, ":", updateError)
      }
    }
  }

  console.log("[permanentlyDeleteMedia] Deletion complete")
  return {}
}

// ============================================================================
// Artifact Media Link Operations
// ============================================================================

/**
 * Link media to an artifact with a specific role
 * Maintains dual-write pattern: updates both artifact_media table AND artifacts.media_urls array
 */
export async function createArtifactMediaLink(
  input: CreateArtifactMediaInput
): Promise<{ data?: ArtifactMedia; error?: string }> {
  const validatedFields = createArtifactMediaSchema.safeParse(input)

  if (!validatedFields.success) {
    console.error("[createArtifactMediaLink] Validation failed:", validatedFields.error.flatten())
    return { error: "Invalid input" }
  }

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Unauthorized" }
  }

  // Verify user owns the artifact
  const { data: artifact } = await supabase
    .from("artifacts")
    .select("id, user_id, media_urls")
    .eq("id", validatedFields.data.artifact_id)
    .single()

  if (!artifact || artifact.user_id !== user.id) {
    return { error: "Unauthorized - artifact not found or access denied" }
  }

  // Get the media URL
  const { data: media } = await supabase
    .from("user_media")
    .select("public_url")
    .eq("id", validatedFields.data.media_id)
    .single()

  if (!media) {
    return { error: "Media not found" }
  }

  // Get the current max sort_order for this artifact+role to avoid unique constraint violations
  const role = validatedFields.data.role || "gallery"
  const { data: maxOrderResult } = await supabase
    .from("artifact_media")
    .select("sort_order")
    .eq("artifact_id", validatedFields.data.artifact_id)
    .eq("role", role)
    .order("sort_order", { ascending: false })
    .limit(1)
    .single()

  // Always calculate next available sort_order to avoid unique constraint violations
  // The unique constraint is on (artifact_id, role, sort_order)
  const nextSortOrder = (maxOrderResult?.sort_order ?? -1) + 1

  // Create artifact_media link with calculated sort_order
  const insertData = {
    artifact_id: validatedFields.data.artifact_id,
    media_id: validatedFields.data.media_id,
    role,
    sort_order: nextSortOrder,
    block_id: validatedFields.data.block_id,
    caption_override: validatedFields.data.caption_override,
    is_primary: validatedFields.data.is_primary,
  }

  const { data, error } = await supabase
    .from("artifact_media")
    .insert(insertData)
    .select()
    .single()

  if (error) {
    console.error("[createArtifactMediaLink] Database error:", error)
    return { error: "Failed to create artifact media link" }
  }

  // DUAL-WRITE PATTERN: Update artifacts.media_urls array for backward compatibility
  // Only add to media_urls if role is 'gallery' (maintain existing behavior)
  if (validatedFields.data.role === "gallery") {
    const currentUrls = artifact.media_urls || []
    if (!currentUrls.includes(media.public_url)) {
      const updatedUrls = [...currentUrls, media.public_url]
      await supabase
        .from("artifacts")
        .update({ media_urls: updatedUrls })
        .eq("id", validatedFields.data.artifact_id)
    }
  }

  revalidatePath(`/artifacts/${validatedFields.data.artifact_id}`)

  return { data }
}

/**
 * Update artifact_media link (change role, sort order, etc.)
 */
export async function updateArtifactMediaLink(
  input: UpdateArtifactMediaInput
): Promise<{ data?: ArtifactMedia; error?: string }> {
  const validatedFields = updateArtifactMediaSchema.safeParse(input)

  if (!validatedFields.success) {
    return { error: "Invalid input" }
  }

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Unauthorized" }
  }

  const { id, ...updates } = validatedFields.data

  // Get artifact_id for revalidation
  const { data: link } = await supabase
    .from("artifact_media")
    .select("artifact_id")
    .eq("id", id)
    .single()

  if (!link) {
    return { error: "Artifact media link not found" }
  }

  // RLS will ensure user can only update links for their own artifacts
  const { data, error } = await supabase.from("artifact_media").update(updates).eq("id", id).select().single()

  if (error) {
    console.error("[updateArtifactMediaLink] Database error:", error)
    return { error: "Failed to update artifact media link" }
  }

  revalidatePath(`/artifacts/${link.artifact_id}`)

  return { data }
}

/**
 * Remove media from artifact's gallery (artifact_media link only)
 * Does NOT remove from artifacts.media_urls - gallery and media blocks are independent
 * Same media can exist in both gallery and media blocks
 */
export async function removeArtifactMediaLink(linkId: string): Promise<{ error?: string }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Unauthorized" }
  }

  // Get link details before deletion (for revalidation path)
  const { data: link } = await supabase
    .from("artifact_media")
    .select("artifact_id")
    .eq("id", linkId)
    .single()

  if (!link) {
    return { error: "Link not found" }
  }

  // Delete the link from artifact_media table only
  // artifacts.media_urls is NOT modified - media blocks are independent of gallery
  const { error } = await supabase.from("artifact_media").delete().eq("id", linkId)

  if (error) {
    console.error("[removeArtifactMediaLink] Database error:", error)
    return { error: "Failed to remove artifact media link" }
  }

  revalidatePath(`/artifacts/${link.artifact_id}`)

  return {}
}

// ============================================================================
// Query Operations
// ============================================================================

/**
 * Get all media for an artifact with a specific role
 * Returns media with full file details and derivative URLs
 */
export async function getArtifactMediaByRole(
  artifactId: string,
  role: "gallery" | "inline_block" | "cover"
): Promise<{ data?: ArtifactMediaWithDerivatives[]; error?: string }> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("artifact_media")
    .select(
      `
      *,
      media:user_media(*)
    `
    )
    .eq("artifact_id", artifactId)
    .eq("role", role)
    .order("sort_order", { ascending: true })

  if (error) {
    console.error("[getArtifactMediaByRole] Database error:", error)
    return { error: "Failed to fetch artifact media" }
  }

  // Add derivative URLs, filtering out any items where the media join failed
  // (can happen if artifact_media references a deleted user_media record)
  const mediaWithDerivatives: ArtifactMediaWithDerivatives[] = (data || [])
    .filter((item) => item.media !== null)
    .map((item) => {
      const media = item.media as UserMedia
      return {
        ...item,
        media: {
          ...media,
          smallThumbnailUrl: getSmallThumbnailUrl(media.public_url),
          thumbnailUrl: getThumbnailUrl(media.public_url),
          mediumUrl: getMediumUrl(media.public_url),
          largeUrl: getLargeUrl(media.public_url),
          fullResUrl: media.public_url,
        },
      }
    })

  return { data: mediaWithDerivatives }
}

/**
 * Get gallery media for an artifact (most common query)
 * Convenience wrapper around getArtifactMediaByRole
 */
export async function getArtifactGalleryMedia(
  artifactId: string
): Promise<{ data?: ArtifactMediaWithDerivatives[]; error?: string }> {
  return getArtifactMediaByRole(artifactId, "gallery")
}

/**
 * Reorder media within a role
 * Updates sort_order for multiple items atomically
 */
export async function reorderArtifactMedia(input: ReorderMediaInput): Promise<{ error?: string }> {
  console.log("[reorderArtifactMedia] Called with input:", input)

  const validatedFields = reorderMediaSchema.safeParse(input)

  if (!validatedFields.success) {
    console.error("[reorderArtifactMedia] Validation failed:", validatedFields.error)
    return { error: "Invalid input" }
  }

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    console.error("[reorderArtifactMedia] No user found")
    return { error: "Unauthorized" }
  }

  console.log("[reorderArtifactMedia] User:", user.id)

  // Verify user owns the artifact
  const { data: artifact } = await supabase
    .from("artifacts")
    .select("id, user_id")
    .eq("id", validatedFields.data.artifact_id)
    .single()

  if (!artifact || artifact.user_id !== user.id) {
    console.error("[reorderArtifactMedia] Unauthorized - artifact owner:", artifact?.user_id, "user:", user.id)
    return { error: "Unauthorized" }
  }

  console.log("[reorderArtifactMedia] Updating", validatedFields.data.reorders.length, "items")

  // Two-phase update to avoid unique constraint violations:
  // 1. Set all to negative temporary values
  // 2. Set to final positive values
  try {
    // Phase 1: Set to negative temporary values
    console.log("[reorderArtifactMedia] Phase 1: Setting temporary negative values")
    for (let i = 0; i < validatedFields.data.reorders.length; i++) {
      const reorder = validatedFields.data.reorders[i]
      const tempOrder = -(i + 1) // -1, -2, -3, etc.

      const result = await supabase
        .from("artifact_media")
        .update({ sort_order: tempOrder })
        .eq("artifact_id", validatedFields.data.artifact_id)
        .eq("media_id", reorder.media_id)
        .eq("role", validatedFields.data.role)

      if (result.error) {
        console.error("[reorderArtifactMedia] Phase 1 failed:", result.error)
        return { error: `Failed to reorder: ${result.error.message}` }
      }
    }

    // Phase 2: Set to final positive values
    console.log("[reorderArtifactMedia] Phase 2: Setting final values")
    for (const reorder of validatedFields.data.reorders) {
      const result = await supabase
        .from("artifact_media")
        .update({ sort_order: reorder.new_sort_order })
        .eq("artifact_id", validatedFields.data.artifact_id)
        .eq("media_id", reorder.media_id)
        .eq("role", validatedFields.data.role)

      console.log("[reorderArtifactMedia] Set media", reorder.media_id, "to position", reorder.new_sort_order)

      if (result.error) {
        console.error("[reorderArtifactMedia] Phase 2 failed:", result.error)
        return { error: `Failed to reorder: ${result.error.message}` }
      }
    }

    console.log("[reorderArtifactMedia] All updates successful")
  } catch (error) {
    console.error("[reorderArtifactMedia] Database error:", error)
    return { error: "Failed to reorder media" }
  }

  revalidatePath(`/artifacts/${validatedFields.data.artifact_id}`)

  console.log("[reorderArtifactMedia] Success!")
  return {}
}

/**
 * Get all artifacts using a specific media file
 * Useful for "where is this media used" queries
 */
export async function getMediaUsage(
  mediaId: string
): Promise<{ data?: Array<{ artifact_id: string; artifact_title: string; role: string; is_primary: boolean }>; error?: string }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Unauthorized" }
  }

  const { data, error } = await supabase
    .from("artifact_media")
    .select(
      `
      artifact_id,
      role,
      is_primary,
      artifact:artifacts(title)
    `
    )
    .eq("media_id", mediaId)

  if (error) {
    console.error("[getMediaUsage] Database error:", error)
    return { error: "Failed to fetch media usage" }
  }

  const usage = (data || []).map((item) => ({
    artifact_id: item.artifact_id,
    artifact_title: (item.artifact as any)?.title || "Unknown",
    role: item.role,
    is_primary: item.is_primary,
  }))

  return { data: usage }
}

// ============================================================================
// Helper Functions for Artifact Creation
// ============================================================================

/**
 * Create a user_media record from a URL
 * Extracts filename and media type from the URL
 */
export async function createUserMediaFromUrl(
  url: string,
  userId: string
): Promise<{ data?: UserMedia; error?: string }> {
  const supabase = await createClient()

  // Extract filename from URL
  const urlParts = url.split("/")
  const filename = urlParts[urlParts.length - 1].split("?")[0] || "media"

  // Determine media type and mime_type from URL
  const urlLower = url.toLowerCase()
  let mediaType: "image" | "video" | "audio" = "image"
  let mimeType = "image/jpeg" // Default

  if (urlLower.includes(".mp4") || urlLower.includes("/video/")) {
    mediaType = "video"
    mimeType = "video/mp4"
  } else if (urlLower.includes(".mov")) {
    mediaType = "video"
    mimeType = "video/quicktime"
  } else if (urlLower.includes(".webm")) {
    // webm can be video or audio
    if (urlLower.includes("audio") || urlLower.includes("recording")) {
      mediaType = "audio"
      mimeType = "audio/webm"
    } else {
      mediaType = "video"
      mimeType = "video/webm"
    }
  } else if (urlLower.includes(".mp3")) {
    mediaType = "audio"
    mimeType = "audio/mpeg"
  } else if (urlLower.includes(".wav")) {
    mediaType = "audio"
    mimeType = "audio/wav"
  } else if (urlLower.includes(".m4a")) {
    mediaType = "audio"
    mimeType = "audio/mp4"
  } else if (urlLower.includes(".png")) {
    mimeType = "image/png"
  } else if (urlLower.includes(".gif")) {
    mimeType = "image/gif"
  } else if (urlLower.includes(".webp")) {
    mimeType = "image/webp"
  }

  // Check if user_media already exists for this URL
  const { data: existingMedia } = await supabase
    .from("user_media")
    .select("*")
    .eq("public_url", url)
    .eq("user_id", userId)
    .single()

  if (existingMedia) {
    return { data: existingMedia }
  }

  // Create new user_media record
  const { data, error } = await supabase
    .from("user_media")
    .insert({
      user_id: userId,
      filename,
      media_type: mediaType,
      mime_type: mimeType,
      file_size_bytes: 0, // Unknown when creating from URL
      public_url: url,
      storage_path: url, // For Cloudinary/Supabase URLs, storage_path is the URL itself
      upload_source: "gallery",
    })
    .select()
    .single()

  if (error) {
    console.error("[createUserMediaFromUrl] Database error:", error)
    return { error: `Failed to create media record: ${error.message}` }
  }

  return { data }
}

/**
 * Create artifact_media links for multiple media URLs
 * Creates user_media records if they don't exist, then links them to the artifact
 */
export async function createArtifactMediaLinks(
  artifactId: string,
  mediaUrls: string[],
  userId: string,
  role: "gallery" | "inline_block" | "cover" = "gallery"
): Promise<{ error?: string; createdCount?: number }> {
  const supabase = await createClient()
  let createdCount = 0

  // Get current max sort_order for this artifact+role
  const { data: maxOrderResult } = await supabase
    .from("artifact_media")
    .select("sort_order")
    .eq("artifact_id", artifactId)
    .eq("role", role)
    .order("sort_order", { ascending: false })
    .limit(1)
    .single()

  let nextSortOrder = (maxOrderResult?.sort_order ?? -1) + 1

  for (const url of mediaUrls) {
    // Create or get user_media record
    const mediaResult = await createUserMediaFromUrl(url, userId)
    if (mediaResult.error || !mediaResult.data) {
      console.error(`[createArtifactMediaLinks] Failed to create user_media for ${url}:`, mediaResult.error)
      continue
    }

    // Check if artifact_media link already exists
    const { data: existingLink } = await supabase
      .from("artifact_media")
      .select("id")
      .eq("artifact_id", artifactId)
      .eq("media_id", mediaResult.data.id)
      .eq("role", role)
      .single()

    if (existingLink) {
      console.log(`[createArtifactMediaLinks] Link already exists for media ${mediaResult.data.id}`)
      continue
    }

    // Create artifact_media link with next available sort_order
    const { error } = await supabase
      .from("artifact_media")
      .insert({
        artifact_id: artifactId,
        media_id: mediaResult.data.id,
        role,
        sort_order: nextSortOrder,
        is_primary: nextSortOrder === 0,
      })

    if (error) {
      console.error(`[createArtifactMediaLinks] Failed to create link for ${url}:`, error)
      continue
    }

    nextSortOrder++

    createdCount++
  }

  console.log(`[createArtifactMediaLinks] Created ${createdCount} links for artifact ${artifactId}`)
  return { createdCount }
}
