-- Add type_id to artifacts table
-- Artifacts always own their type (moving between collections doesn't change it)
ALTER TABLE artifacts 
ADD COLUMN IF NOT EXISTS type_id UUID REFERENCES artifact_types(id) ON DELETE SET NULL;

-- Add primary_type_id to collections table
-- Collections have an optional preferred type for UX defaults
ALTER TABLE collections 
ADD COLUMN IF NOT EXISTS primary_type_id UUID REFERENCES artifact_types(id) ON DELETE SET NULL;

-- Create indexes for type lookups
CREATE INDEX IF NOT EXISTS idx_artifacts_type_id ON artifacts(type_id);
CREATE INDEX IF NOT EXISTS idx_collections_primary_type_id ON collections(primary_type_id);

-- Set default type for existing artifacts (general type)
-- This ensures backwards compatibility
UPDATE artifacts
SET type_id = (SELECT id FROM artifact_types WHERE slug = 'general' LIMIT 1)
WHERE type_id IS NULL;

-- Add comments for documentation
COMMENT ON COLUMN artifacts.type_id IS 'Artifact type - owned by artifact, persists across collection moves';
COMMENT ON COLUMN collections.primary_type_id IS 'Optional preferred type - used as default when creating artifacts in this collection';
