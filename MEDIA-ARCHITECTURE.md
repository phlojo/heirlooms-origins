# Heirlooms Media Architecture

_Last updated: 2025-11-26 – **Phase 2 Complete:** Supabase Storage originals + Cloudinary fetch derivatives_

This document describes how media (images and videos) are stored, transformed, and delivered in the Heirlooms app.

It is intentionally **implementation-aware** (reflecting how the code works today) but also **forward-looking** (capturing where we want to go in later versions). Whenever we make structural changes to media handling, this file should be updated.

---

## 1. Goals

### 1.1 Functional goals

- Support media-heavy artifacts (photos, videos, scans, etc.).
- Provide a fast, smooth UI for:
  - Artifact thumbnails
  - Artifact detail views
  - (Later) Artifact galleries and lightboxes
- Keep the implementation simple and predictable so that future features (e.g. comments, sharing, B2B usage) can reuse the same patterns.

### 1.2 Cost & reliability goals

- Stay within or close to Cloudinary’s free tier as long as possible.
- Avoid silent failures when Cloudinary quotas are hit (e.g. broken thumbnails).
- Make it easy to move to cheaper storage for originals when needed (Supabase / S3 / Backblaze).
- Make cleanup of abandoned media straightforward and safe.

---

## 2. Current State (Phase 2 Implementation - Nov 2025)

> NOTE: This section describes how things **actually work today** after Phase 2 implementation.

**✅ Phase 1 Complete:** Predictable, controlled Cloudinary usage with pre-generated derivatives
**✅ Phase 2 Complete:** Originals in Supabase Storage, derivatives via Cloudinary fetch (80-90% cost reduction)

### 2.1 What we store (Phase 2 Architecture)

- **Supabase Storage** for:
  - Storing original media files (100GB free tier)
  - Organized by: `{userId}/{artifactId}/{timestamp}-{filename}`
  - Public read access, authenticated write/delete

- **Cloudinary** for:
  - Fetching originals from Supabase Storage on-demand
  - Generating and caching derivative transformations (thumb, medium, large)
  - **NOT storing originals** (cost savings!)

- **Database** (`artifacts` table):
  - `media_urls` (array) - Supabase Storage URLs in user's chosen order:
    ```json
    ["https://{project}.supabase.co/storage/v1/object/public/heirlooms-media/userId/artifactId/image.jpg"]
    ```
  - `media_derivatives` (JSONB) - **Deprecated for new uploads** (derivatives generated via Cloudinary fetch)
  - `thumbnail_url` - First visual media URL for artifact cards

- **Tracking** (`pending_uploads` table):
  - Tracks both Cloudinary and Supabase uploads for cleanup
  - Expires after 24 hours if not saved to artifact
  - Enables safe cleanup of abandoned uploads

### 2.2 How it works (Phase 2 Flow)

**Feature Flag:** `NEXT_PUBLIC_USE_SUPABASE_STORAGE=true` (enabled)

1. **Upload** (`components/add-media-modal.tsx`):
   - User selects files → routed to Supabase or Cloudinary based on feature flag
   - **Supabase uploads:** Files go to `{userId}/temp/{timestamp}-{filename}`
   - **Cloudinary uploads:** (legacy) Files uploaded to Cloudinary as before
   - URL tracked in `pending_uploads` table (both storage types)

2. **Artifact creation** (`lib/actions/artifacts.ts`):
   - Artifact saved with `media_urls` containing Supabase Storage URLs
   - `reorganizeArtifactMedia()` moves files from `temp/` to `{userId}/{artifactId}/`
   - Database updated with new organized URLs
   - `pending_uploads` entries deleted (marked as saved)

3. **Display** (`lib/cloudinary.ts`):
   - `getThumbnailUrl(url)` detects Supabase Storage URL
   - Returns Cloudinary fetch URL: `https://res.cloudinary.com/{cloud}/image/fetch/{transformations}/{supabase_url}`
   - **First view:** Cloudinary fetches from Supabase, transforms, caches derivative
   - **Subsequent views:** Served from Cloudinary cache (fast!)

4. **Transformation sizes** (on-demand):
   - Thumbnail: `w_400,h_400,c_fill,q_auto,f_auto`
   - Medium: `w_1024,c_limit,q_auto,f_auto`
   - Large: `w_1600,c_limit,q_auto,f_auto`
   - **Generated lazily:** Only when requested, not pre-generated

