-- Migration: Consolidate uncategorized collections and artifacts
-- Handles existing duplicates without inserting new rows

-- Step 1: For each user, consolidate all artifacts into their oldest uncategorized collection
DO $$
DECLARE
  user_rec RECORD;
  primary_collection_id UUID;
BEGIN
  FOR user_rec IN 
    SELECT DISTINCT user_id 
    FROM collections 
    WHERE slug = 'uncategorized'
  LOOP
    -- Get the oldest uncategorized collection for this user
    SELECT id INTO primary_collection_id
    FROM collections
    WHERE user_id = user_rec.user_id AND slug = 'uncategorized'
    ORDER BY created_at ASC
    LIMIT 1;
    
    -- Move all artifacts from duplicate uncategorized collections to the primary one
    UPDATE artifacts
    SET collection_id = primary_collection_id
    WHERE user_id = user_rec.user_id
    AND collection_id IN (
      SELECT id FROM collections 
      WHERE user_id = user_rec.user_id 
      AND slug = 'uncategorized'
      AND id != primary_collection_id
    );
    
    -- Move all NULL collection_id artifacts to the primary uncategorized collection
    UPDATE artifacts
    SET collection_id = primary_collection_id
    WHERE user_id = user_rec.user_id
    AND collection_id IS NULL;
  END LOOP;
END $$;

-- Step 2: Delete duplicate uncategorized collections (keeping the oldest one per user)
DELETE FROM collections
WHERE slug = 'uncategorized'
AND id NOT IN (
  SELECT MIN(id)
  FROM collections
  WHERE slug = 'uncategorized'
  GROUP BY user_id
);
