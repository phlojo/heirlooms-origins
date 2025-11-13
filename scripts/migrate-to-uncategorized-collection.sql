-- Migration script to consolidate all null collection_id artifacts into the uncategorized collection
-- This ensures we have a single source of truth for uncategorized artifacts

-- Step 1: Ensure each user has an uncategorized collection
INSERT INTO collections (id, user_id, title, description, slug, is_public, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  u.id as user_id,
  'Uncategorized Artifacts' as title,
  'This collection holds your uncategorized artifacts — items you''ve created without assigning a collection, or ones that remained after a collection was deleted.' as description,
  'uncategorized' as slug,
  false as is_public,
  NOW() as created_at,
  NOW() as updated_at
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM collections c
  WHERE c.user_id = u.id 
  AND c.slug = 'uncategorized'
);

-- Step 2: Move all artifacts with null collection_id to their user's uncategorized collection
UPDATE artifacts
SET collection_id = (
  SELECT c.id 
  FROM collections c
  WHERE c.user_id = artifacts.user_id 
  AND c.slug = 'uncategorized'
  LIMIT 1
)
WHERE collection_id IS NULL;

-- Step 3: Delete duplicate uncategorized collections (keep the oldest one per user)
DELETE FROM collections
WHERE slug = 'uncategorized'
AND id NOT IN (
  SELECT MIN(id)
  FROM collections
  WHERE slug = 'uncategorized'
  GROUP BY user_id
);
