-- Migration: Create artifact_media join table
-- Description: Links artifacts to media with roles (gallery, inline, cover) and ordering
-- This enables flexible media display and reuse across multiple artifacts
-- Date: 2025-11-27

-- Create artifact_media join table
CREATE TABLE IF NOT EXISTS artifact_media (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships
  artifact_id UUID NOT NULL REFERENCES artifacts(id) ON DELETE CASCADE,
  media_id UUID NOT NULL REFERENCES user_media(id) ON DELETE CASCADE,

  -- Media Role and Context
  role TEXT NOT NULL DEFAULT 'gallery',    -- 'gallery', 'inline_block', 'cover'
  sort_order INTEGER NOT NULL DEFAULT 0,   -- Display order (0-based)

  -- Optional: For future block-based content system
  block_id TEXT,                           -- If media belongs to a specific content block

  -- Optional: Per-artifact media customization
  caption_override TEXT,                   -- Override global caption for this artifact
  is_primary BOOLEAN DEFAULT false,        -- Primary/thumbnail media for artifact

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT role_check CHECK (role IN ('gallery', 'inline_block', 'cover'))
);

-- Add unique constraint on (artifact_id, role, sort_order) to prevent duplicates
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'unique_artifact_media_order'
    ) THEN
        ALTER TABLE artifact_media
        ADD CONSTRAINT unique_artifact_media_order
        UNIQUE (artifact_id, role, sort_order);
    END IF;
END $$;

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_artifact_media_artifact ON artifact_media(artifact_id);
CREATE INDEX IF NOT EXISTS idx_artifact_media_media ON artifact_media(media_id);
CREATE INDEX IF NOT EXISTS idx_artifact_media_role ON artifact_media(role);
CREATE INDEX IF NOT EXISTS idx_artifact_media_sort ON artifact_media(artifact_id, role, sort_order);
CREATE INDEX IF NOT EXISTS idx_artifact_media_primary ON artifact_media(artifact_id, is_primary) WHERE is_primary = true;

-- Enable RLS
ALTER TABLE artifact_media ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS artifact_media_select ON artifact_media;
DROP POLICY IF EXISTS artifact_media_insert ON artifact_media;
DROP POLICY IF EXISTS artifact_media_update ON artifact_media;
DROP POLICY IF EXISTS artifact_media_delete ON artifact_media;

-- RLS Policies: Inherit permissions from artifacts table
-- Users can see artifact_media for artifacts they can access
CREATE POLICY artifact_media_select
  ON artifact_media FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM artifacts a
      LEFT JOIN collections c ON a.collection_id = c.id
      WHERE a.id = artifact_media.artifact_id
      AND (
        c.is_public = true
        OR a.user_id = auth.uid()
        OR c.user_id = auth.uid()
      )
    )
  );

-- Users can only modify artifact_media for their own artifacts
CREATE POLICY artifact_media_insert
  ON artifact_media FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM artifacts
      WHERE id = artifact_media.artifact_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY artifact_media_update
  ON artifact_media FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM artifacts
      WHERE id = artifact_media.artifact_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY artifact_media_delete
  ON artifact_media FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM artifacts
      WHERE id = artifact_media.artifact_id
      AND user_id = auth.uid()
    )
  );

-- Add helpful comment
COMMENT ON TABLE artifact_media IS
  'Join table linking artifacts to media with roles (gallery/inline/cover) and custom ordering. Enables media reuse and flexible display.';
COMMENT ON COLUMN artifact_media.role IS
  'Media role: gallery (top carousel), inline_block (embedded in content), cover (thumbnail)';
COMMENT ON COLUMN artifact_media.sort_order IS
  'Display order within the role (0-based). Allows different ordering in gallery vs inline.';
COMMENT ON COLUMN artifact_media.is_primary IS
  'Primary media for artifact (used as thumbnail if set)';
