# Phase 3: Cloudinary to Supabase Storage Migration

**Date:** 2025-12-01
**Goal:** Migrate legacy Cloudinary originals to Supabase Storage
**Status:** COMPLETE
**Result:** 107 artifacts migrated, 357 files transferred, 0 errors

---

## Summary

Phase 3 completed the transition from Cloudinary-as-storage to Cloudinary-as-delivery-only. All 107 artifacts with Cloudinary media were migrated to Supabase Storage. Cloudinary now serves only as a CDN for derivative transformations via fetch URLs.

### Migration Results

| Metric | Value |
|--------|-------|
| Artifacts migrated | 107 |
| Files transferred | 357 |
| Errors | 0 |
| Migration mode | `--skip-delete` (Cloudinary backups retained) |
| Duration | ~15 minutes |

### Before/After

**Before Phase 3:**
- New uploads (Phase 2): Supabase Storage
- Legacy uploads (pre-Phase 2): Cloudinary originals
- 107 artifacts still had Cloudinary URLs

**After Phase 3:**
- All uploads: Supabase Storage originals
- Cloudinary: Derivative delivery only (fetch URLs)
- 0 artifacts have Cloudinary URLs

---

## Scripts Created

### 1. migrate-cloudinary-to-supabase.ts

**Purpose:** Main migration script for moving Cloudinary originals to Supabase Storage.

**Location:** `scripts/migrate-cloudinary-to-supabase.ts`

**Usage:**
```bash
# Dry run (preview only, no changes)
pnpm tsx scripts/migrate-cloudinary-to-supabase.ts

# Execute migration
pnpm tsx scripts/migrate-cloudinary-to-supabase.ts --migrate

# Execute with limit (test small batch)
pnpm tsx scripts/migrate-cloudinary-to-supabase.ts --migrate --limit=10

# Execute keeping Cloudinary backups
pnpm tsx scripts/migrate-cloudinary-to-supabase.ts --migrate --skip-delete

# Migrate specific user only
pnpm tsx scripts/migrate-cloudinary-to-supabase.ts --migrate --user=<uuid>
```

**What it does:**
1. Finds artifacts with Cloudinary URLs in `media_urls`
2. Downloads each original from Cloudinary
3. Uploads to Supabase Storage: `{userId}/{artifactId}/{timestamp}-{filename}`
4. Updates `artifacts.media_urls` with new Supabase URLs
5. Updates `artifacts.thumbnail_url` if needed
6. Updates AI metadata JSONB keys:
   - `image_captions`
   - `video_summaries`
   - `audio_transcripts`
7. Updates `user_media` records if they exist
8. Optionally deletes Cloudinary originals

**Safety features:**
- Dry run mode by default
- Per-artifact atomic updates
- Detailed logging
- `--limit` flag for gradual migration
- `--skip-delete` flag to keep Cloudinary backups

### 2. backfill-media-derivatives.ts

**Purpose:** Generate derivative URL mappings for artifacts that have Cloudinary URLs but no `media_derivatives`.

**Location:** `scripts/backfill-media-derivatives.ts`

**Usage:**
```bash
# Dry run
pnpm tsx scripts/backfill-media-derivatives.ts

# Execute backfill
pnpm tsx scripts/backfill-media-derivatives.ts --backfill

# Execute with limit
pnpm tsx scripts/backfill-media-derivatives.ts --backfill --limit=10
```

**What it does:**
1. Finds artifacts with Cloudinary URLs but no `media_derivatives`
2. Generates derivative URLs (thumb/medium/large) using transformation presets
3. Updates `artifacts.media_derivatives` JSONB column

**Transformation presets:**
- **thumb (images):** `w_400,h_400,c_fill,q_auto,f_auto`
- **thumb (videos):** `w_400,h_400,c_fill,so_1.0,du_0,f_jpg,q_auto` (poster frame)
- **medium:** `w_1024,c_limit,q_auto,f_auto`
- **large:** `w_1600,c_limit,q_auto,f_auto`

---

## Execution Steps

### Step 1: Derivatives Backfill (Pre-Migration)

First, we backfilled derivatives for legacy artifacts to ensure they had proper `media_derivatives` mappings:

```bash
pnpm tsx scripts/backfill-media-derivatives.ts --backfill
```

**Results:**
- Artifacts processed: 107
- Derivative mappings added: 258
- Errors: 0

### Step 2: Test Migration (Small Batch)

Tested with 5 artifacts to verify the migration process:

```bash
pnpm tsx scripts/migrate-cloudinary-to-supabase.ts --migrate --limit=5 --skip-delete
```

