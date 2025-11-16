/**
 * Cloudinary image transformation utilities
 * Generates optimized image URLs for different use cases
 */

/**
 * Transforms a Cloudinary URL with specified parameters
 * @param url - Original Cloudinary URL
 * @param transformations - Cloudinary transformation string (e.g., "w_400,h_400,c_fill")
 * @returns Transformed URL or original if not a Cloudinary URL
 */
export function getCloudinaryUrl(url: string, transformations: string): string {
  if (!url || !url.includes("cloudinary.com")) {
    return url
  }

  // Replace "heirloom/artifacts/images/heirloom/artifacts/images/" with single path
  const cleanedUrl = url.replace(
    /heirloom\/artifacts\/images\/heirloom\/artifacts\/images\//g,
    "heirloom/artifacts/images/",
  )

  // Split URL at /upload/ and insert transformations
  const parts = cleanedUrl.split("/upload/")
  if (parts.length !== 2) {
    return cleanedUrl
  }

  return `${parts[0]}/upload/${transformations}/${parts[1]}`
}

/**
 * Detects if a URL is a video file
 */
function isVideoFile(url: string): boolean {
  const lower = url.toLowerCase()
  return (
    url.includes("/video/upload/") &&
    (lower.includes(".mp4") || lower.includes(".mov") || lower.includes(".avi") || lower.includes(".webm") || lower.includes(".mkv")) &&
    !lower.includes(".mp3") &&
    !lower.includes(".wav") &&
    !lower.includes(".m4a")
  )
}

/**
 * Get thumbnail version of image or video (400x400, cropped to fill)
 * Perfect for: artifact cards, collection cards, grid views
 * For videos, generates a poster frame from 1 second mark
 */
export function getThumbnailUrl(url: string): string {
  if (!url || typeof url !== 'string' || url.trim() === '') {
    console.log("[v0] getThumbnailUrl: Invalid URL, returning placeholder")
    return '/placeholder.svg'
  }
  
  // The version number in Cloudinary URLs already provides cache control
  
  if (isVideoFile(url)) {
    // For videos, use Cloudinary video transformation to get a poster frame
    // pg_1 gets frame at 1 second, so_1.0 sets start offset to 1 second
    return getCloudinaryUrl(url, "w_400,h_400,c_fill,q_auto,f_auto,so_1.0")
  }
  
  return getCloudinaryUrl(url, "w_400,h_400,c_fill,q_auto,f_auto")
}

/**
 * Get card-sized version of image (800x600, fit within bounds)
 * Perfect for: larger cards, list views
 */
export function getCardUrl(url: string): string {
  if (!url || typeof url !== 'string' || url.trim() === '') {
    return '/placeholder.svg'
  }
  return getCloudinaryUrl(url, "w_800,h_600,c_fit,q_auto,f_auto")
}

/**
 * Get detail view version of image (1200x1200, limit max dimensions)
 * Perfect for: artifact detail pages, full-screen views
 */
export function getDetailUrl(url: string): string {
  if (!url || typeof url !== 'string' || url.trim() === '') {
    return '/placeholder.svg'
  }
  return getCloudinaryUrl(url, "w_1200,h_1200,c_limit,q_auto,f_auto")
}

/**
 * Get full-resolution version (original, but with auto quality/format)
 * Perfect for: download, print, high-res viewing
 */
export function getFullResUrl(url: string): string {
  if (!url || typeof url !== 'string' || url.trim() === '') {
    return '/placeholder.svg'
  }
  return getCloudinaryUrl(url, "q_auto,f_auto")
}
