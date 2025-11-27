# Media Gallery Schema Proposal

**Date:** November 27, 2025
**Status:** Proposal
**Goal:** Introduce canonical user media model + artifact media gallery

## Design Decisions

### Alignment with Existing Patterns

Based on thorough codebase analysis:

1. **Naming Convention:** Follow existing table names (snake_case)
2. **Timestamps:** Use `created_at` and `updated_at TIMESTAMPTZ DEFAULT NOW()`
3. **User References:** `user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE`
4. **IDs:** Use `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
5. **Migration Style:** Idempotent SQL in `scripts/` with semantic numbering

### Schema Overview

```
┌──────────────┐         ┌─────────────────┐         ┌──────────────┐
│  user_media  │◄────────│ artifact_media  │────────►│  artifacts   │
│              │         │   (join table)  │         │              │
│ - All user's │         │ - role: gallery │         │ - Existing   │
│   uploaded   │         │   inline_block  │         │   artifact   │
│   media      │         │   cover         │         │   data       │
│              │         │ - sort_order    │         │              │
└──────────────┘         └─────────────────┘         └──────────────┘
```

## Proposed Schema

### Table 1: `user_media`

Canonical storage for all user-uploaded media files.

```sql
CREATE TABLE IF NOT EXISTS user_media (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- File Storage (Supabase Storage)
  storage_path TEXT NOT NULL,              -- e.g., "{userId}/{artifactId}/{timestamp}-{filename}"
  public_url TEXT NOT NULL UNIQUE,         -- Full Supabase public URL

  -- File Metadata
  filename TEXT NOT NULL,                  -- Original filename
  mime_type TEXT NOT NULL,                 -- e.g., "image/jpeg", "video/mp4"
  file_size_bytes BIGINT NOT NULL,         -- File size in bytes

  -- Media Dimensions (nullable for audio)
  width INTEGER,                           -- Image/video width in pixels
  height INTEGER,                          -- Image/video height in pixels
  duration_seconds NUMERIC(10,2),          -- Video/audio duration

  -- Media Type Classification
  media_type TEXT NOT NULL,                -- 'image', 'video', 'audio'

  -- Lifecycle
  upload_source TEXT DEFAULT 'artifact',   -- 'artifact', 'profile', 'collection', etc.
  is_processed BOOLEAN DEFAULT false,      -- For future processing pipeline

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Indexes
  CONSTRAINT media_type_check CHECK (media_type IN ('image', 'video', 'audio'))
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_media_user_id ON user_media(user_id);
CREATE INDEX IF NOT EXISTS idx_user_media_type ON user_media(media_type);
CREATE INDEX IF NOT EXISTS idx_user_media_created ON user_media(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_media_public_url ON user_media(public_url);

-- RLS Policies
ALTER TABLE user_media ENABLE ROW LEVEL SECURITY;

-- Users can only see their own media
CREATE POLICY user_media_select_own
  ON user_media FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only insert their own media
CREATE POLICY user_media_insert_own
  ON user_media FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can only update their own media
CREATE POLICY user_media_update_own
  ON user_media FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can only delete their own media
CREATE POLICY user_media_delete_own
  ON user_media FOR DELETE
  USING (auth.uid() = user_id);
```

### Table 2: `artifact_media`

Join table linking artifacts to media with roles and ordering.

```sql
CREATE TABLE IF NOT EXISTS artifact_media (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships
  artifact_id UUID NOT NULL REFERENCES artifacts(id) ON DELETE CASCADE,
  media_id UUID NOT NULL REFERENCES user_media(id) ON DELETE CASCADE,

  -- Media Role and Context
  role TEXT NOT NULL DEFAULT 'gallery',    -- 'gallery', 'inline_block', 'cover'
  sort_order INTEGER NOT NULL DEFAULT 0,   -- Display order (0-based)

  -- Optional: For future block-based content system
  block_id TEXT,                           -- If media belongs to a specific content block

  -- Optional: Per-artifact media customization
  caption_override TEXT,                   -- Override global caption for this artifact
  is_primary BOOLEAN DEFAULT false,        -- Primary/thumbnail media for artifact

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT role_check CHECK (role IN ('gallery', 'inline_block', 'cover')),
  CONSTRAINT unique_artifact_media_order UNIQUE (artifact_id, role, sort_order)
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_artifact_media_artifact ON artifact_media(artifact_id);
CREATE INDEX IF NOT EXISTS idx_artifact_media_media ON artifact_media(media_id);
CREATE INDEX IF NOT EXISTS idx_artifact_media_role ON artifact_media(role);
CREATE INDEX IF NOT EXISTS idx_artifact_media_sort ON artifact_media(artifact_id, role, sort_order);

-- RLS Policies (inherit from artifacts table permissions)
ALTER TABLE artifact_media ENABLE ROW LEVEL SECURITY;

-- Users can see artifact_media for artifacts they can access
CREATE POLICY artifact_media_select
  ON artifact_media FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM artifacts a
      LEFT JOIN collections c ON a.collection_id = c.id
      WHERE a.id = artifact_media.artifact_id
      AND (
        c.is_public = true
        OR a.user_id = auth.uid()
        OR c.user_id = auth.uid()
      )
    )
  );

-- Users can only modify artifact_media for their own artifacts
CREATE POLICY artifact_media_insert
  ON artifact_media FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM artifacts
      WHERE id = artifact_media.artifact_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY artifact_media_update
  ON artifact_media FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM artifacts
      WHERE id = artifact_media.artifact_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY artifact_media_delete
  ON artifact_media FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM artifacts
      WHERE id = artifact_media.artifact_id
      AND user_id = auth.uid()
    )
  );