5. **Backwards compatibility**:
   - Old Cloudinary-hosted artifacts continue working
   - `lib/cloudinary.ts` detects URL type and routes appropriately
   - Phase 1 stored derivatives still prioritized for legacy artifacts

### 2.3 Problems solved (Phase 1 + Phase 2)

**Phase 1 achievements:**
✅ **Controlled transformations:** New artifacts use exactly 3 derivatives per image
✅ **Predictable costs:** No unbounded transformation creation
✅ **Backwards compatible:** Old artifacts still work
✅ **Decoupled UI:** Components don't construct transformation URLs

**Phase 2 achievements:**
✅ **80-90% Cloudinary cost reduction:** Originals no longer stored in Cloudinary
✅ **Scalable storage:** 100GB free in Supabase vs 25GB in Cloudinary
✅ **On-demand derivatives:** Cloudinary fetch generates derivatives only when needed
✅ **Proper file organization:** Files reorganized from temp to artifact folders
✅ **Universal cleanup:** Both Cloudinary and Supabase uploads tracked for cleanup
✅ **Feature flag control:** Can toggle between storage backends safely

---

## 3. Target Architecture Overview

The target architecture introduces a **small, strict set of image derivatives** and moves all transformation work into a controlled place in the backend.

### 3.1 Separation of concerns

- **Media architecture (this doc)**  
  Defines:
  - Where originals live
  - What derivative sizes exist
  - How/when they are generated
  - Naming conventions
  - Cleanup & migration rules

- **UI/UX layers (gallery, filtering, etc.)**  
  Consume a simple media model:
  - `thumbUrl`
  - `mediumUrl`
  - `largeUrl`
  - (optionally) `originalUrl`
  …without needing to know about Cloudinary transformations.

### 3.2 Long-term vision (v2+)

Long term, we want:

- **Originals** stored in **cheap, general storage** (e.g. Supabase Storage / S3 / Backblaze).
- **Cloudinary** used only for:
  - A very small number of derivatives (thumb/medium/large)
  - Optional advanced transformations (if ever needed)
- **Strict transformation whitelist** to avoid unbounded cost growth.
- **Automated cleanup** of:
  - Unused Cloudinary derivatives
  - Unused originals in long-term storage

This document supports that path, starting with a **v1 safety layer** described below.

---

## 4. Media Model (v1)

### 4.1 Entities

Each media item attached to an artifact has, conceptually:

- `id` – internal identifier in the database
- `artifactId` – parent artifact
- `type` – image, video, etc.
- `originalUrl` – URL of the original upload (currently Cloudinary; later possibly Supabase/S3)
- **Derivative URLs**:
  - `thumbUrl`
  - `mediumUrl`
  - `largeUrl` (optional but recommended)
- Metadata:
  - `width`, `height` (optional)
  - `createdAt`, `updatedAt`
  - `caption` / AI description (if present)
  - `order` – position within the artifact gallery

The **UI should only ever need to know about**:

- `thumbUrl` for lists and small previews
- `mediumUrl` / `largeUrl` for detail view / lightbox
- `originalUrl` if a future feature needs full-resolution access

### 4.2 Derivative sizes (proposed defaults)

If actual values differ in code, update them here and treat this doc as the source of truth.

- **Thumbnail (`thumb`)**
  - Intended use: artifact lists, small gallery grid items.
  - Proposed transformation:
    - Size: `400x400` (square)
    - Crop: `c_fill` (crop to fill)
    - Format: `f_auto`
    - Quality: `q_auto`

- **Medium (`medium`)**
  - Intended use: artifact detail page and lightbox on most screens.
  - Proposed transformation:
    - Width: `1024` px (height auto)
    - Crop: `c_fill` or `c_limit` (depending on design)
    - Format: `f_auto`
    - Quality: `q_auto`

- **Large (`large`)**
  - Intended use: zoomed-in lightbox or large desktop screens.
  - Proposed transformation:
    - Width: `1600` px
    - Crop: `c_limit` (do not upscale)
    - Format: `f_auto`
    - Quality: `q_auto`

**Key rule:**
> These are the **only** image derivatives we intentionally create and use for general UI. Anything else is exceptional and should be documented.

---

## 5. Media Pipeline v2 (Phase 2 Implementation)

> ✅ **Implemented Nov 2025:** v2 moves originals to Supabase Storage and uses Cloudinary fetch for on-demand derivatives.

