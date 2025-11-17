-- Backfill missing thumbnails for artifacts that have visual media
-- This script updates artifacts where thumbnail_url is NULL but they have images or videos in media_urls

DO $$
DECLARE
  artifact_record RECORD;
  first_visual_url TEXT;
  updated_count INT := 0;
BEGIN
  RAISE NOTICE 'Starting thumbnail backfill...';
  
  -- Loop through all artifacts with NULL thumbnail_url but have media_urls
  FOR artifact_record IN 
    SELECT id, title, media_urls
    FROM artifacts
    WHERE thumbnail_url IS NULL
      AND media_urls IS NOT NULL
      AND array_length(media_urls, 1) > 0
  LOOP
    first_visual_url := NULL;
    
    -- Find first image in media_urls
    FOR i IN 1..array_length(artifact_record.media_urls, 1) LOOP
      IF artifact_record.media_urls[i] ~* '\.(jpg|jpeg|png|gif|webp|heic|heif)' THEN
        first_visual_url := artifact_record.media_urls[i];
        EXIT;
      END IF;
    END LOOP;
    
    -- If no image found, find first video
    IF first_visual_url IS NULL THEN
      FOR i IN 1..array_length(artifact_record.media_urls, 1) LOOP
        IF artifact_record.media_urls[i] ~* '/video/upload/' 
           AND NOT artifact_record.media_urls[i] ~* '\.(mp3|wav|m4a|aac|ogg|opus)' THEN
          first_visual_url := artifact_record.media_urls[i];
          EXIT;
        ELSIF artifact_record.media_urls[i] ~* '\.(mp4|mov|avi|mkv|webm|m4v|flv|wmv)' THEN
          first_visual_url := artifact_record.media_urls[i];
          EXIT;
        END IF;
      END LOOP;
    END IF;
    
    -- Update if we found a visual media URL
    IF first_visual_url IS NOT NULL THEN
      UPDATE artifacts
      SET thumbnail_url = first_visual_url,
          updated_at = NOW()
      WHERE id = artifact_record.id;
      
      updated_count := updated_count + 1;
      RAISE NOTICE 'Updated artifact "%" (ID: %) with thumbnail: %', 
        artifact_record.title, artifact_record.id, first_visual_url;
    ELSE
      RAISE NOTICE 'Skipped artifact "%" (ID: %) - no visual media found (audio-only)', 
        artifact_record.title, artifact_record.id;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Thumbnail backfill complete. Updated % artifacts.', updated_count;
END $$;

-- Verify results
SELECT 
  COUNT(*) FILTER (WHERE thumbnail_url IS NOT NULL) as artifacts_with_thumbnails,
  COUNT(*) FILTER (WHERE thumbnail_url IS NULL AND array_length(media_urls, 1) > 0) as artifacts_without_thumbnails_but_have_media,
  COUNT(*) FILTER (WHERE thumbnail_url IS NULL AND (media_urls IS NULL OR array_length(media_urls, 1) = 0)) as artifacts_with_no_media
FROM artifacts;
