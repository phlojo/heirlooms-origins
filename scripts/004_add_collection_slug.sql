-- Add slug column to collections table
ALTER TABLE collections ADD COLUMN IF NOT EXISTS slug TEXT;

-- Create unique index on slug
CREATE UNIQUE INDEX IF NOT EXISTS idx_collections_slug ON collections(slug);

-- Generate slugs for existing collections
-- This will create slugs from titles and handle duplicates by appending numbers
DO $$
DECLARE
  collection_record RECORD;
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER;
BEGIN
  FOR collection_record IN SELECT id, title FROM collections WHERE slug IS NULL
  LOOP
    -- Generate base slug from title
    base_slug := lower(regexp_replace(collection_record.title, '[^a-zA-Z0-9]+', '-', 'g'));
    base_slug := trim(both '-' from base_slug);
    
    -- Handle empty slugs
    IF base_slug = '' THEN
      base_slug := 'collection';
    END IF;
    
    -- Check for duplicates and append number if needed
    final_slug := base_slug;
    counter := 2;
    
    WHILE EXISTS (SELECT 1 FROM collections WHERE slug = final_slug AND id != collection_record.id) LOOP
      final_slug := base_slug || '-' || counter;
      counter := counter + 1;
    END LOOP;
    
    -- Update the collection with the slug
    UPDATE collections SET slug = final_slug WHERE id = collection_record.id;
  END LOOP;
END $$;

-- Make slug NOT NULL after generating slugs for existing records
ALTER TABLE collections ALTER COLUMN slug SET NOT NULL;
