-- Add per-media AI fields to artifacts table
-- These fields store AI-generated content for individual media items

-- video_summaries: maps video URL to AI summary/description
ALTER TABLE artifacts 
ADD COLUMN IF NOT EXISTS video_summaries JSONB DEFAULT '{}'::jsonb;

-- audio_transcripts: maps audio URL to transcript (supports multiple audio files)
ALTER TABLE artifacts 
ADD COLUMN IF NOT EXISTS audio_transcripts JSONB DEFAULT '{}'::jsonb;

-- audio_summaries: maps audio URL to AI summary (optional)
ALTER TABLE artifacts 
ADD COLUMN IF NOT EXISTS audio_summaries JSONB DEFAULT '{}'::jsonb;

-- Note: image_captions already exists and maps image URL to caption
-- Note: transcript field will be deprecated in favor of audio_transcripts but kept for backwards compatibility
