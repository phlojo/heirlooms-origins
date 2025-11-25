-- ROLLBACK SCRIPT FOR MEDIA DERIVATIVES (PHASE 1)
-- Run this script if you need to revert the Phase 1 media derivatives implementation
--
-- WHEN TO USE THIS:
-- - If you encounter errors after migration
-- - If you need to revert to the previous system
-- - If there are performance issues with the new column
--
-- SAFETY: This script only removes the media_derivatives column.
--         It does NOT touch media_urls or any existing data.
--         Your artifacts and media will remain intact.

-- Step 1: Drop the GIN index
DROP INDEX IF EXISTS idx_artifacts_media_derivatives;

-- Step 2: Remove the media_derivatives column
ALTER TABLE artifacts
DROP COLUMN IF EXISTS media_derivatives;

-- Step 3: Verify column is removed
-- Run this query to confirm:
-- SELECT column_name
-- FROM information_schema.columns
-- WHERE table_name = 'artifacts'
-- AND column_name = 'media_derivatives';
-- (Should return 0 rows)

-- ROLLBACK COMPLETE
-- Next steps:
-- 1. Verify artifacts still display correctly
-- 2. Redeploy previous code version (before Phase 1)
-- 3. Check application logs for any errors
