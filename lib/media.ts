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
 * Checks for common video extensions and Cloudinary video upload paths.
 *
 * Made isVideoUrl the canonical source for video detection across the app
 */
export function isVideoUrl(url: string): boolean {
  if (!url) return false

  const lowerUrl = url.toLowerCase()

  // Check for Cloudinary video uploads first
  if (lowerUrl.includes("/video/upload/")) {
    // Exclude audio files that might also be in /video/upload/
    const audioExtensions = [".mp3", ".wav", ".m4a", ".aac", ".ogg", ".opus", ".webm"]
    if (audioExtensions.some((ext) => lowerUrl.includes(ext))) {
      return false
    }

    // Check for video extensions
    const videoExtensions = [".mp4", ".mov", ".avi", ".mkv", ".m4v", ".flv", ".wmv"]
    return videoExtensions.some((ext) => lowerUrl.includes(ext))
  }

  return false
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
 * Videos: 500MB, Images/Audio: 50MB
 */
export function getFileSizeLimit(file: File): number {
  const isVideo = file.type.startsWith("video/")
  return isVideo ? 500 * 1024 * 1024 : 50 * 1024 * 1024
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
