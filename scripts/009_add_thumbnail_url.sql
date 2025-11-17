-- Add thumbnail_url column to artifacts table
-- This stores the primary visual media URL for efficient thumbnail display
-- Lays foundation for user-selectable thumbnails in Phase 3

ALTER TABLE artifacts
ADD COLUMN thumbnail_url TEXT;

COMMENT ON COLUMN artifacts.thumbnail_url IS 'Primary visual media URL used for artifact thumbnail. Auto-populated from first image/video, can be user-selected in future.';

-- Backfill existing artifacts with their primary visual media
-- This migration will compute thumbnail_url for all existing artifacts
UPDATE artifacts
SET thumbnail_url = (
  SELECT url
  FROM unnest(media_urls) AS url
  WHERE url ~* '\.(jpg|jpeg|png|gif|webp|mp4|mov|avi|webm)$'
  LIMIT 1
)
WHERE media_urls IS NOT NULL AND array_length(media_urls, 1) > 0;
