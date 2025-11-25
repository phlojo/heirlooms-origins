# Heirlooms Media Architecture

_Last updated: 2025-11-25 – Media Pipeline v1 (Cloudinary originals + pre-generated derivatives)_

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

## 2. Current State (Baseline Mental Model)

> NOTE: This section should describe how things actually work **today**. Update it when you change the pipeline.

At the time of this writing, the app:

- Uses **Cloudinary** for:
  - Uploading original files
  - Generating on-the-fly transformations for thumbnails and resized images
- Uses **the database** to:
  - Store at least one Cloudinary URL or public_id per media item
- Has some logic to:
  - Delete/cleanup unused Cloudinary media when artifacts/media records are removed

Problems with this baseline:

- **Too many unique transformations**:
  - Dynamic `w_XXX,h_YYY,...` URLs can create new Cloudinary transformations per usage.
- **Unpredictable cost / quota usage**:
  - Every new size or crop counts as a new transformation.
- **Risk of broken UI** when hitting Cloudinary limits:
  - Thumbnails or resized images may fail to generate.
- **Tightly coupled UI and transformation logic**:
  - Components may embed Cloudinary transformation strings directly.

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

## 5. Media Pipeline v1 (Cloudinary-first with Safety Layer)

> v1 focuses on making Cloudinary usage safe and predictable **without** yet moving originals to another storage provider.

### 5.1 Upload flow

When a user uploads a media file (image/video) to an artifact:

1. **Client-side (optional, later)**
   - (Future enhancement) Basic compression:
     - Resize very large images down to a maximum dimension (e.g., 2000–3000 px).
     - Reduce file size to a reasonable target (e.g., 1.5–2 MB for most images).

2. **Server-side**
   - Upload the original file to Cloudinary.
   - Cloudinary returns:
     - `public_id`
     - `secure_url` (original)

3. **Derivative generation (critical step)**
   - Immediately create **thumb**, **medium**, and optionally **large** variants using Cloudinary’s API.
   - Save their URLs (or public_ids) into the database as:
     - `thumbUrl`
     - `mediumUrl`
     - `largeUrl`
   - These derivatives are created **once** at upload time, not on the fly.

4. **Database record**
   - Store:
     - `originalUrl` (Cloudinary)
     - `thumbUrl`
     - `mediumUrl`
     - `largeUrl`
     - Metadata (type, order, etc.)

### 5.2 Consumption in the UI

- **Artifact list / collection views**
  - Always use `thumbUrl`.
- **Artifact detail / gallery grid**
  - Use `thumbUrl` in the grid.
- **Lightbox / full image view**
  - Use `mediumUrl` by default.
  - Optionally use `largeUrl` for zoom or large desktop displays.

**Important:**  
> The UI should not construct new Cloudinary transformation URLs dynamically. It should rely on the URLs stored in the database.

### 5.3 Backwards compatibility for legacy media

For media created **before** v1 derivatives exist:

- If `thumbUrl` / `mediumUrl` / `largeUrl` are missing:
  - Fallback to the original Cloudinary URL or existing transformation pattern.
  - Consider adding a background job or admin action to gradually generate missing derivatives for older media.

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

