/**
 * Cloudinary image transformation utilities
 * Generates optimized image URLs for different use cases
 *
 * PHASE 1 ARCHITECTURE UPDATE:
 * - Prioritizes stored derivative URLs from media_derivatives
 * - Falls back to dynamic transformation for backwards compatibility
 * - Aligns with MEDIA-ARCHITECTURE.md Phase 1 goals
 *
 * PHASE 2 ARCHITECTURE UPDATE (Option 2: Cloudinary Fetch/Auto-Upload):
 * - Originals stored in Supabase Storage
 * - Cloudinary fetches from Supabase URLs and generates derivatives
 * - Derivatives cached in Cloudinary CDN (not originals)
 * - ~80-90% reduction in Cloudinary storage costs
 */

import type { MediaDerivatives } from "./utils/media-derivatives"
import { isCloudinaryUrl, isSupabaseStorageUrl, isVideoUrl } from "./media"

/**
 * Generate a Cloudinary fetch URL for remote media
 * Phase 2: Allows Cloudinary to fetch from Supabase Storage and generate derivatives
 *
 * @param remoteUrl - URL of the remote media (e.g., Supabase Storage URL)
 * @param transformations - Cloudinary transformation string
 * @returns Cloudinary fetch URL
 */
function getCloudinaryFetchUrl(remoteUrl: string, transformations: string): string {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME

  if (!cloudName) {
    console.error('[cloudinary] Missing NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME')
    return remoteUrl
  }

  // Determine resource type based on URL
  const resourceType = isVideoUrl(remoteUrl) ? 'video' : 'image'

  // Format: https://res.cloudinary.com/{cloud_name}/{resource_type}/fetch/{transformations}/{remote_url}
  // Note: Cloudinary will URL-encode the remote URL automatically
  return `https://res.cloudinary.com/${cloudName}/${resourceType}/fetch/${transformations}/${remoteUrl}`
}

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
 *
 * PHASE 1: Accepts optional derivatives map and prefers stored URLs
 *
 * @param url - Original media URL
 * @param mediaDerivatives - Optional map of original URLs to their derivatives
 * @returns Thumbnail URL (stored derivative or dynamically generated)
 */
export function getThumbnailUrl(
  url: string,
  mediaDerivatives?: Record<string, MediaDerivatives> | null
): string {
  if (!url || typeof url !== 'string' || url.trim() === '') {
    console.log("[cloudinary] getThumbnailUrl: Invalid URL, returning placeholder")
    return '/placeholder.svg'
  }

  // PHASE 2: Use Cloudinary fetch for Supabase Storage URLs
  if (isSupabaseStorageUrl(url)) {
    console.log("[cloudinary] getThumbnailUrl: Using Cloudinary fetch for Supabase Storage")
    const transformations = isVideoUrl(url)
      ? "w_400,h_400,c_fill,q_auto,f_jpg,so_1.0,du_0"
      : "w_400,h_400,c_fill,q_auto,f_auto"
    return getCloudinaryFetchUrl(url, transformations)
  }

  // PHASE 1: Try to use stored derivative first (Cloudinary originals)
  if (mediaDerivatives && mediaDerivatives[url]?.thumb) {
    console.log("[cloudinary] getThumbnailUrl: Using stored derivative")
    return mediaDerivatives[url].thumb
  }

  // Backwards compatibility: Generate dynamically (Cloudinary originals)
  if (isCloudinaryUrl(url)) {
    console.log("[cloudinary] getThumbnailUrl: Generating dynamic transformation (fallback)")
    const result = isVideoFile(url)
      ? getCloudinaryUrl(url, "w_400,h_400,c_fill,q_auto,f_jpg,so_1.0,du_0")
      : getCloudinaryUrl(url, "w_400,h_400,c_fill,q_auto,f_auto")
    return result
  }

  // Unknown URL type, return original
  console.log("[cloudinary] getThumbnailUrl: Unknown URL type, returning original")
  return url
}

/**
 * Get card-sized version of image (800x600, fit within bounds)
 * Perfect for: larger cards, list views
 *
 * DEPRECATED: Use getMediumUrl instead for Phase 1 architecture
 *
 * @param url - Original media URL
 * @param mediaDerivatives - Optional map of original URLs to their derivatives
 * @returns Card-sized URL
 */
export function getCardUrl(
  url: string,
  mediaDerivatives?: Record<string, MediaDerivatives> | null
): string {
  if (!url || typeof url !== 'string' || url.trim() === '') {
    return '/placeholder.svg'
  }

  // PHASE 2: Use Cloudinary fetch for Supabase Storage URLs
  if (isSupabaseStorageUrl(url)) {
    return getCloudinaryFetchUrl(url, "w_800,h_600,c_fit,q_auto,f_auto")
  }

  // PHASE 1: Try to use stored medium derivative (Cloudinary originals)
  if (mediaDerivatives && mediaDerivatives[url]?.medium) {
    console.log("[cloudinary] getCardUrl: Using stored medium derivative")
    return mediaDerivatives[url].medium
  }

  // Backwards compatibility: Generate dynamically (Cloudinary originals)
  if (isCloudinaryUrl(url)) {
    return getCloudinaryUrl(url, "w_800,h_600,c_fit,q_auto,f_auto")
  }

  return url
}

