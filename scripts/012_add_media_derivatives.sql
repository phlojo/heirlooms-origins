-- Add media_derivatives column to artifacts table
-- This stores pre-generated Cloudinary derivative URLs for efficient media display
-- Implements Phase 1 of MEDIA-ARCHITECTURE.md

ALTER TABLE artifacts
ADD COLUMN media_derivatives JSONB;

COMMENT ON COLUMN artifacts.media_derivatives IS 'Pre-generated derivative URLs for media. Format: { "original_url": { "thumb": "url", "medium": "url", "large": "url" } }. Enables predictable Cloudinary usage by storing derivatives instead of generating them dynamically.';

-- Create index for faster lookups on media_derivatives
CREATE INDEX IF NOT EXISTS idx_artifacts_media_derivatives ON artifacts USING GIN (media_derivatives);
