"use server"

import { createClient } from "@/lib/supabase/server"
import { moveSupabaseFile } from "./supabase-storage"
import { isSupabaseStorageUrl } from "@/lib/media"

/**
 * Phase 2: Reorganize media files after artifact creation
 * Moves Supabase Storage files from temp folder to artifact folder
 * Updates artifact media_urls with new locations
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

  // Fetch the artifact
  const { data: artifact, error: fetchError } = await supabase
    .from("artifacts")
    .select("id, media_urls, user_id")
    .eq("id", artifactId)
    .single()

  if (fetchError || !artifact) {
    console.error("[media-reorganize] Failed to fetch artifact:", fetchError)
    return { error: "Artifact not found" }
  }

  if (artifact.user_id !== user.id) {
    return { error: "Unauthorized" }
  }

  const mediaUrls = artifact.media_urls || []
  if (mediaUrls.length === 0) {
    console.log("[media-reorganize] No media to reorganize")
    return { success: true, movedCount: 0 }
  }

  console.log("[media-reorganize] Found", mediaUrls.length, "media URLs")

  // Move Supabase Storage files and collect new URLs
  const updatedUrls: string[] = []
  let movedCount = 0
  const errors: string[] = []

  for (const url of mediaUrls) {
    if (isSupabaseStorageUrl(url)) {
      console.log("[media-reorganize] Moving Supabase file:", url)
      const result = await moveSupabaseFile(url, user.id, artifactId)

      if (result.error || !result.publicUrl) {
        console.error("[media-reorganize] Failed to move file:", url, result.error)
        errors.push(`Failed to move ${url}: ${result.error}`)
        updatedUrls.push(url) // Keep original URL on error
      } else {
        updatedUrls.push(result.publicUrl)
        if (result.publicUrl !== url) {
          movedCount++
          console.log("[media-reorganize] File moved:", url, "->", result.publicUrl)
        }
      }
    } else {
      // Cloudinary URL - no reorganization needed
      updatedUrls.push(url)
    }
  }

  // Update artifact with new URLs if any files were moved
  if (movedCount > 0) {
    console.log("[media-reorganize] Updating artifact with", movedCount, "new URLs")

    const { error: updateError } = await supabase
      .from("artifacts")
      .update({ media_urls: updatedUrls })
      .eq("id", artifactId)

    if (updateError) {
      console.error("[media-reorganize] Failed to update artifact:", updateError)
      return {
        error: "Failed to update artifact with new URLs",
        details: updateError.message,
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