/**
 * Get medium-sized version of image (1024px width, limit max dimensions)
 * Perfect for: artifact detail pages, lightbox views
 *
 * PHASE 1: Implements MEDIA-ARCHITECTURE.md medium size spec
 *
 * @param url - Original media URL
 * @param mediaDerivatives - Optional map of original URLs to their derivatives
 * @returns Medium-sized URL (stored derivative or dynamically generated)
 */
export function getMediumUrl(
  url: string,
  mediaDerivatives?: Record<string, MediaDerivatives> | null
): string {
  if (!url || typeof url !== 'string' || url.trim() === '') {
    return '/placeholder.svg'
  }

  // PHASE 2: Use Cloudinary fetch for Supabase Storage URLs
  if (isSupabaseStorageUrl(url)) {
    console.log("[cloudinary] getMediumUrl: Using Cloudinary fetch for Supabase Storage")
    return getCloudinaryFetchUrl(url, "w_1024,c_limit,q_auto,f_auto")
  }

  // PHASE 1: Try to use stored derivative first (Cloudinary originals)
  if (mediaDerivatives && mediaDerivatives[url]?.medium) {
    console.log("[cloudinary] getMediumUrl: Using stored derivative")
    return mediaDerivatives[url].medium
  }

  // Backwards compatibility: Generate dynamically (Cloudinary originals)
  if (isCloudinaryUrl(url)) {
    console.log("[cloudinary] getMediumUrl: Generating dynamic transformation (fallback)")
    return getCloudinaryUrl(url, "w_1024,c_limit,q_auto,f_auto")
  }

  return url
}

/**
 * Get detail view version of image (1200x1200, limit max dimensions)
 * Perfect for: artifact detail pages, full-screen views
 *
 * DEPRECATED: Use getMediumUrl or getLargeUrl instead
 *
 * @param url - Original media URL
 * @param mediaDerivatives - Optional map of original URLs to their derivatives
 * @returns Detail view URL
 */
export function getDetailUrl(
  url: string,
  mediaDerivatives?: Record<string, MediaDerivatives> | null
): string {
  if (!url || typeof url !== 'string' || url.trim() === '') {
    return '/placeholder.svg'
  }

  // PHASE 2: Use Cloudinary fetch for Supabase Storage URLs
  if (isSupabaseStorageUrl(url)) {
    return getCloudinaryFetchUrl(url, "w_1200,h_1200,c_limit,q_auto,f_auto")
  }

  // PHASE 1: Try to use stored large derivative (Cloudinary originals)
  if (mediaDerivatives && mediaDerivatives[url]?.large) {
    console.log("[cloudinary] getDetailUrl: Using stored large derivative")
    return mediaDerivatives[url].large
  }

  // Backwards compatibility: Generate dynamically (Cloudinary originals)
  if (isCloudinaryUrl(url)) {
    return getCloudinaryUrl(url, "w_1200,h_1200,c_limit,q_auto,f_auto")
  }

  return url
}

/**
 * Get large version of image (1600px width, limit max dimensions)
 * Perfect for: zoomed-in lightbox, large desktop screens
 *
 * PHASE 1: Implements MEDIA-ARCHITECTURE.md large size spec
 *
 * @param url - Original media URL
 * @param mediaDerivatives - Optional map of original URLs to their derivatives
 * @returns Large-sized URL (stored derivative or dynamically generated)
 */
export function getLargeUrl(
  url: string,
  mediaDerivatives?: Record<string, MediaDerivatives> | null
): string {
  if (!url || typeof url !== 'string' || url.trim() === '') {
    return '/placeholder.svg'
  }

  // PHASE 2: Use Cloudinary fetch for Supabase Storage URLs
  if (isSupabaseStorageUrl(url)) {
    console.log("[cloudinary] getLargeUrl: Using Cloudinary fetch for Supabase Storage")
    return getCloudinaryFetchUrl(url, "w_1600,c_limit,q_auto,f_auto")
  }

  // PHASE 1: Try to use stored derivative first (Cloudinary originals)
  if (mediaDerivatives && mediaDerivatives[url]?.large) {
    console.log("[cloudinary] getLargeUrl: Using stored derivative")
    return mediaDerivatives[url].large
  }

  // Backwards compatibility: Generate dynamically (Cloudinary originals)
  if (isCloudinaryUrl(url)) {
    console.log("[cloudinary] getLargeUrl: Generating dynamic transformation (fallback)")
    return getCloudinaryUrl(url, "w_1600,c_limit,q_auto,f_auto")
  }

  return url
}

/**
 * Get full-resolution version (original, but with auto quality/format)
 * Perfect for: download, print, high-res viewing
 *
 * @param url - Original media URL
 * @returns Full resolution URL with auto optimizations
 */
export function getFullResUrl(url: string): string {
  if (!url || typeof url !== 'string' || url.trim() === '') {
    return '/placeholder.svg'
  }

  // PHASE 2: For Supabase Storage URLs, return original (no transformation needed for full-res)
  // User can download directly from Supabase Storage
  if (isSupabaseStorageUrl(url)) {
    return url
  }

  // For Cloudinary originals, apply auto quality/format optimizations
  if (isCloudinaryUrl(url)) {
    return getCloudinaryUrl(url, "q_auto,f_auto")
  }

  return url
}
