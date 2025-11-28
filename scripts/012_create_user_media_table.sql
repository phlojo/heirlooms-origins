-- Migration: Create user_media table
-- Description: Canonical storage for all user-uploaded media files
-- This enables media reuse across artifacts and builds foundation for media library
-- Date: 2025-11-27

-- Create user_media table
CREATE TABLE IF NOT EXISTS user_media (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- File Storage (Supabase Storage)
  storage_path TEXT NOT NULL,              -- e.g., "{userId}/{artifactId}/{timestamp}-{filename}"
  public_url TEXT NOT NULL,                -- Full Supabase public URL

  -- File Metadata
  filename TEXT NOT NULL,                  -- Original filename
  mime_type TEXT NOT NULL,                 -- e.g., "image/jpeg", "video/mp4"
  file_size_bytes BIGINT NOT NULL,         -- File size in bytes

  -- Media Dimensions (nullable for audio)
  width INTEGER,                           -- Image/video width in pixels
  height INTEGER,                          -- Image/video height in pixels
  duration_seconds NUMERIC(10,2),          -- Video/audio duration

  -- Media Type Classification
  media_type TEXT NOT NULL,                -- 'image', 'video', 'audio'

  -- Lifecycle
  upload_source TEXT DEFAULT 'artifact',   -- 'artifact', 'profile', 'collection', etc.
  is_processed BOOLEAN DEFAULT false,      -- For future processing pipeline

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT media_type_check CHECK (media_type IN ('image', 'video', 'audio'))
);

-- Add unique constraint on public_url (with conditional existence check)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'user_media_public_url_key'
    ) THEN
        ALTER TABLE user_media ADD CONSTRAINT user_media_public_url_key UNIQUE (public_url);
    END IF;
END $$;

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_media_user_id ON user_media(user_id);
CREATE INDEX IF NOT EXISTS idx_user_media_type ON user_media(media_type);
CREATE INDEX IF NOT EXISTS idx_user_media_created ON user_media(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_media_public_url ON user_media(public_url);

-- Enable RLS
ALTER TABLE user_media ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS user_media_select_own ON user_media;
DROP POLICY IF EXISTS user_media_insert_own ON user_media;
DROP POLICY IF EXISTS user_media_update_own ON user_media;
DROP POLICY IF EXISTS user_media_delete_own ON user_media;

-- RLS Policies: Users can only see/modify their own media
CREATE POLICY user_media_select_own
  ON user_media FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY user_media_insert_own
  ON user_media FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY user_media_update_own
  ON user_media FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY user_media_delete_own
  ON user_media FOR DELETE
  USING (auth.uid() = user_id);

-- Add helpful comment
COMMENT ON TABLE user_media IS
  'Canonical storage for all user-uploaded media. Enables media reuse across artifacts and future media library features.';
