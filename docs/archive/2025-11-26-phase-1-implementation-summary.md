# Phase 1 Implementation Summary: Media Derivatives Architecture

**Date:** 2025-11-25
**Status:** ✅ Complete - Ready for Testing
**Implements:** MEDIA-ARCHITECTURE.md Phase 1 (Cloudinary originals + pre-generated derivatives)

---

## 🎯 Objective

Implement a safety layer for Cloudinary usage by pre-generating and storing derivative URLs (thumb, medium, large) instead of dynamically generating transformations on every render. This prevents unbounded Cloudinary transformation costs and quota exhaustion.

---

## 📋 Changes Made

### 1. Database Schema (`scripts/012_add_media_derivatives.sql`)

**NEW FILE** - Migration script to add media derivatives support

```sql
ALTER TABLE artifacts
ADD COLUMN media_derivatives JSONB;
```

**Format:** `{ "original_url": { "thumb": "url", "medium": "url", "large": "url" } }`

**Index:** GIN index on `media_derivatives` for efficient lookups

---

### 2. Server Actions

#### `lib/actions/media-derivatives.ts` (NEW FILE)

**Purpose:** Generate and manage media derivative URLs

**Key Functions:**
- `generateDerivativeUrls(originalUrl)` - Generates derivative URLs for a single media item
  - **Thumb:** 400x400, c_fill (square, cropped)
  - **Medium:** 1024px width, c_limit
  - **Large:** 1600px width, c_limit
  - **Video support:** Generates thumbnail from 1-second mark
- `generateDerivativesMap(mediaUrls[])` - Batch generation for multiple media items
- `updateArtifactDerivatives(artifactId, mediaUrls)` - Updates artifact's derivatives in database
- `getDerivativeUrl(derivatives, url, size)` - Helper to extract specific derivative size

**Note:** These are URL constructions (Cloudinary generates on first request), not actual API calls.

---

#### `lib/actions/artifacts.ts` (MODIFIED)

**Changes:**
1. **Import:** Added `generateDerivativesMap` from `media-derivatives`
2. **createArtifact():**
   - Generates derivatives map when artifact is created
   - Stores derivatives in `media_derivatives` column
   - Logs derivative count for debugging
3. **getArtifactsByCollection():**
   - Added `media_derivatives` to SELECT query
4. Other SELECT queries using `*` automatically include `media_derivatives`

**Code Location:** Lines 16, 119-124, 133, 236

---

### 3. Validation Schemas (`lib/schemas.ts`)

**Changes:**
1. **NEW:** `mediaDerivativesSchema` - Validates derivatives format
   ```typescript
   z.record(
     z.string().url(),  // original URL
     z.object({
       thumb: z.string().url(),
       medium: z.string().url(),
       large: z.string().url().optional()
     })
   )
   ```
2. **createArtifactSchema:** Added `media_derivatives: mediaDerivativesSchema.nullable().optional()`
3. **updateArtifactSchema:** Added same field

---

### 4. Cloudinary Utilities (`lib/cloudinary.ts`)

**COMPLETE REWRITE** with backwards compatibility

**Key Changes:**
1. **All utility functions now accept optional `mediaDerivatives` parameter:**
   - `getThumbnailUrl(url, mediaDerivatives?)`
   - `getCardUrl(url, mediaDerivatives?)`
   - `getMediumUrl(url, mediaDerivatives?)` - NEW (Phase 1 standard)
   - `getDetailUrl(url, mediaDerivatives?)`
   - `getLargeUrl(url, mediaDerivatives?)` - NEW (Phase 1 standard)
   - `getFullResUrl(url)` - Unchanged

2. **Logic:**
   - **First:** Try to use stored derivative from `mediaDerivatives` map
   - **Fallback:** Generate dynamic transformation URL (backwards compatibility)
   - **Logging:** Console logs show which path was taken

3. **Documentation:**
   - Added PHASE 1 comments throughout
   - Marked `getCardUrl()` and `getDetailUrl()` as DEPRECATED (use `getMediumUrl`/`getLargeUrl` instead)

---

### 5. UI Components (MODIFIED)

All artifact card components updated to pass `media_derivatives` to utility functions:

#### `components/artifact-card.tsx`
- **Added:** `media_derivatives?: Record<string, any> | null` to interface
- **Changed:** `getThumbnailUrl(artifact.thumbnail_url, artifact.media_derivatives)`

#### `components/artifact-card-compact.tsx`
- Same changes as above

#### `components/artifact-card-full.tsx`
- Same changes as above

#### `components/artifact-detail-view.tsx`
- **Changed:** `getDetailUrl(url, artifact.media_derivatives)` (line 717)
- Note: This component receives full artifact object with `media_derivatives`

---

## 🔄 How It Works

### Upload Flow
1. User uploads media via `add-media-modal.tsx`
2. Files are uploaded to Cloudinary (unchanged)
3. Original URLs are returned and tracked as pending uploads (unchanged)
4. **NEW:** When artifact is created, `createArtifact()` calls `generateDerivativesMap()`
5. **NEW:** Derivative URLs are generated and stored in `media_derivatives` column
6. Artifact is saved with both `media_urls` and `media_derivatives`

