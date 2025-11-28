/**
 * Media derivative utilities
 * Pure functions for generating derivative URLs (not Server Actions)
 */

/**
 * Media derivative URLs for a single media item
 */
export interface MediaDerivatives {
  smallThumb?: string // 120x120, cropped to fill (for pickers, reorder cards)
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
      smallThumb: `${baseUrl}/upload/w_120,h_120,c_fill,q_auto,f_jpg,so_1.0,du_0/${path}`,
      thumb: `${baseUrl}/upload/w_400,h_400,c_fill,q_auto,f_jpg,so_1.0,du_0/${path}`,
      medium: `${baseUrl}/upload/w_1024,c_limit,q_auto,f_jpg,so_1.0,du_0/${path}`,
      large: `${baseUrl}/upload/w_1600,c_limit,q_auto,f_jpg,so_1.0,du_0/${path}`,
    }
  }

  // For images
  return {
    smallThumb: `${baseUrl}/upload/w_120,h_120,c_fill,q_auto,f_auto/${path}`,
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
