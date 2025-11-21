-- Create artifact_types table for dynamic, editable artifact type system
-- This allows the app to manage types without code changes

CREATE TABLE IF NOT EXISTS artifact_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE, -- e.g., "General", "Cars", "Watches"
  slug TEXT NOT NULL UNIQUE, -- e.g., "general", "cars", "watches"
  description TEXT, -- Optional description of this type
  icon_name TEXT NOT NULL, -- Lucide icon name, e.g., "Package", "Car", "Watch"
  display_order INTEGER NOT NULL DEFAULT 0, -- Order for UI display
  is_active BOOLEAN DEFAULT true, -- Allow soft deletion
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for active types ordering
CREATE INDEX IF NOT EXISTS idx_artifact_types_active_order 
  ON artifact_types(is_active, display_order) 
  WHERE is_active = true;

-- Create index for slug lookups
CREATE INDEX IF NOT EXISTS idx_artifact_types_slug 
  ON artifact_types(slug);

-- Enable Row Level Security
ALTER TABLE artifact_types ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can view active artifact types
CREATE POLICY "Anyone can view active artifact types"
  ON artifact_types FOR SELECT
  USING (is_active = true);

-- Policy: Only admins can manage artifact types (insert, update, delete)
CREATE POLICY "Only admins can manage artifact types"
  ON artifact_types FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Seed initial artifact types
INSERT INTO artifact_types (name, slug, description, icon_name, display_order) VALUES
  ('General / Other', 'general', 'General artifacts and miscellaneous items', 'Package', 1),
  ('Car Collectors', 'cars', 'Vintage and classic automobiles', 'Car', 2),
  ('Watch Collectors', 'watches', 'Timepieces and horological collections', 'Watch', 3),
  ('Whiskey / Spirits Collectors', 'whiskey', 'Fine spirits and whiskey collections', 'Wine', 4),
  ('Toy & Figurine Collectors', 'toys', 'Collectible toys, action figures, and figurines', 'Atom', 5),
  ('Games', 'games', 'Board games, video games, and gaming collectibles', 'Dices', 6)
ON CONFLICT (slug) DO NOTHING;

-- Add comment for documentation
COMMENT ON TABLE artifact_types IS 'Dynamic artifact type system - types can be added, removed, or renamed without code changes';
