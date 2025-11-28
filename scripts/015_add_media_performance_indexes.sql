-- Migration: Add performance indexes for media queries
-- Description: Additional indexes to optimize common query patterns
-- Date: 2025-11-27

-- Composite index for user's media by type and date (for media library)
CREATE INDEX IF NOT EXISTS idx_user_media_user_type_date
  ON user_media(user_id, media_type, created_at DESC);

-- Index for finding orphaned media (not linked to any artifact)
-- This helps with cleanup operations
CREATE INDEX IF NOT EXISTS idx_user_media_orphans
  ON user_media(id)
  WHERE NOT EXISTS (
    SELECT 1 FROM artifact_media WHERE media_id = user_media.id
  );

-- Composite index for artifact gallery queries (most common query)
CREATE INDEX IF NOT EXISTS idx_artifact_media_gallery_query
  ON artifact_media(artifact_id, role, sort_order)
  WHERE role = 'gallery';

-- Index for finding all artifacts using a specific media
-- Useful for "where is this media used" queries
CREATE INDEX IF NOT EXISTS idx_artifact_media_by_media
  ON artifact_media(media_id, artifact_id);

-- Partial index for cover images
CREATE INDEX IF NOT EXISTS idx_artifact_media_covers
  ON artifact_media(artifact_id, media_id)
  WHERE role = 'cover';

-- Index for finding inline media blocks
CREATE INDEX IF NOT EXISTS idx_artifact_media_inline_blocks
  ON artifact_media(artifact_id, block_id, sort_order)
  WHERE role = 'inline_block' AND block_id IS NOT NULL;

-- Add updated_at trigger for user_media
CREATE OR REPLACE FUNCTION update_user_media_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_media_updated_at_trigger ON user_media;
CREATE TRIGGER user_media_updated_at_trigger
  BEFORE UPDATE ON user_media
  FOR EACH ROW
  EXECUTE FUNCTION update_user_media_updated_at();

-- Add updated_at trigger for artifact_media
CREATE OR REPLACE FUNCTION update_artifact_media_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS artifact_media_updated_at_trigger ON artifact_media;
CREATE TRIGGER artifact_media_updated_at_trigger
  BEFORE UPDATE ON artifact_media
  FOR EACH ROW
  EXECUTE FUNCTION update_artifact_media_updated_at();

-- Add helpful comment about index usage
COMMENT ON INDEX idx_user_media_user_type_date IS
  'Optimizes media library queries: "Show me all my images/videos/audio sorted by date"';
COMMENT ON INDEX idx_artifact_media_gallery_query IS
  'Optimizes gallery queries: "Get all gallery media for this artifact in display order"';
