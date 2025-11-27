-- Migration: Backfill user_media and artifact_media from existing artifacts
-- Description: Migrates existing media_urls array data into new canonical tables
-- This migration is idempotent and safe to run multiple times
-- Date: 2025-11-27

-- Function to extract filename from URL
CREATE OR REPLACE FUNCTION extract_filename_from_url(url TEXT)
RETURNS TEXT AS $$
DECLARE
  filename TEXT;
BEGIN
  -- Extract filename from URL path
  filename := substring(url from '/([^/]+)$');
  -- If no filename found, return a default
  IF filename IS NULL OR filename = '' THEN
    filename := 'unknown';
  END IF;
  RETURN filename;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to detect media type from URL
CREATE OR REPLACE FUNCTION detect_media_type(url TEXT)
RETURNS TEXT AS $$
BEGIN
  -- Check for image extensions
  IF url ~* '\.(jpg|jpeg|png|gif|webp|heic|heif)(\?|$)' THEN
    RETURN 'image';
  -- Check for video extensions
  ELSIF url ~* '\.(mp4|mov|avi|mkv|m4v|flv|wmv|webm)(\?|$)' THEN
    RETURN 'video';
  -- Check for audio extensions
  ELSIF url ~* '\.(mp3|wav|m4a|aac|ogg|opus)(\?|$)' THEN
    RETURN 'audio';
  ELSE
    -- Default to image if unknown
    RETURN 'image';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to detect MIME type from URL
CREATE OR REPLACE FUNCTION detect_mime_type(url TEXT)
RETURNS TEXT AS $$
DECLARE
  media_type TEXT;
BEGIN
  media_type := detect_media_type(url);

  CASE media_type
    WHEN 'image' THEN
      -- Try to detect specific image format
      IF url ~* '\.png(\?|$)' THEN RETURN 'image/png';
      ELSIF url ~* '\.gif(\?|$)' THEN RETURN 'image/gif';
      ELSIF url ~* '\.webp(\?|$)' THEN RETURN 'image/webp';
      ELSIF url ~* '\.heic(\?|$)' THEN RETURN 'image/heic';
      ELSIF url ~* '\.heif(\?|$)' THEN RETURN 'image/heif';
      ELSE RETURN 'image/jpeg';  -- Default for jpg/jpeg
      END IF;
    WHEN 'video' THEN
      -- Try to detect specific video format
      IF url ~* '\.mp4(\?|$)' THEN RETURN 'video/mp4';
      ELSIF url ~* '\.mov(\?|$)' THEN RETURN 'video/quicktime';
      ELSIF url ~* '\.avi(\?|$)' THEN RETURN 'video/x-msvideo';
      ELSIF url ~* '\.mkv(\?|$)' THEN RETURN 'video/x-matroska';
      ELSIF url ~* '\.webm(\?|$)' THEN RETURN 'video/webm';
      ELSE RETURN 'video/mp4';  -- Default
      END IF;
    WHEN 'audio' THEN
      -- Try to detect specific audio format
      IF url ~* '\.mp3(\?|$)' THEN RETURN 'audio/mpeg';
      ELSIF url ~* '\.wav(\?|$)' THEN RETURN 'audio/wav';
      ELSIF url ~* '\.m4a(\?|$)' THEN RETURN 'audio/mp4';
      ELSIF url ~* '\.aac(\?|$)' THEN RETURN 'audio/aac';
      ELSIF url ~* '\.ogg(\?|$)' THEN RETURN 'audio/ogg';
      ELSIF url ~* '\.opus(\?|$)' THEN RETURN 'audio/opus';
      ELSE RETURN 'audio/mpeg';  -- Default
      END IF;
    ELSE
      RETURN 'application/octet-stream';
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to extract storage path from Supabase URL
CREATE OR REPLACE FUNCTION extract_storage_path(url TEXT)
RETURNS TEXT AS $$
DECLARE
  path TEXT;
