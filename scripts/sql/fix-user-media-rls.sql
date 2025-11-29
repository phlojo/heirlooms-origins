-- Fix RLS policy on user_media to allow public read access
-- for media linked to artifacts in public collections
--
-- Bug Reference: UB-251129-01
-- Issue: user_media RLS only allows owner to read, blocking gallery display for other users
--
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)

-- First, let's see what policies currently exist on user_media
-- SELECT * FROM pg_policies WHERE tablename = 'user_media';

-- Option 1: Simple policy - allow reading user_media if it's linked via artifact_media
-- This is the recommended approach as it's simple and covers all use cases

CREATE POLICY "Allow public read for media linked to artifacts"
ON user_media
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM artifact_media
    WHERE artifact_media.media_id = user_media.id
  )
);

-- Option 2 (Alternative): More restrictive - only allow if the artifact is in a public collection
-- Uncomment this and comment out Option 1 if you want stricter access control
/*
CREATE POLICY "Allow public read for media in public collections"
ON user_media
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM artifact_media am
    JOIN artifacts a ON a.id = am.artifact_id
    JOIN collections c ON c.id = a.collection_id
    WHERE am.media_id = user_media.id
    AND c.is_public = true
  )
);
*/

-- Verify the policy was created
SELECT * FROM pg_policies WHERE tablename = 'user_media';
