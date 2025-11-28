/**
 * TypeScript types for user_media and artifact_media tables
 * Generated: 2025-11-27
 *
 * These types align with the database schema created in migrations:
 * - 012_create_user_media_table.sql
 * - 013_create_artifact_media_table.sql
 */

// ============================================================================
// User Media Types
// ============================================================================

export type MediaType = 'image' | 'video' | 'audio'

export type UploadSource = 'artifact' | 'profile' | 'collection' | 'story' | 'gallery'

/**
 * UserMedia - Canonical storage for all user-uploaded media
 * Represents a single media file stored in Supabase Storage
 */
export interface UserMedia {
  // Identity
  id: string
  user_id: string

  // File Storage (Supabase Storage)
  storage_path: string              // e.g., "{userId}/{artifactId}/{timestamp}-{filename}"
  public_url: string                // Full Supabase public URL

  // File Metadata
  filename: string                  // Original filename
  mime_type: string                 // e.g., "image/jpeg", "video/mp4"
  file_size_bytes: number           // File size in bytes

  // Media Dimensions (nullable for audio)
  width: number | null              // Image/video width in pixels
  height: number | null             // Image/video height in pixels
  duration_seconds: number | null   // Video/audio duration

  // Media Type Classification
  media_type: MediaType             // 'image', 'video', or 'audio'

  // Lifecycle
  upload_source: UploadSource       // Where the media was uploaded from
  is_processed: boolean             // For future processing pipeline

  // Timestamps
  created_at: string
  updated_at: string
}

/**
 * UserMediaWithDerivatives - User media with computed Cloudinary derivative URLs
 * Used in UI components that need to display media at different sizes
 */
export interface UserMediaWithDerivatives extends UserMedia {
  // Computed derivatives (not stored in DB, generated on-demand via Cloudinary)
  smallThumbnailUrl?: string        // 120x120 cropped (for pickers, reorder cards)
  thumbnailUrl?: string             // 400x400 cropped
  mediumUrl?: string                // 1024px width
  largeUrl?: string                 // 1600px width
  fullResUrl?: string               // Original with auto optimization
}

/**
 * CreateUserMediaInput - Input for creating new user_media record
 */
export interface CreateUserMediaInput {
  user_id: string
  storage_path: string
  public_url: string
  filename: string
  mime_type: string
  file_size_bytes: number
  width?: number | null
  height?: number | null
  duration_seconds?: number | null
  media_type: MediaType
  upload_source?: UploadSource
}

/**
 * UpdateUserMediaInput - Input for updating user_media record
 */
export interface UpdateUserMediaInput {
  storage_path?: string
  width?: number | null
  height?: number | null
  duration_seconds?: number | null
  is_processed?: boolean
}

// ============================================================================
// Artifact Media Types
// ============================================================================

export type MediaRole = 'gallery' | 'inline_block' | 'cover'

/**
 * ArtifactMedia - Join table linking artifacts to media with roles
 * Enables media reuse across artifacts and flexible display
 */
export interface ArtifactMedia {
  // Identity
  id: string

  // Relationships
  artifact_id: string
  media_id: string

  // Media Role and Context
  role: MediaRole                   // 'gallery', 'inline_block', or 'cover'
  sort_order: number                // Display order (0-based)

  // Optional: For future block-based content system
  block_id: string | null           // If media belongs to a specific content block

  // Optional: Per-artifact media customization
  caption_override: string | null   // Override global caption for this artifact
  is_primary: boolean               // Primary/thumbnail media for artifact

  // Timestamps
  created_at: string
  updated_at: string
}

/**
 * ArtifactMediaWithFile - Artifact media with full user_media details
 * Used when querying artifact media with file information
 */
export interface ArtifactMediaWithFile extends ArtifactMedia {
  media: UserMedia
}

/**
 * ArtifactMediaWithDerivatives - Artifact media with file details and derivative URLs
 * Used in UI components for displaying artifact galleries
 */
export interface ArtifactMediaWithDerivatives extends ArtifactMedia {
  media: UserMediaWithDerivatives
}

/**
 * CreateArtifactMediaInput - Input for creating new artifact_media link
 */
export interface CreateArtifactMediaInput {
  artifact_id: string
  media_id: string
  role?: MediaRole
  sort_order?: number
  block_id?: string | null
  caption_override?: string | null
  is_primary?: boolean
}

/**
 * UpdateArtifactMediaInput - Input for updating artifact_media link
 */
export interface UpdateArtifactMediaInput {
  role?: MediaRole
  sort_order?: number
  block_id?: string | null
  caption_override?: string | null
  is_primary?: boolean
}

// ============================================================================
// Gallery-Specific Types
// ============================================================================

/**
 * ArtifactGalleryMedia - Media specifically for gallery display
 * Filtered to role='gallery' with derivatives
 */
export interface ArtifactGalleryMedia extends ArtifactMediaWithDerivatives {
  role: 'gallery'
}

/**
 * MediaReorderInput - Input for reordering media within a role
 */
export interface MediaReorderInput {
  media_id: string
  new_sort_order: number
}

// ============================================================================
// Query Result Types
// ============================================================================

/**
 * MediaUsage - Information about where a media file is used
 * Useful for "where is this media used" queries
 */
export interface MediaUsage {
  artifact_id: string
  artifact_title: string
  role: MediaRole
  sort_order: number
  is_primary: boolean
}

/**
 * OrphanedMedia - Media not linked to any artifact
 * Used for cleanup operations
 */
export interface OrphanedMedia extends UserMedia {
  // No additional fields, but semantically different
}

// ============================================================================
// Helper Type Guards
// ============================================================================

/**
 * Type guard to check if media is an image
 */
export function isImageMedia(media: UserMedia): boolean {
  return media.media_type === 'image'
}

/**
 * Type guard to check if media is a video
 */
export function isVideoMedia(media: UserMedia): boolean {
  return media.media_type === 'video'
}

/**
 * Type guard to check if media is audio
 */
export function isAudioMedia(media: UserMedia): boolean {
  return media.media_type === 'audio'
}

/**
 * Check if media has dimensions (images and videos)
 */
export function hasMediaDimensions(media: UserMedia): boolean {
  return media.width !== null && media.height !== null
}

/**
 * Check if media has duration (videos and audio)
 */
export function hasMediaDuration(media: UserMedia): boolean {
  return media.duration_seconds !== null
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Valid media types
 */
export const MEDIA_TYPES: readonly MediaType[] = ['image', 'video', 'audio'] as const

/**
 * Valid media roles
 */
export const MEDIA_ROLES: readonly MediaRole[] = ['gallery', 'inline_block', 'cover'] as const

/**
 * Valid upload sources
 */
export const UPLOAD_SOURCES: readonly UploadSource[] = [
  'artifact',
  'profile',
  'collection',
  'story',
  'gallery',
] as const
