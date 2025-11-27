/**
 * Media URL utilities for detecting file types and preserving media order.
 */

/**
 * Detects if a URL points to an audio file.
 * Checks for common audio extensions and Cloudinary audio upload paths.
 *
 * Made isAudioUrl the canonical source for audio detection across the app
 */
export function isAudioUrl(url: string): boolean {
  if (!url) return false

  const lowerUrl = url.toLowerCase()

  // Check for audio extensions
  const audioExtensions = [".mp3", ".wav", ".m4a", ".aac", ".ogg", ".opus", ".webm"]
  if (audioExtensions.some((ext) => lowerUrl.includes(ext))) {
    return true
  }

  // Check for Cloudinary audio uploads (audio files are stored in /video/upload/)
  if (lowerUrl.includes("/video/upload/") && audioExtensions.some((ext) => lowerUrl.includes(ext))) {
    return true
  }

  return false
}

/**
 * Detects if a URL points to a video file.
 * Checks for common video extensions first (works for both Supabase Storage and Cloudinary).
 *
 * Made isVideoUrl the canonical source for video detection across the app
 */
export function isVideoUrl(url: string): boolean {
  if (!url) return false

  const lowerUrl = url.toLowerCase()

  // Define extensions
  const videoExtensions = [".mp4", ".mov", ".avi", ".mkv", ".m4v", ".flv", ".wmv", ".webm"]
  const audioExtensions = [".mp3", ".wav", ".m4a", ".aac", ".ogg", ".opus"]

  // Exclude audio files first (they might have .webm which could be video or audio)
  if (audioExtensions.some((ext) => lowerUrl.includes(ext))) {
    return false
  }

  // Check for video extensions (works for both Supabase Storage and Cloudinary)
  return videoExtensions.some((ext) => lowerUrl.includes(ext))
}

/**
 * Detects if a URL points to an image file.
 * Checks for common image extensions.
 */
export function isImageUrl(url: string): boolean {
  if (!url) return false

  const lowerUrl = url.toLowerCase()

  // Check for image extensions
  const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".heic", ".heif"]
  return imageExtensions.some((ext) => lowerUrl.includes(ext))
}

/**
 * Returns the primary visual media URL from an array of media URLs.
 * Priority: first image > first video > null
 */
export function getPrimaryVisualMediaUrl(urls?: string[] | null): string | null {
  if (!urls || !Array.isArray(urls) || urls.length === 0) return null

  // Find first image
  const firstImage = urls.find((url) => isImageUrl(url))
  if (firstImage) return firstImage

  // Find first video
  const firstVideo = urls.find((url) => isVideoUrl(url))
  if (firstVideo) return firstVideo

  return null
}

/**
 * Normalizes an array of media URLs by:
 * 1. Removing duplicates
 * 2. Filtering out null/undefined/empty strings
 * 3. PRESERVING the user's upload order (no sorting by type)
 */
export function normalizeMediaUrls(urls: string[]): string[] {
  if (!urls || !Array.isArray(urls) || urls.length === 0) return []

  // Remove duplicates while preserving order and filter out empty/null values
  const seen = new Set<string>()
  const uniqueUrls: string[] = []

  for (const url of urls) {
    if (url && typeof url === "string" && url.trim() !== "" && !seen.has(url)) {
      seen.add(url)
      uniqueUrls.push(url)
    }
  }

  return uniqueUrls
}

/**
 * Get file size limit based on media type
 * All media: 50MB (Supabase Storage free tier limit)
 */
export function getFileSizeLimit(file: File): number {
  return 50 * 1024 * 1024 // 50MB for all file types
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)}GB`
  }
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
  }
  return `${(bytes / 1024).toFixed(1)}KB`
}

/**
 * Checks if the media array contains at least one visual media item (image or video).
 * Audio-only artifacts won't have thumbnails.
 */
export function hasVisualMedia(urls?: string[] | null): boolean {
  return getPrimaryVisualMediaUrl(urls) !== null
}

/**
 * Returns a placeholder image URL for artifacts without visual media.
 */
export function getArtifactPlaceholder(): string {
  return "/artifact-placeholder.jpg"
}

/**
 * Detects if a URL points to Supabase Storage
 * Phase 2: Support for Supabase Storage originals
 */
export function isSupabaseStorageUrl(url: string): boolean {
  if (!url) return false
  return url.includes("supabase.co/storage/v1/object/public/")
}

/**
 * Detects if a URL points to Cloudinary
 */
export function isCloudinaryUrl(url: string): boolean {
  if (!url) return false
  return url.includes("cloudinary.com")
}

/**
 * Get storage type for a media URL
 * Phase 2: Supports both Cloudinary and Supabase Storage
 *
 * @returns 'cloudinary' | 'supabase' | 'unknown'
 */
export function getStorageType(url: string): "cloudinary" | "supabase" | "unknown" {
  if (!url) return "unknown"

  if (isSupabaseStorageUrl(url)) return "supabase"
  if (isCloudinaryUrl(url)) return "cloudinary"

  return "unknown"
}
