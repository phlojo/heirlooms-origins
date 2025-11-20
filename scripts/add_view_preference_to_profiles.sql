-- Add view_preference column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS view_preference TEXT DEFAULT 'gallery' CHECK (view_preference IN ('gallery', 'list'));

-- Update existing profiles to have default view_preference
UPDATE profiles 
SET view_preference = 'gallery' 
WHERE view_preference IS NULL;