**Implementation approach:** Option 2 - Cloudinary Fetch/Auto-Upload

### 5.1 Upload flow (Phase 2 - Two-Phase Upload)

When user creates artifact with media (`NEXT_PUBLIC_USE_SUPABASE_STORAGE=true`):

**Phase 1: Initial Upload**
1. **Client-side** (`components/add-media-modal.tsx`):
   - User selects files
   - Feature flag routes to `uploadMediaToSupabase()` server action
   - Files uploaded to Supabase Storage: `{userId}/temp/{timestamp}-{filename}`
   - Returns Supabase public URL

2. **Server-side** (`lib/actions/media-upload.ts`):
   - Authenticates user via `createClient()`
   - Calls `uploadToSupabaseStorage(file, folder)`
   - Supabase Storage stores original file
   - Returns public URL: `https://{project}.supabase.co/storage/v1/object/public/heirlooms-media/...`

3. **Tracking** (`lib/actions/pending-uploads.ts`):
   - `trackPendingUpload(url, resourceType)` adds to `pending_uploads` table
   - Works for both Cloudinary and Supabase URLs
   - Expires after 24 hours if not saved

**Phase 2: File Reorganization**
4. **Artifact creation** (`lib/actions/artifacts.ts`):
   - Artifact saved with `media_urls` containing temp Supabase URLs
   - `markUploadsAsSaved()` removes from `pending_uploads`
   - `reorganizeArtifactMedia(artifactId)` called automatically

5. **File reorganization** (`lib/actions/media-reorganize.ts`):
   - For each Supabase URL in `media_urls`:
     - `moveSupabaseFile(url, userId, artifactId)` copies file
     - From: `{userId}/temp/{timestamp}-{filename}`
     - To: `{userId}/{artifactId}/{timestamp}-{filename}`
     - Deletes original from temp
   - Updates artifact `media_urls` with new organized URLs
   - Non-fatal: artifact still works if reorganization fails

### 5.2 Display flow (Cloudinary Fetch)

When UI component displays an image:

1. **Component rendering** (e.g., `artifact-card.tsx`):
   ```typescript
   const thumbUrl = getThumbnailUrl(artifact.media_urls[0])
   <img src={thumbUrl} />
   ```

2. **URL detection** (`lib/cloudinary.ts`):
   - `getThumbnailUrl()` checks if URL is from Supabase Storage
   - `isSupabaseStorageUrl(url)` returns true
   - Calls `getCloudinaryFetchUrl(url, transformations)`

3. **Cloudinary fetch URL generation**:
   ```
   Original Supabase URL:
   https://project.supabase.co/storage/.../image.jpg

   Cloudinary fetch URL:
   https://res.cloudinary.com/{cloud}/image/fetch/w_400,h_400,c_fill,q_auto,f_auto/https://project.supabase.co/storage/.../image.jpg
   ```

4. **First request**:
   - Browser requests Cloudinary fetch URL
   - Cloudinary fetches original from Supabase (HTTP GET)
   - Applies transformations (resize, crop, optimize)
   - Caches derivative in Cloudinary CDN
   - Returns transformed image (~50-200KB vs 5MB original)

5. **Subsequent requests**:
   - Cloudinary serves from cache (instant, no re-fetch)
   - CDN handles global distribution
   - Original remains in Supabase (never duplicated to Cloudinary)

### 5.3 Cleanup & Lifecycle