**Results:**
- Artifacts: 5
- Files migrated: 10
- Errors: 0

### Step 3: Full Migration

Executed full migration with backup retention:

```bash
pnpm tsx scripts/migrate-cloudinary-to-supabase.ts --migrate --skip-delete
```

**Results:**
- Artifacts: 107
- Files migrated: 357
- Errors: 0

### Step 4: Verification

Verified migration completed by running dry run (should show 0 artifacts):

```bash
pnpm tsx scripts/migrate-cloudinary-to-supabase.ts
# Output: "Found 0 artifacts with Cloudinary media"
```

---

## Technical Details

### URL Transformation

**Before:**
```
https://res.cloudinary.com/{cloud}/image/upload/v{version}/{public_id}.jpg
```

**After:**
```
https://{project}.supabase.co/storage/v1/object/public/heirlooms-media/{userId}/{artifactId}/{timestamp}-{filename}.jpg
```

### AI Metadata Key Updates

The migration script updates JSONB maps that use URLs as keys:

```typescript
// Before
image_captions: {
  "https://res.cloudinary.com/.../image.jpg": "A photo of..."
}

// After
image_captions: {
  "https://project.supabase.co/storage/.../image.jpg": "A photo of..."
}
```

### TypeScript Fixes Required

During script development, several TypeScript compatibility fixes were needed:

1. **Crypto import:**
   ```typescript
   // Before (error: no default export)
   import crypto from "node:crypto"

   // After
   import * as crypto from "node:crypto"
   ```

2. **Set iteration:**
   ```typescript
   // Before (error: downlevelIteration required)
   for (const url of cloudinaryUrls) { ... }

   // After
   for (const url of Array.from(cloudinaryUrls)) { ... }
   ```

3. **Map iteration:**
   ```typescript
   // Before (error)
   for (const [old, new] of urlMappings) { ... }

   // After
   Array.from(urlMappings.entries()).forEach(([old, new]) => { ... })
   ```

---

## Rollback Strategy

### Feature Flag

The feature flag `NEXT_PUBLIC_USE_SUPABASE_STORAGE` controls upload routing:

- `true` (current): New uploads go to Supabase Storage
- `false` (rollback): New uploads go to Cloudinary

### Cloudinary Backups

Migration was run with `--skip-delete`, so all Cloudinary originals remain as backups. If issues are discovered:

1. Set `NEXT_PUBLIC_USE_SUPABASE_STORAGE=false`
2. Run rollback script (not yet created) to restore Cloudinary URLs
3. Or manually update affected artifacts

### Future Cleanup

Once confident in the migration:

1. Create `scripts/cleanup-cloudinary.ts`
2. Run with `--dry-run` to preview deletions
3. Run with `--delete` to remove Cloudinary copies
4. Monitor Cloudinary dashboard for storage reduction

---

## Current Architecture (Post-Phase 3)

### Storage Flow

```
User Upload → Supabase Storage (originals)
                     ↓
              Cloudinary Fetch
                     ↓
           Derivative (thumb/medium/large)
                     ↓
              Cloudinary CDN Cache
```

### URL Types in Database

After Phase 3, `artifacts.media_urls` contains only Supabase URLs:

```json
[
  "https://project.supabase.co/storage/v1/object/public/heirlooms-media/userId/artifactId/timestamp-image1.jpg",
  "https://project.supabase.co/storage/v1/object/public/heirlooms-media/userId/artifactId/timestamp-image2.jpg"
]
```

### Derivative Generation

Derivatives are generated on-demand via Cloudinary fetch:

```typescript
getThumbnailUrl(supabaseUrl)
// Returns: https://res.cloudinary.com/{cloud}/image/fetch/w_400,h_400,c_fill,q_auto,f_auto/{supabaseUrl}
```

---

## Related Documentation

- `MEDIA-ARCHITECTURE.md` - Updated with Phase 3 completion status
- `docs/archive/2025-11-26-phase-2-plan.md` - Phase 2 implementation
- `docs/archive/2025-11-26-phase-1-implementation-summary.md` - Phase 1 implementation
- `scripts/migrate-cloudinary-to-supabase.ts` - Migration script
- `scripts/backfill-media-derivatives.ts` - Derivatives backfill script

---

## Lessons Learned

1. **Dry run first:** Always preview with dry run before executing migrations
2. **Test small batches:** Use `--limit` flag to test with small batches first
3. **Keep backups:** Use `--skip-delete` initially, clean up later
4. **Update all references:** AI metadata JSONB keys need URL updates too
5. **TypeScript quirks:** Node.js built-in imports and iteration may need special handling