BEGIN
  -- Extract path after /storage/v1/object/public/heirlooms-media/
  path := substring(url from '/storage/v1/object/public/[^/]+/(.+)$');
  IF path IS NULL OR path = '' THEN
    -- Fallback: just use the filename
    path := extract_filename_from_url(url);
  END IF;
  RETURN path;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

DO $$
DECLARE
  artifact_record RECORD;
  media_url TEXT;
  current_media_id UUID;
  sort_idx INTEGER;
  existing_media_id UUID;
BEGIN
  RAISE NOTICE 'Starting backfill of user_media and artifact_media tables...';

  -- Loop through all artifacts that have media_urls
  FOR artifact_record IN
    SELECT id, user_id, media_urls, thumbnail_url, created_at
    FROM artifacts
    WHERE media_urls IS NOT NULL
      AND array_length(media_urls, 1) > 0
  LOOP
    RAISE NOTICE 'Processing artifact: % (% media files)', artifact_record.id, array_length(artifact_record.media_urls, 1);

    sort_idx := 0;

    -- Loop through each media URL in the array
    FOREACH media_url IN ARRAY artifact_record.media_urls
    LOOP
      -- Check if this media URL already exists in user_media
      SELECT id INTO existing_media_id
      FROM user_media
      WHERE public_url = media_url
      LIMIT 1;

      IF existing_media_id IS NOT NULL THEN
        -- Media already exists, just create the link
        current_media_id := existing_media_id;
        RAISE NOTICE '  - Using existing media: %', media_url;
      ELSE
        -- Create new user_media record
        INSERT INTO user_media (
          user_id,
          storage_path,
          public_url,
          filename,
          mime_type,
          file_size_bytes,
          media_type,
          upload_source,
          created_at,
          updated_at
        )
        VALUES (
          artifact_record.user_id,
          extract_storage_path(media_url),
          media_url,
          extract_filename_from_url(media_url),
          detect_mime_type(media_url),
          0,  -- File size unknown during backfill
          detect_media_type(media_url),
          'artifact',
          artifact_record.created_at,  -- Use artifact creation date
          artifact_record.created_at
        )
        RETURNING id INTO current_media_id;

        RAISE NOTICE '  - Created new media: %', media_url;
      END IF;

      -- Create artifact_media link (skip if already exists)
      IF NOT EXISTS (
        SELECT 1 FROM artifact_media am
        WHERE am.artifact_id = artifact_record.id
          AND am.media_id = current_media_id
      ) THEN
        INSERT INTO artifact_media (
          artifact_id,
          media_id,
          role,
          sort_order,
          is_primary,
          created_at,
          updated_at
        )
        VALUES (
          artifact_record.id,
          current_media_id,
          'gallery',  -- All existing media goes to gallery
          sort_idx,
          (media_url = artifact_record.thumbnail_url),  -- Mark as primary if it's the thumbnail
          artifact_record.created_at,
          artifact_record.created_at
        );

        RAISE NOTICE '  - Created artifact_media link (sort_order: %, is_primary: %)',
          sort_idx, (media_url = artifact_record.thumbnail_url);
      ELSE
        RAISE NOTICE '  - Artifact_media link already exists, skipping';
      END IF;

      sort_idx := sort_idx + 1;
    END LOOP;
  END LOOP;

  RAISE NOTICE 'Backfill complete!';
  RAISE NOTICE 'Total user_media records: %', (SELECT COUNT(*) FROM user_media);
  RAISE NOTICE 'Total artifact_media records: %', (SELECT COUNT(*) FROM artifact_media);
END $$;

-- Cleanup helper functions (keep them for future use)
COMMENT ON FUNCTION extract_filename_from_url(TEXT) IS
  'Helper function to extract filename from URL';
COMMENT ON FUNCTION detect_media_type(TEXT) IS
  'Helper function to detect media type (image/video/audio) from URL extension';
COMMENT ON FUNCTION detect_mime_type(TEXT) IS
  'Helper function to detect MIME type from URL extension';
COMMENT ON FUNCTION extract_storage_path(TEXT) IS
  'Helper function to extract storage path from Supabase Storage URL';