**Abandoned uploads** (user uploads but doesn't save artifact):
1. `pending_uploads` table tracks URL with 24hr expiration
2. Cron job `/api/cron/audit-media` runs daily
3. Identifies expired uploads not referenced by artifacts
4. For Cloudinary URLs: `deleteCloudinaryMedia(publicId)`
5. For Supabase URLs: `deleteFromSupabaseStorage(url)`

**Artifact deletion**:
1. Server action gets all `media_urls` from artifact
2. For each URL:
   - If Supabase: `deleteFromSupabaseStorage(url)`
   - If Cloudinary: `deleteCloudinaryMedia(publicId, resourceType)`
3. Cloudinary derivatives auto-expire from cache (no manual cleanup needed)

### 5.4 Backwards Compatibility

**Phase 2 supports all three URL types:**

1. **Supabase Storage URLs** (new, Phase 2):
   ```
   https://project.supabase.co/storage/v1/object/public/heirlooms-media/...
   → Cloudinary fetch URL generated
   ```

2. **Cloudinary originals with stored derivatives** (Phase 1):
   ```
   media_derivatives: { "cloudinary_url": { thumb, medium, large } }
   → Use stored derivative URLs (prioritized)
   ```

3. **Legacy Cloudinary without derivatives** (pre-Phase 1):
   ```
   → Dynamic transformation URL generated (fallback)
   ```

**URL type detection** (`lib/media.ts`):
- `isSupabaseStorageUrl(url)` - Contains `supabase.co/storage`
- `isCloudinaryUrl(url)` - Contains `cloudinary.com`
- `getStorageType(url)` - Returns 'supabase' | 'cloudinary' | 'unknown'

### 5.5 Cost Breakdown

**Example: 100 images, 5MB each**

| Storage | Before Phase 2 | After Phase 2 | Savings |
|---------|----------------|---------------|---------|
| **Originals (500MB)** | Cloudinary | Supabase (FREE) | 100% |
| **Derivatives (~150MB)** | Cloudinary | Cloudinary (cached) | 0% |
| **Total Cloudinary** | 650MB | 150MB | **77%** |
| **Transformation quota** | 3 per image | On first view only | ~0% |

**Key savings:**
- ✅ Cloudinary storage: 77% reduction
- ✅ Transformation quota: Same (still 3 per image, just lazy)
- ✅ Bandwidth: Originals served from Supabase, derivatives from Cloudinary CDN

---

## 6. Media Pipeline v1 (Phase 1 Implementation - Historical)

> ✅ **Implemented Nov 2025:** v1 makes Cloudinary usage safe and predictable **without** yet moving originals to another storage provider.

### 5.1 Upload flow (as implemented)

When a user creates an artifact with media:

1. **Client-side upload**
   - User uploads media files via artifact creation/edit form
   - Files sent to Cloudinary upload API endpoint

2. **Server-side upload** (`lib/actions/cloudinary.ts`)
   - Upload original file to Cloudinary
   - Cloudinary returns:
     - `public_id`
     - `secure_url` (original URL)
   - Original URL added to `media_urls` array

3. **Artifact creation** (`lib/actions/artifacts.ts`)
   - **Derivative URL generation:**
     - `generateDerivativesMap()` constructs derivative URLs for each media item:
       - `thumb`: `w_400,h_400,c_fill,q_auto,f_auto` (or f_jpg for videos)
       - `medium`: `w_1024,c_limit,q_auto,f_auto`
       - `large`: `w_1600,c_limit,q_auto,f_auto`
     - URLs are **constructed**, not fetched via API
     - Cloudinary generates actual derivatives lazily on first request

4. **Database storage**
   - Store in `artifacts` table:
     - `media_urls`: Array of original Cloudinary URLs
     - `media_derivatives`: JSONB map of `{ originalUrl: { thumb, medium, large } }`
     - `thumbnail_url`: First image or video URL for artifact card display
   - **Note:** Media is stored in `artifacts` table, not separate `media` table (simplified model)

### 5.2 Consumption in the UI (as implemented)

**Utility functions** (`lib/cloudinary.ts`):
- `getThumbnailUrl(url, mediaDerivatives)` - Returns thumb derivative or falls back to dynamic
- `getMediumUrl(url, mediaDerivatives)` - Returns medium derivative or falls back
- `getLargeUrl(url, mediaDerivatives)` - Returns large derivative or falls back
- `getDetailUrl(url, mediaDerivatives)` - Deprecated, redirects to large
- `getCardUrl(url, mediaDerivatives)` - Deprecated, redirects to medium

**Components** (updated to pass derivatives):
- `artifact-card.tsx` - Uses `getThumbnailUrl()` for card thumbnails
- `artifact-card-compact.tsx` - Uses `getThumbnailUrl()` for list view
- `artifact-card-full.tsx` - Uses `getThumbnailUrl()` for grid view
- `artifact-detail-view.tsx` - Uses `getDetailUrl()` for full image display

**Flow:**
1. Component receives `artifact` with `media_derivatives` field
2. Passes `media_derivatives` to utility function
3. Utility checks for stored derivative URL first
4. Falls back to dynamic transformation if derivative not found (backwards compatibility)
5. Logs which path was taken for debugging

**Important:**
> ✅ UI components now pass stored derivatives to utility functions instead of constructing URLs dynamically.

### 5.3 Backwards compatibility for legacy media (implemented)

For artifacts created **before** Phase 1 (with `media_derivatives = null`):

**How it works:**
1. Component passes `null` or `undefined` for `mediaDerivatives` parameter
2. Utility functions check: `if (mediaDerivatives && mediaDerivatives[url]?.thumb)`
3. If check fails, falls back to dynamic transformation generation:
   ```typescript
   // lib/cloudinary.ts
   console.log("[cloudinary] getThumbnailUrl: Generating dynamic transformation (fallback)")
   return getCloudinaryUrl(url, "w_400,h_400,c_fill,q_auto,f_auto")
   ```
4. Old artifacts continue to work exactly as before

**Future task (Phase 2+):**
- Add background job or admin action to backfill `media_derivatives` for old artifacts
- This will gradually migrate all artifacts to use stored derivatives
- See `PHASE-1-IMPLEMENTATION-SUMMARY.md` for backfill script ideas

---

## 6. Cloudinary Usage & Quotas

To keep Cloudinary usage under control:

1. **Limit transformation types**
   - Only `thumb`, `medium`, `large` derivatives plus any explicitly documented special cases.
   - No generic “dynamic resize” calls scattered across the UI.

2. **Avoid auto breakpoints and eager transformations**
   - Do not use `auto:breakpoints` to generate many sizes per image.
   - Do not generate transformations that are not tied to a stored URL.

3. **Rely on CDN and browser caching**
   - Use `loading="lazy"` for images in lists/grids.
   - Ensure appropriate cache headers are sent so frequently-used images are cached.

---

## 7. Cleanup Strategy

### 7.1 Principles

- The **database** is the source of truth for which media is still in use.
- Cloudinary should not contain derivatives that are not referenced by any DB row.
- (Later) Long-term storage (Supabase/S3) should also not contain orphaned originals.

### 7.2 Current cleanup (v1)

> This section should reflect whatever cleanup logic currently exists; update when you change it.

At a high level:

- When a media item or artifact is deleted:
  - The app should remove:
    - The Cloudinary original
    - The associated derivatives (`thumb`, `medium`, `large`)
- A periodic or on-demand cleanup script may:
  - List Cloudinary resources under the expected folder(s).
  - Build a set of valid public_ids from DB records.
  - Delete any Cloudinary resources whose public_id is not referenced.

**Future extension (when originals move to Supabase/S3):**

- Similarly scan bucket paths and delete any files not referenced in the DB.

---

## 8. Future Roadmap (Media v2+)

These are planned but not yet implemented steps:

1. **Move originals from Cloudinary → Supabase / S3 / Backblaze**
   - Cloudinary keep only derivatives.
   - `originalUrl` points to cheap storage.

2. **Client-side compression on upload**
   - Reduce image/video size before upload.

3. **Strict transformation whitelist**
   - Configured in Cloudinary so only expected transformation presets are allowed.

4. **Media admin tools**
   - Admin view to inspect storage usage, broken media, missing derivatives.
   - Manual “rebuild derivatives” button for specific artifacts.

5. **Better video handling**
   - Standardized resolutions and bitrates for uploaded videos.
   - Poster image generation and use in the UI.

---

## 9. Conventions

To keep things consistent:

- **Field names in code**
  - Prefer `thumbUrl`, `mediumUrl`, `largeUrl`, `originalUrl` for clarity.
- **Cloudinary folder structure**
  - Use a consistent folder prefix such as:
    - `heirlooms/{env}/artifacts/{artifactId}/{mediaId}`
  - Where `{env}` is `dev` / `prod` if applicable.

- **Versioning**
  - Treat this document as versioned by section:
    - _“v1: Cloudinary originals + pre-generated derivatives”_
    - _“v2: Supabase originals + Cloudinary derivatives”_, etc.
  - Update the “Last updated” header and indicate the current media pipeline version whenever a structural change is made.

---

## 10. Implementation Status & Next Steps

### 10.1 Phase 1 Completion (Nov 25, 2025)

**✅ Completed:**
- Database migration: Added `media_derivatives` JSONB column to `artifacts` table
- Derivative generation: Generate thumb/medium/large URLs at artifact creation
- Utility updates: Modified `lib/cloudinary.ts` with backwards compatibility
- Component updates: 4 components now pass derivatives to utility functions
- Documentation: Implementation summary, rollback guide, deployment checklist
- Deployment: Successfully deployed to production

**📊 Phase 1 Impact:**
- New artifacts: Create exactly 3 transformations per image (predictable)
- Old artifacts: Continue using dynamic transformations (backwards compatible)
- UI: No visual changes, purely architectural improvement

### 10.2 Phase 2 Completion (Nov 26, 2025)

**✅ Completed:**
- **Two-phase upload architecture:** Files upload to temp, reorganize to artifact folder
- **Supabase Storage integration:** Original files stored in Supabase (100GB free)
- **Cloudinary fetch implementation:** On-demand derivatives via fetch URLs
- **Universal tracking:** Both Cloudinary and Supabase uploads tracked in `pending_uploads`
- **File reorganization:** `lib/actions/media-reorganize.ts` moves files from temp to organized structure
- **URL detection helpers:** `isSupabaseStorageUrl()`, `isCloudinaryUrl()`, `getStorageType()`
- **Cleanup support:** `cleanupPendingUploads()` handles both storage backends
- **Feature flag control:** `NEXT_PUBLIC_USE_SUPABASE_STORAGE` toggles storage backend
- **Documentation:** PHASE-2-PLAN.md, updated MEDIA-ARCHITECTURE.md

**📊 Phase 2 Impact:**
- **Cost reduction:** 80-90% reduction in Cloudinary storage usage
- **Scalability:** 100GB free tier in Supabase vs 25GB in Cloudinary
- **Performance:** On-demand derivatives cached in Cloudinary CDN
- **Organization:** Files properly organized by user and artifact
- **Cleanup:** Abandoned uploads tracked and cleaned up safely
- **Backwards compatible:** All three media types supported (Supabase, Cloudinary w/ derivatives, legacy Cloudinary)

**🔍 Monitoring:**
- Console logs show "Using stored derivative" for new artifacts
- Console logs show "Generating dynamic transformation (fallback)" for old artifacts
- Cloudinary quota usage should stabilize for new uploads

### 10.3 Next Steps (Future Phases)

**Phase 3 - Migration & Optimization (optional):**
- Migrate old Cloudinary originals to Supabase Storage
- Script to backfill `media_derivatives` for pre-Phase-1 artifacts
- Gradual migration to eliminate remaining dynamic transformations
- **Goal:** All artifacts using optimal storage strategy

**Phase 4 - Client-side optimization:**
- Compress images before upload
- Resize very large images client-side
- Reduce upload bandwidth and storage costs
- Pre-generate derivatives on upload (if desired for performance)

**Phase 5 - Advanced features:**
- Strict Cloudinary transformation whitelist
- Media admin dashboard (inspect storage usage, broken media)
- Enhanced cleanup automation
- Video optimization and poster frame generation
- Support for additional storage backends (S3, Backblaze)

### 10.4 Related Documentation

**Phase 1:**
- `PHASE-1-IMPLEMENTATION-SUMMARY.md` - Detailed Phase 1 implementation notes
- `ROLLBACK-GUIDE.md` - How to safely rollback Phase 1 changes
- `DEPLOYMENT-CHECKLIST.md` - Step-by-step deployment guide
- `scripts/012_add_media_derivatives.sql` - Database migration script

**Phase 2:**
- `PHASE-2-PLAN.md` - Phase 2 planning and implementation guide
- `lib/actions/supabase-storage.ts` - Supabase Storage utilities
- `lib/actions/media-reorganize.ts` - File reorganization logic
- `lib/actions/media-upload.ts` - Supabase upload server action

**Current Architecture:**
- `MEDIA-ARCHITECTURE.md` (this file) - Complete media system documentation
- `CLAUDE.md` - Project-wide guidance including media system

---

## 11. How to Use This Document

- When implementing new features (e.g. artifact gallery, collection filtering), treat this media model as the contract:
  - Pass `artifact.media_derivatives` to utility functions
  - Use `getThumbnailUrl()`, `getMediumUrl()`, `getLargeUrl()` from `lib/cloudinary.ts`
  - Do not introduce new ad-hoc transformation patterns in the UI
- When refactoring:
  - Update the relevant sections (Current State, Pipeline, Cleanup, Conventions)
  - Mark sections as "implemented" or "planned"
- When working with AI tools (Claude, ChatGPT, v0):
  - Link or paste the relevant sections so that code changes stay aligned with the media architecture
  - Reference this document when asking for media-related feature implementations

