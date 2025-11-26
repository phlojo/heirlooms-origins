# Heirlooms Media Architecture

_Last updated: 2025-11-25 – **Phase 1 Complete:** Media Pipeline v1 (Cloudinary originals + pre-generated derivatives)_

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

## 2. Current State (Phase 1 Implementation - Nov 2025)

> NOTE: This section describes how things **actually work today** after Phase 1 implementation.

**✅ Phase 1 Complete:** The app now implements predictable, controlled Cloudinary usage.

### 2.1 What we store

- **Cloudinary** for:
  - Uploading and storing original media files
  - Serving derivative transformations (thumb, medium, large)
- **Database** (`artifacts` table):
  - `media_urls` (array) - Original Cloudinary URLs in user's chosen order
  - `media_derivatives` (JSONB) - Pre-generated derivative URLs keyed by original URL:
    ```json
    {
      "https://res.cloudinary.com/.../image.jpg": {
        "thumb": "https://res.cloudinary.com/.../w_400,h_400,c_fill,q_auto,f_auto/.../image.jpg",
        "medium": "https://res.cloudinary.com/.../w_1024,c_limit,q_auto,f_auto/.../image.jpg",
        "large": "https://res.cloudinary.com/.../w_1600,c_limit,q_auto,f_auto/.../image.jpg"
      }
    }
    ```

### 2.2 How it works

1. **At artifact creation** (`lib/actions/artifacts.ts`):
   - Derivatives are generated as **constructed URLs** (not API calls)
   - Stored in `media_derivatives` column
   - Cloudinary generates actual derivatives on first request (lazy generation)

2. **In UI components**:
   - Components pass `artifact.media_derivatives` to utility functions
   - `lib/cloudinary.ts` utilities prioritize stored derivatives over dynamic generation
   - **Backwards compatible:** Falls back to dynamic transformation for old artifacts

3. **Transformation control**:
   - Only 3 derivative sizes per media item: thumb (400x400), medium (1024px), large (1600px)
   - **Predictable quota usage:** New artifacts create exactly 3 transformations per image
   - Old artifacts continue using dynamic transformations until backfilled (future task)

### 2.3 Problems solved

✅ **Controlled transformations:** New artifacts use exactly 3 derivatives per image
✅ **Predictable costs:** No unbounded transformation creation
✅ **Backwards compatible:** Old artifacts still work (fallback to dynamic generation)
✅ **Decoupled UI:** Components don't construct transformation URLs
✅ **Rollback ready:** Can revert safely if needed (see `ROLLBACK-GUIDE.md`)

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

## 5. Media Pipeline v1 (Phase 1 Implementation)

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

## 10. How to Use This Document

- When implementing new features (e.g. artifact gallery, collection filtering), treat this media model as the contract:
  - Only use the defined fields (`thumbUrl`, `mediumUrl`, `largeUrl`, `originalUrl`).
  - Do not introduce new ad-hoc transformation patterns in the UI.
- When refactoring:
  - Update the relevant sections (Media model, Pipeline, Cleanup, Conventions).
- When working with AI tools (Claude, ChatGPT, v0):
  - Link or paste the relevant sections so that code changes stay aligned with the media architecture.