```

## Data Flow

### Upload New Media (Future Flow)

```
1. User uploads file
   ↓
2. Upload to Supabase Storage (temp folder)
   ↓
3. Create user_media record with metadata
   ↓
4. User adds to artifact (assigns role)
   ↓
5. Create artifact_media link
   ↓
6. Move file from temp to artifact folder
   ↓
7. Update user_media.storage_path
```

### Query Artifact Gallery

```sql
-- Get all gallery media for an artifact
SELECT
  um.*,
  am.sort_order,
  am.caption_override,
  am.is_primary
FROM artifact_media am
JOIN user_media um ON am.media_id = um.id
WHERE am.artifact_id = $1
  AND am.role = 'gallery'
ORDER BY am.sort_order ASC;
```

### Query User's All Media (for reuse picker)

```sql
-- Get all user's media not yet in this artifact
SELECT um.*
FROM user_media um
WHERE um.user_id = $1
  AND um.id NOT IN (
    SELECT media_id
    FROM artifact_media
    WHERE artifact_id = $2
  )
ORDER BY um.created_at DESC;
```

## Backward Compatibility Strategy

### Phase 1: Dual-Write Pattern

Keep existing `media_urls` array operational while building new system:

1. **On artifact create/update:**
   - Create `user_media` records for new uploads
   - Create `artifact_media` links
   - **ALSO** update `media_urls` array (for backward compatibility)

2. **On artifact read:**
   - **Primary:** Query from `artifact_media` + `user_media` join
   - **Fallback:** If no artifact_media records, use `media_urls` array

3. **Gradual migration:**
   - Backfill existing `media_urls` → `user_media` + `artifact_media`
   - Eventually deprecate `media_urls` array
   - Mark column as nullable in future migration

### Phase 2: Full Migration

Once all artifacts backfilled and tested:

```sql
-- Mark as deprecated (future migration)
ALTER TABLE artifacts
  ALTER COLUMN media_urls DROP NOT NULL;

-- Add comment
COMMENT ON COLUMN artifacts.media_urls IS
  'DEPRECATED: Use artifact_media join table instead. Kept for backward compatibility.';
```

## Migration File Sequence

Following existing pattern in `scripts/`:

1. **`012_create_user_media_table.sql`** - Create user_media table
2. **`013_create_artifact_media_table.sql`** - Create artifact_media join table
3. **`014_backfill_user_media.sql`** - Backfill existing media into new tables
4. **`015_add_media_indexes.sql`** - Additional performance indexes

## TypeScript Types

### New Types to Create

```typescript
// lib/types/media.ts

export interface UserMedia {
  id: string
  user_id: string
  storage_path: string
  public_url: string
  filename: string
  mime_type: string
  file_size_bytes: number
  width: number | null
  height: number | null
  duration_seconds: number | null
  media_type: 'image' | 'video' | 'audio'
  upload_source: string
  is_processed: boolean
  created_at: string
  updated_at: string
}

export interface ArtifactMedia {
  id: string
  artifact_id: string
  media_id: string
  role: 'gallery' | 'inline_block' | 'cover'
  sort_order: number
  block_id: string | null
  caption_override: string | null
  is_primary: boolean
  created_at: string
  updated_at: string
}

export interface ArtifactMediaWithFile extends ArtifactMedia {
  media: UserMedia
}

export interface UserMediaWithDerivatives extends UserMedia {
  // Computed derivatives (not stored in DB)
  thumbnailUrl?: string
  mediumUrl?: string
  largeUrl?: string
}
```

## Benefits of This Design

### 1. **Media Reuse**
- User uploads once, uses in multiple artifacts
- Reduces storage costs
- Faster artifact creation (no re-upload)

### 2. **Flexible Roles**
- Gallery: Top carousel display
- Inline: Embedded in content blocks
- Cover: Collection/artifact thumbnails

### 3. **Granular Control**
- Per-artifact captions (override global)
- Custom sort order per artifact
- Mark primary/thumbnail media

### 4. **Future-Proof**
- Easy to add `collection_media`, `story_media`, etc.
- Ready for block-based content editor
- Supports media library UI

### 5. **Query Efficiency**
- Fast: "Show me all user's images"
- Fast: "Show me gallery for this artifact"
- Fast: "Find media not yet used in this artifact"

### 6. **Cleanup Safety**
- Can detect orphaned media (not linked to any artifact)
- Can safely delete media (CASCADE removes links)
- Track which artifacts use each media item

## Open Questions

1. **Should we allow media deletion if still referenced?**
   - Proposal: Soft delete with `deleted_at` timestamp
   - OR: Block deletion if `artifact_media` references exist

2. **Global vs per-artifact captions?**
   - Proposal: Store global caption in separate `media_metadata` table
   - Use `artifact_media.caption_override` for artifact-specific text

3. **Derivatives storage?**
   - Keep current: On-demand via Cloudinary fetch
   - OR: Store derivative URLs in `user_media.derivatives JSONB`

4. **Processing pipeline?**
   - `is_processed` flag for future: thumbnail generation, metadata extraction, etc.

## Next Steps

1. ✅ Get approval on schema design
2. Create migration files
3. Write backfill script
4. Update TypeScript types
5. Create server actions for media management
6. Update UI components (gallery, editor)
7. Test thoroughly with existing data

---

**Author:** Claude Code
**Review Required:** Schema design, RLS policies, backward compatibility approach
