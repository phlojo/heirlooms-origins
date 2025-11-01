-- Add theme_preference column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS theme_preference TEXT DEFAULT 'light' CHECK (theme_preference IN ('light', 'dark'));

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_theme ON profiles(theme_preference);
