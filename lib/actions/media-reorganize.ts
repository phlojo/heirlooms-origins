"use server"

import { createClient } from "@/lib/supabase/server"
import { moveSupabaseFile } from "./supabase-storage"
import { isSupabaseStorageUrl } from "@/lib/media"

/**
 * Phase 2: Reorganize media files after artifact creation
 * Moves Supabase Storage files from temp folder to artifact folder
 * Updates artifact media_urls AND user_media records with new locations
 *
 * IMPORTANT: This function processes BOTH:
 * 1. Media block URLs (stored in artifacts.media_urls)
 * 2. Gallery URLs (stored in user_media via artifact_media junction table)
 *
 * @param artifactId - The artifact ID to reorganize media for
 * @returns Success or error with details
 */
export async function reorganizeArtifactMedia(artifactId: string) {
  console.log("[media-reorganize] Starting reorganization for artifact:", artifactId)

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Unauthorized" }
  }

  // Fetch the artifact with AI metadata fields
  const { data: artifact, error: fetchError } = await supabase
    .from("artifacts")
    .select("id, media_urls, user_id, image_captions, video_summaries, audio_transcripts, thumbnail_url")
    .eq("id", artifactId)
    .single()

  if (fetchError || !artifact) {
    console.error("[media-reorganize] Failed to fetch artifact:", fetchError)
    return { error: "Artifact not found" }
  }

  if (artifact.user_id !== user.id) {
    return { error: "Unauthorized" }
  }

  // Collect media block URLs from artifacts.media_urls
  const mediaBlockUrls = artifact.media_urls || []

  // Also fetch gallery URLs from user_media via artifact_media links
  // These are stored in user_media.public_url, linked via artifact_media table
  const { data: galleryLinks, error: galleryError } = await supabase
    .from("artifact_media")
    .select("media:user_media(id, public_url)")
    .eq("artifact_id", artifactId)
    .eq("role", "gallery")

  if (galleryError) {
    console.error("[media-reorganize] Failed to fetch gallery links:", galleryError)
    // Continue with media_urls only
  }

  // Extract gallery URLs from the joined query
  const galleryUrls: string[] = (galleryLinks || [])
    .map((link: any) => link.media?.public_url)
    .filter((url: string | undefined): url is string => !!url)

  console.log("[media-reorganize] Found URLs:", {
    mediaBlocks: mediaBlockUrls.length,
    gallery: galleryUrls.length,
  })

  // Combine all URLs (deduplicated) - same URL might be in both gallery and media blocks
  const allUrls = [...new Set([...mediaBlockUrls, ...galleryUrls])]

  if (allUrls.length === 0) {
    console.log("[media-reorganize] No media to reorganize")
    return { success: true, movedCount: 0 }
  }

  console.log("[media-reorganize] Processing", allUrls.length, "unique URLs")

  // Move Supabase Storage files and collect URL mappings
  const urlMapping: Map<string, string> = new Map() // old URL -> new URL
  let movedCount = 0
  const errors: string[] = []

  // Process ALL unique URLs (both media blocks and gallery)
  for (const url of allUrls) {
    if (isSupabaseStorageUrl(url)) {
      console.log("[media-reorganize] Moving Supabase file:", url)
      const result = await moveSupabaseFile(url, user.id, artifactId)

      if (result.error || !result.publicUrl) {
        console.error("[media-reorganize] Failed to move file:", url, result.error)
        errors.push(`Failed to move ${url}: ${result.error}`)
        // Keep original URL in mapping (no change)
      } else if (result.publicUrl !== url) {
        movedCount++
        urlMapping.set(url, result.publicUrl)
        console.log("[media-reorganize] File moved:", url, "->", result.publicUrl)
      }
    }
    // Cloudinary URLs don't need reorganization
  }

  // Build updated media_urls array (only for media blocks stored in artifacts table)
  const updatedMediaBlockUrls = mediaBlockUrls.map((url: string) => urlMapping.get(url) || url)

  // Update artifact with new URLs if any files were moved
  if (movedCount > 0) {
    console.log("[media-reorganize] Updating artifact with", movedCount, "moved files")

    // Build update object with new media_urls (media blocks only)
    const updateData: Record<string, any> = { media_urls: updatedMediaBlockUrls }

    // Update AI metadata keys (image_captions, video_summaries, audio_transcripts)
    // These are JSONB objects keyed by URL, so we need to update the keys
    if (artifact.image_captions && Object.keys(artifact.image_captions).length > 0) {
      const updatedCaptions: Record<string, string> = {}
      for (const [oldUrl, caption] of Object.entries(artifact.image_captions)) {
        const newUrl = urlMapping.get(oldUrl) || oldUrl
        updatedCaptions[newUrl] = caption as string
      }
      updateData.image_captions = updatedCaptions
      console.log("[media-reorganize] Updated image_captions keys:", Object.keys(updatedCaptions).length)
    }

    if (artifact.video_summaries && Object.keys(artifact.video_summaries).length > 0) {
      const updatedSummaries: Record<string, string> = {}
      for (const [oldUrl, summary] of Object.entries(artifact.video_summaries)) {
        const newUrl = urlMapping.get(oldUrl) || oldUrl
        updatedSummaries[newUrl] = summary as string
      }
      updateData.video_summaries = updatedSummaries
      console.log("[media-reorganize] Updated video_summaries keys:", Object.keys(updatedSummaries).length)
    }

    if (artifact.audio_transcripts && Object.keys(artifact.audio_transcripts).length > 0) {
      const updatedTranscripts: Record<string, string> = {}
      for (const [oldUrl, transcript] of Object.entries(artifact.audio_transcripts)) {
        const newUrl = urlMapping.get(oldUrl) || oldUrl
        updatedTranscripts[newUrl] = transcript as string
      }
      updateData.audio_transcripts = updatedTranscripts
      console.log("[media-reorganize] Updated audio_transcripts keys:", Object.keys(updatedTranscripts).length)
    }

    // Update thumbnail_url if it was moved
    if (artifact.thumbnail_url && urlMapping.has(artifact.thumbnail_url)) {
      updateData.thumbnail_url = urlMapping.get(artifact.thumbnail_url)
      console.log("[media-reorganize] Updated thumbnail_url:", artifact.thumbnail_url, "->", updateData.thumbnail_url)
    }

    const { error: updateError } = await supabase
      .from("artifacts")
      .update(updateData)
      .eq("id", artifactId)

    if (updateError) {
      console.error("[media-reorganize] Failed to update artifact:", updateError)
      return {
        error: "Failed to update artifact with new URLs",
        details: updateError.message,
      }
    }

    // Also update user_media records with new URLs
    // This ensures gallery links (artifact_media -> user_media) have correct URLs
    for (const [oldUrl, newUrl] of urlMapping) {
      const { error: userMediaError } = await supabase
        .from("user_media")
        .update({
          public_url: newUrl,
          storage_path: newUrl,
        })
        .eq("public_url", oldUrl)
        .eq("user_id", user.id)

      if (userMediaError) {
        console.error("[media-reorganize] Failed to update user_media for", oldUrl, ":", userMediaError)
        // Non-fatal - continue with other updates
      } else {
        console.log("[media-reorganize] Updated user_media URL:", oldUrl, "->", newUrl)
      }
    }
  }

  console.log("[media-reorganize] Reorganization complete:", {
    movedCount,
    errorCount: errors.length,
  })

  return {
    success: true,
    movedCount,
    errors: errors.length > 0 ? errors : undefined,
  }
}