### Display Flow
1. Component fetches artifact (now includes `media_derivatives`)
2. Component calls `getThumbnailUrl(url, derivatives)` or `getDetailUrl(url, derivatives)`
3. **If derivatives exist:** Utility function returns stored derivative URL ✅
4. **If derivatives missing:** Utility function generates dynamic transformation URL (fallback)

---

## 🔒 Backwards Compatibility

**Critical:** This implementation is 100% backwards compatible.

1. **Old artifacts without derivatives:**
   - `media_derivatives` will be `null`
   - Utility functions detect this and fall back to dynamic generation
   - No visual changes for users

2. **Components without derivatives passed:**
   - Functions accept `undefined` for `mediaDerivatives` parameter
   - Automatically fall back to dynamic generation

3. **Gradual migration:**
   - New artifacts automatically get derivatives
   - Old artifacts continue working with dynamic transformations
   - Can backfill old artifacts later with a migration script

---

## 📊 Derivative Sizes (Aligned with MEDIA-ARCHITECTURE.md)

| Size   | Width  | Height | Crop   | Use Case                                |
|--------|--------|--------|--------|-----------------------------------------|
| thumb  | 400px  | 400px  | c_fill | Cards, grids, collection thumbnails     |
| medium | 1024px | auto   | c_limit | Artifact detail pages, lightbox default |
| large  | 1600px | auto   | c_limit | Zoomed lightbox, large desktop screens  |

**Video handling:** Thumbnails extracted from 1-second mark with `so_1.0,du_0`

---

## ✅ Testing Checklist

Before considering this complete, verify:

### Database
- [ ] Run migration: `012_add_media_derivatives.sql` on Supabase
- [ ] Verify column exists: `SELECT media_derivatives FROM artifacts LIMIT 1;`
- [ ] Verify index created: Check Supabase indexes

### Functionality
- [ ] Create new artifact with images → Check DB has derivatives
- [ ] Create new artifact with videos → Check DB has video derivatives
- [ ] View artifact in card (list) → Console logs "Using stored derivative"
- [ ] View artifact detail → Console logs "Using stored derivative"
- [ ] View old artifact without derivatives → Falls back gracefully (console logs "Generating dynamic transformation")

### TypeScript
- [x] `pnpm typecheck` passes (confirmed - no new errors)
- [ ] No console warnings in browser

### Manual Testing
- [ ] Upload artifact with 3+ images → All derivatives generated
- [ ] Inspect network tab → Derivative URLs match stored URLs
- [ ] Compare Cloudinary transformations list before/after (should not grow)

---

## 🚀 Next Steps (Future Phases)

**Phase 2 (v2):**
- Move originals to Supabase Storage / S3 / Backblaze
- Use Cloudinary only for derivatives
- Implement cleanup script for orphaned derivatives

**Phase 3 (v3):**
- User-selectable thumbnails (UI enhancement)
- Cloudinary transformation whitelist (API-level protection)
- Admin tools for derivative regeneration

---

## 📝 Files Changed

### New Files (3)
1. `scripts/012_add_media_derivatives.sql` - Database migration
2. `lib/actions/media-derivatives.ts` - Derivative generation logic
3. `PHASE-1-IMPLEMENTATION-SUMMARY.md` - This file

### Modified Files (8)
1. `lib/schemas.ts` - Added media_derivatives validation
2. `lib/actions/artifacts.ts` - Generate derivatives on create + include in queries
3. `lib/cloudinary.ts` - Complete rewrite with derivatives support
4. `components/artifact-card.tsx` - Pass derivatives to utility
5. `components/artifact-card-compact.tsx` - Pass derivatives to utility
6. `components/artifact-card-full.tsx` - Pass derivatives to utility
7. `components/artifact-detail-view.tsx` - Pass derivatives to utility

---

## 🎓 Key Architectural Decisions

1. **JSONB Map Structure:** Chose `{ url: derivatives }` format to align with existing AI metadata patterns (`image_captions`, `video_summaries`)
2. **URL Construction vs API Calls:** Generate URLs rather than making explicit Cloudinary API calls (Cloudinary generates derivatives on first request)
3. **Backwards Compatibility First:** All changes are non-breaking; old artifacts continue working
4. **Component Transparency:** Components don't need to know if derivatives are used - utility functions handle the logic
5. **Optional Parameter:** `mediaDerivatives?` parameter keeps function signatures compatible

---

## 🔍 Verification Commands

```bash
# TypeScript check
pnpm typecheck

# Run tests (note: existing test failures are pre-existing, not related to this change)
pnpm test

# Start dev server and test manually
pnpm dev

# Check database after creating artifact
# In Supabase SQL editor:
SELECT id, title, media_derivatives
FROM artifacts
ORDER BY created_at DESC
LIMIT 1;
```

---

## 🐛 Known Issues

None. Implementation is complete and ready for testing.

---

**Implementation Status:** ✅ COMPLETE
**Ready for:** Manual testing and database migration
**Deployment Blockers:** None (backwards compatible)
