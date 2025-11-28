import { z } from "zod"

export const createCollectionSchema = z.object({
  name: z.string().min(1, "Collection name is required").max(100, "Collection name must be less than 100 characters"),
  description: z.string().max(500, "Description must be less than 500 characters").optional(),
})

export type CreateCollectionInput = z.infer<typeof createCollectionSchema>

export const collectionSchema = z.object({
  title: z.string().min(1, "Title is required").max(100, "Title must be less than 100 characters"),
  description: z.string().max(500, "Description must be less than 500 characters").optional(),
  is_public: z.boolean().default(false),
  primary_type_id: z.string().uuid("Invalid type ID").optional().nullable(),
})

export type CollectionInput = z.infer<typeof collectionSchema>

// Media derivatives schema for pre-generated Cloudinary transformations
export const mediaDerivativesSchema = z.record(
  z.string().url(), // original URL
  z.object({
    thumb: z.string().url(),
    medium: z.string().url(),
    large: z.string().url().optional(),
  })
)

export const createArtifactSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(200, "Title must be less than 200 characters")
    .refine((val) => val.trim().length > 0, "Title cannot be only whitespace"),
  description: z.string().max(2000, "Description must be less than 2000 characters").nullable().optional(),
  collectionId: z.string().uuid("Invalid collection ID"),
  type_id: z.string().uuid("Invalid type ID").optional().nullable(),
  year_acquired: z.number().int().min(1000).max(new Date().getFullYear()).nullable().optional(),
  origin: z.string().max(200, "Origin must be less than 200 characters").nullable().optional(),
  media_urls: z.array(z.string().url("Invalid media URL")).nullable().optional(),
  thumbnail_url: z.string().url("Invalid thumbnail URL").nullable().optional(),
  media_derivatives: mediaDerivativesSchema.nullable().optional(),
  image_captions: z.record(z.string().url(), z.string()).optional(),
  video_summaries: z.record(z.string().url(), z.string()).optional(),
  audio_transcripts: z.record(z.string().url(), z.string()).optional(),
  // Gallery URLs are separate from media_urls to create artifact_media links with "gallery" role
  gallery_urls: z.array(z.string().url("Invalid gallery URL")).nullable().optional(),
})

export type CreateArtifactInput = z.infer<typeof createArtifactSchema>

export const updateArtifactSchema = z.object({
  id: z.string().uuid("Invalid artifact ID"),
  title: z.string().min(1, "Title is required").max(200, "Title must be less than 200 characters"),
  description: z.string().max(2000, "Description must be less than 2000 characters").optional(),
  type_id: z.string().uuid("Invalid type ID").optional().nullable(),
  year_acquired: z
    .number()
    .int()
    .min(1000)
    .max(new Date().getFullYear())
    .nullable()
    .optional()
    .transform((val) => val ?? undefined),
  origin: z.string().max(200, "Origin must be less than 200 characters").optional(),
  media_urls: z.array(z.string().url("Invalid media URL")).optional(),
  media_derivatives: mediaDerivativesSchema.nullable().optional(),
  image_captions: z.record(z.string().url(), z.string()).optional(),
  video_summaries: z.record(z.string().url(), z.string()).optional(),
  audio_transcripts: z.record(z.string().url(), z.string()).optional(),
  thumbnail_url: z.string().url("Invalid thumbnail URL").nullable().optional(),
  collectionId: z.string().uuid("Invalid collection ID").optional(), // Added collectionId field to schema
})

export type UpdateArtifactInput = z.infer<typeof updateArtifactSchema>

// ============================================================================
// Media Management Schemas (Phase 2: Unified Media Model)
// ============================================================================

export const createUserMediaSchema = z.object({
  user_id: z.string().uuid("Invalid user ID"),
  storage_path: z.string().min(1, "Storage path is required"),
  public_url: z.string().url("Invalid public URL"),
  filename: z.string().min(1, "Filename is required"),
  mime_type: z.string().min(1, "MIME type is required"),
  file_size_bytes: z.number().int().min(0, "File size must be non-negative"),
  width: z.number().int().positive().nullable().optional(),
  height: z.number().int().positive().nullable().optional(),
  duration_seconds: z.number().positive().nullable().optional(),
  media_type: z.enum(["image", "video", "audio"]),
  upload_source: z.enum(["artifact", "profile", "collection", "story", "gallery"]).optional(),
})

export type CreateUserMediaInput = z.infer<typeof createUserMediaSchema>

export const updateUserMediaSchema = z.object({
  id: z.string().uuid("Invalid media ID"),
  storage_path: z.string().min(1).optional(),
  width: z.number().int().positive().nullable().optional(),
  height: z.number().int().positive().nullable().optional(),
  duration_seconds: z.number().positive().nullable().optional(),
  is_processed: z.boolean().optional(),
})

export type UpdateUserMediaInput = z.infer<typeof updateUserMediaSchema>

export const createArtifactMediaSchema = z.object({
  artifact_id: z.string().uuid("Invalid artifact ID"),
  media_id: z.string().uuid("Invalid media ID"),
  role: z.enum(["gallery", "inline_block", "cover"]).default("gallery"),
  sort_order: z.number().int().min(0).default(0),
  block_id: z.string().nullable().optional(),
  caption_override: z.string().max(500).nullable().optional(),
  is_primary: z.boolean().default(false),
})

export type CreateArtifactMediaInput = z.infer<typeof createArtifactMediaSchema>

export const updateArtifactMediaSchema = z.object({
  id: z.string().uuid("Invalid artifact media ID"),
  role: z.enum(["gallery", "inline_block", "cover"]).optional(),
  sort_order: z.number().int().min(0).optional(),
  block_id: z.string().nullable().optional(),
  caption_override: z.string().max(500).nullable().optional(),
  is_primary: z.boolean().optional(),
})

export type UpdateArtifactMediaInput = z.infer<typeof updateArtifactMediaSchema>

export const reorderMediaSchema = z.object({
  artifact_id: z.string().uuid("Invalid artifact ID"),
  role: z.enum(["gallery", "inline_block", "cover"]),
  reorders: z.array(
    z.object({
      media_id: z.string().uuid("Invalid media ID"),
      new_sort_order: z.number().int().min(0),
    })
  ),
})

export type ReorderMediaInput = z.infer<typeof reorderMediaSchema>
