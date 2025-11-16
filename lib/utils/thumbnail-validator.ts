/**
 * Thumbnail validation utilities
 * Used to validate and report on thumbnail availability
 */

import { getPrimaryVisualMediaUrl, isImageUrl, isVideoUrl, isAudioUrl } from "@/lib/media"
import { getThumbnailUrl } from "@/lib/cloudinary"

export interface ThumbnailValidationResult {
  hasValidThumbnail: boolean
  thumbnailUrl: string | null
  reason?: string
  mediaCount: number
  visualMediaCount: number
  audioMediaCount: number
}

/**
 * Validates if an artifact has a valid thumbnail
 */
export function validateArtifactThumbnail(mediaUrls?: string[] | null): ThumbnailValidationResult {
  if (!mediaUrls || mediaUrls.length === 0) {
    return {
      hasValidThumbnail: false,
      thumbnailUrl: null,
      reason: "No media files",
      mediaCount: 0,
      visualMediaCount: 0,
      audioMediaCount: 0,
    }
  }
  
  const visualMedia = mediaUrls.filter(url => isImageUrl(url) || isVideoUrl(url))
  const audioMedia = mediaUrls.filter(url => isAudioUrl(url))
  
  const primaryMedia = getPrimaryVisualMediaUrl(mediaUrls)
  
  if (!primaryMedia) {
    return {
      hasValidThumbnail: false,
      thumbnailUrl: null,
      reason: audioMedia.length > 0 ? "Only audio files (expected)" : "No valid visual media",
      mediaCount: mediaUrls.length,
      visualMediaCount: visualMedia.length,
      audioMediaCount: audioMedia.length,
    }
  }
  
  const thumbnailUrl = getThumbnailUrl(primaryMedia)
  
  return {
    hasValidThumbnail: true,
    thumbnailUrl,
    mediaCount: mediaUrls.length,
    visualMediaCount: visualMedia.length,
    audioMediaCount: audioMedia.length,
  }
}

/**
 * Validates if a collection has valid thumbnails (from artifacts or cover image)
 */
export function validateCollectionThumbnail(
  coverImage?: string | null,
  artifactMediaUrls?: Array<string[] | null>
): ThumbnailValidationResult {
  // Check cover image first
  if (coverImage) {
    return {
      hasValidThumbnail: true,
      thumbnailUrl: coverImage,
      reason: "Using cover image",
      mediaCount: 1,
      visualMediaCount: 1,
      audioMediaCount: 0,
    }
  }
  
  // Check artifact thumbnails
  if (!artifactMediaUrls || artifactMediaUrls.length === 0) {
    return {
      hasValidThumbnail: false,
      thumbnailUrl: null,
      reason: "No artifacts or cover image",
      mediaCount: 0,
      visualMediaCount: 0,
      audioMediaCount: 0,
    }
  }
  
  const thumbnails = artifactMediaUrls
    .map(urls => getPrimaryVisualMediaUrl(urls))
    .filter(Boolean)
  
  if (thumbnails.length === 0) {
    return {
      hasValidThumbnail: false,
      thumbnailUrl: null,
      reason: "Artifacts have no visual media",
      mediaCount: artifactMediaUrls.flat().length,
      visualMediaCount: 0,
      audioMediaCount: artifactMediaUrls.flat().filter(url => url && isAudioUrl(url)).length,
    }
  }
  
  return {
    hasValidThumbnail: true,
    thumbnailUrl: thumbnails[0] || null,
    reason: `Using ${thumbnails.length} artifact thumbnail(s)`,
    mediaCount: artifactMediaUrls.flat().length,
    visualMediaCount: thumbnails.length,
    audioMediaCount: artifactMediaUrls.flat().filter(url => url && isAudioUrl(url)).length,
  }
}

/**
 * Gets detailed thumbnail information for debugging
 */
export function getThumbnailDebugInfo(mediaUrls?: string[] | null) {
  if (!mediaUrls || mediaUrls.length === 0) {
    return {
      totalMedia: 0,
      images: [],
      videos: [],
      audio: [],
      other: [],
      primaryMedia: null,
    }
  }
  
  const images = mediaUrls.filter(url => isImageUrl(url))
  const videos = mediaUrls.filter(url => isVideoUrl(url))
  const audio = mediaUrls.filter(url => isAudioUrl(url))
  const other = mediaUrls.filter(url => !isImageUrl(url) && !isVideoUrl(url) && !isAudioUrl(url))
  
  return {
    totalMedia: mediaUrls.length,
    images,
    videos,
    audio,
    other,
    primaryMedia: getPrimaryVisualMediaUrl(mediaUrls),
  }
}
