"use server"

import { createClient } from "@/lib/supabase/server"

/**
 * Media derivative URLs for a single media item
 */
export interface MediaDerivatives {
  thumb: string // 400x400, cropped to fill
  medium: string // 1024px width
  large?: string // 1600px width (optional)
}

/**
 * Generates derivative URLs for a Cloudinary media URL
 * These are constructed URLs, not actually generated yet - Cloudinary generates on first request
 */
export function generateDerivativeUrls(originalUrl: string): MediaDerivatives | null {
  if (!originalUrl || !originalUrl.includes("cloudinary.com")) {
    return null
  }

  // Split URL at /upload/ and insert transformations
  const parts = originalUrl.split("/upload/")
  if (parts.length !== 2) {
    return null
  }

  const baseUrl = parts[0]
  const path = parts[1]

  // Check if this is a video
  const isVideo = originalUrl.includes("/video/upload/") &&
                  (originalUrl.toLowerCase().includes(".mp4") ||
                   originalUrl.toLowerCase().includes(".mov") ||
                   originalUrl.toLowerCase().includes(".avi") ||
                   originalUrl.toLowerCase().includes(".webm") ||
                   originalUrl.toLowerCase().includes(".mkv"))

  if (isVideo) {
    // For videos, generate thumbnail from 1 second mark
    return {
      thumb: `${baseUrl}/upload/w_400,h_400,c_fill,q_auto,f_jpg,so_1.0,du_0/${path}`,
      medium: `${baseUrl}/upload/w_1024,c_limit,q_auto,f_jpg,so_1.0,du_0/${path}`,
      large: `${baseUrl}/upload/w_1600,c_limit,q_auto,f_jpg,so_1.0,du_0/${path}`,
    }
  }

  // For images
  return {
    thumb: `${baseUrl}/upload/w_400,h_400,c_fill,q_auto,f_auto/${path}`,
    medium: `${baseUrl}/upload/w_1024,c_limit,q_auto,f_auto/${path}`,
    large: `${baseUrl}/upload/w_1600,c_limit,q_auto,f_auto/${path}`,
  }
}

/**
 * Generates derivatives for multiple media URLs
 * Returns a map of original URL to derivatives
 */
export function generateDerivativesMap(mediaUrls: string[]): Record<string, MediaDerivatives> {
  const derivativesMap: Record<string, MediaDerivatives> = {}

  for (const url of mediaUrls) {
    const derivatives = generateDerivativeUrls(url)
    if (derivatives) {
      derivativesMap[url] = derivatives
    }
  }

  return derivativesMap
}

/**
 * Updates an artifact's media_derivatives field
 * This should be called after media is uploaded and stored
 */
export async function updateArtifactDerivatives(
  artifactId: string,
  mediaUrls: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: "Unauthorized" }
    }

    // Generate derivatives for all media URLs
    const derivativesMap = generateDerivativesMap(mediaUrls)

    // Update the artifact
    const { error } = await supabase
      .from("artifacts")
      .update({ media_derivatives: derivativesMap })
      .eq("id", artifactId)
      .eq("user_id", user.id) // Ensure user owns the artifact

    if (error) {
      console.error("[media-derivatives] Failed to update artifact derivatives:", error)
      return { success: false, error: "Failed to update media derivatives" }
    }

    console.log("[media-derivatives] Successfully updated derivatives for artifact:", artifactId, {
      mediaCount: mediaUrls.length,
      derivativeCount: Object.keys(derivativesMap).length,
    })

    return { success: true }
  } catch (error) {
    console.error("[media-derivatives] Unexpected error:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

/**
 * Gets derivative URL for a media item from the derivatives map
 * Falls back to null if not found
 */
export function getDerivativeUrl(
  mediaDerivatives: Record<string, MediaDerivatives> | null,
  originalUrl: string,
  size: "thumb" | "medium" | "large"
): string | null {
  if (!mediaDerivatives || !originalUrl) {
    return null
  }

  const derivatives = mediaDerivatives[originalUrl]
  if (!derivatives) {
    return null
  }

  return derivatives[size] || null
}
