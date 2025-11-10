-- Check current RLS policies for artifacts table
SELECT * FROM pg_policies WHERE tablename = 'artifacts';

-- The issue might be that the UPDATE policy doesn't allow setting collection_id to NULL
-- Let's recreate the update policy to explicitly allow null collection_id

-- Drop existing update policy
DROP POLICY IF EXISTS "Users can update own artifacts" ON artifacts;

-- Create new update policy that allows users to update their own artifacts
-- This includes setting collection_id to null (moving to Unsorted)
CREATE POLICY "Users can update own artifacts"
ON artifacts
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
