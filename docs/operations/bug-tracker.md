# Bug Fixes Documentation

This file tracks critical bugs and their fixes to prevent regression in future development.

---

## Duplicate Images Bug (Fixed: November 2025)

### Symptoms
- After creating an artifact with multiple images, the view page would display the same image repeated multiple times (usually the last uploaded image)
- The edit page correctly showed all unique image thumbnails
- Database contained correct, unique URLs with no duplicates
- Console showed "0 duplicates removed" but images still appeared duplicated visually

### Root Cause
**React Hydration Error (#418)** caused by reading `localStorage` during initial component render in `components/artifact-swipe-wrapper.tsx`. This caused:
1. Server-rendered HTML to differ from client-rendered HTML
2. React to discard server HTML and re-render from scratch
3. State inconsistencies during re-render, causing duplicate image display
4. Component mounting twice with potentially stale/incorrect state

### Fix Applied
**File: `components/artifact-swipe-wrapper.tsx`**
- Moved `localStorage` read from initial state to `useEffect` hook
- Ensured server and client render identical HTML on initial load
- Prevented hydration mismatches that caused re-renders

**Before:**
\`\`\`tsx
const [showSwipeUI, setShowSwipeUI] = useState(
  () => localStorage.getItem('preferSwipeUI') === 'true' // ❌ Causes hydration error
)
\`\`\`

**After:**
\`\`\`tsx
const [showSwipeUI, setShowSwipeUI] = useState(false) // ✅ Server-safe default

useEffect(() => {
  setShowSwipeUI(localStorage.getItem('preferSwipeUI') === 'true')
}, [])
\`\`\`

### Prevention Guidelines
**⚠️ CRITICAL: Never access browser APIs during initial render in client components**

- ❌ **DO NOT** read `localStorage`, `sessionStorage`, or `window` in `useState` initializers
- ❌ **DO NOT** use `window.innerWidth`, `navigator.userAgent`, or similar in initial render
- ❌ **DO NOT** place `console.log()` statements inside JSX return statements
- ✅ **DO** use `useEffect` for all browser API access after component mounts
- ✅ **DO** provide server-safe defaults in `useState` (typically `false`, `null`, `''`, or `[]`)
- ✅ **DO** test for hydration errors in console when making changes to artifact view components

### Files to Watch
When modifying these files, ensure no hydration-causing code is introduced:
- `components/artifact-swipe-wrapper.tsx`
<!-- Updated file reference from artifact-swipe-content to artifact-detail-view -->
- `components/artifact-detail-view.tsx`
- `components/artifact-image-with-viewer.tsx`
- `app/artifacts/[id]/page.tsx`

### Testing
To verify this bug doesn't return:
1. Create an artifact with 3+ images
2. Navigate to the artifact view page
3. Check browser console for React hydration errors (#418)
4. Verify each image displays correctly (not duplicated)
5. Check that edit mode shows correct thumbnails

---

## Viewing Other Users' Artifacts Crashes (Fixed: November 2025)

### Symptoms
- Clicking an artifact card in a public collection showed error: "Something went wrong loading artifacts"
- Only affected artifacts created BEFORE the unified media model migration
- Artifacts created AFTER the migration worked fine
- Console error: `TypeError: Cannot read properties of null (reading 'public_url')`
- Error occurred at `lib/actions/media.ts:416`

### Root Cause
The `getArtifactMediaByRole()` function in `lib/actions/media.ts` queries `artifact_media` and joins with `user_media`. For old artifacts (pre-migration), the `artifact_media` table may have records but the corresponding `user_media` records don't exist (or the join returns `null`).

The code assumed `item.media` was always present and tried to access `media.public_url` on a `null` value:

```typescript
// BEFORE (crashed on null media)
const mediaWithDerivatives = (data || []).map((item) => {
  const media = item.media as UserMedia  // media could be null!
  return {
    ...item,
    media: {
      ...media,
      thumbnailUrl: getThumbnailUrl(media.public_url),  // Crash here
    },
  }
})
```

### Fix Applied
**File: `lib/actions/media.ts:409-427`**

Added a `.filter()` before `.map()` to remove items where the media join failed:

```typescript
// AFTER (handles null media gracefully)
const mediaWithDerivatives = (data || [])
  .filter((item) => item.media !== null)  // Filter out orphaned links
  .map((item) => {
    const media = item.media as UserMedia
    return {
      ...item,
      media: {
        ...media,
        thumbnailUrl: getThumbnailUrl(media.public_url),
      },
    }
  })
```

### Prevention Guidelines
When working with Supabase joins:
- Always check for null on joined relations before accessing properties
- Use `.filter()` to remove items with failed joins before mapping
- Consider that migrations may leave orphaned junction table records
- Do not assume joined relations always return data

### Related Changes
This fix also included updates to component prop types (see TypeScript Fixes below)

---

## TypeScript Type Errors in Tests (Fixed: November 2025)

### Symptoms
- `pnpm typecheck` failed with errors in `artifact-card.test.tsx` and `collection-card.test.tsx`
- Error: `Type 'null' is not assignable to type 'number | undefined'` for `year_acquired`
- Error: `Type 'null' is not assignable to type 'string | undefined'` for `cover_image`

### Root Cause
Test fixtures used `null` (which is what the database returns) but component prop types only accepted `undefined` for optional fields. This is a TypeScript strictness issue where `null` and `undefined` are different types.

### Fix Applied
Updated component prop types to accept `null` for database-sourced fields:

**File: `components/artifact-card.tsx`**
```typescript
// BEFORE
interface ArtifactCardProps {
  artifact: {
    description?: string
    year_acquired?: number
    origin?: string
  }
}

// AFTER
interface ArtifactCardProps {
  artifact: {
    description?: string | null
    year_acquired?: number | null
    origin?: string | null
  }
}
```

**File: `components/collection-card.tsx`**
```typescript
// BEFORE
interface CollectionCardProps {
  collection: {
    description?: string
    cover_image?: string
  }
}

// AFTER
interface CollectionCardProps {
  collection: {
    description?: string | null
    cover_image?: string | null
  }
}
```

### Additional Fixes
- **`lib/schemas.ts`**: Added missing `audio_transcripts` field to `updateArtifactSchema`
- **`lib/actions/artifacts.ts`**: Fixed Supabase join array access (`collection?.[0]?.slug` instead of `collection?.slug`)
- **`vitest.config.ts`**: Moved coverage thresholds to `thresholds` object (vitest v2+ syntax)
- **`__tests__/e2e/global.setup.ts`**: Exported `Page` type for E2E tests
- **`__tests__/e2e/ai-analysis.spec.ts`**: Added `Route` type annotations
- **`__tests__/mocks/supabase.mock.ts`**: Added `any` return type to mock factory

### Prevention Guidelines
- Use `| null` for any optional field that comes from the database
- Remember that PostgreSQL `NULL` becomes JavaScript `null`, not `undefined`
- Run `pnpm typecheck` before committing changes
- Do not assume database optional fields are `undefined`

---

## Image Shimmer Effect Stuck in Endless Loop (Fixed: November 2025)

### Symptoms
- Images displayed endless shimmer/skeleton animation instead of loading
- Shimmer effect never resolved, images never appeared
- Affected both `MediaImage` component and `GalleryImage` in artifact gallery
- More frequent with cached images or CORS scenarios

### Root Cause
The shimmer effect relied on the `onLoad` event to transition from loading state to loaded state. However, `onLoad` doesn't reliably fire in several scenarios:
1. Cached images (browser may not fire event for already-cached resources)
2. CORS issues preventing proper load detection
3. Race conditions where image loads before event listener attaches

The `isLoaded` state would remain `false`, keeping `opacity-0` on the image while shimmer remained visible.

### Fix Applied
**File: `components/media-image.tsx`**
Removed shimmer effect entirely. Images now render directly without loading state:

```tsx
// BEFORE (unreliable)
const [isLoaded, setIsLoaded] = useState(false)
return (
  <div className="relative">
    {!isLoaded && <div className="shimmer absolute inset-0" />}
    <img
      onLoad={() => setIsLoaded(true)}
      className={isLoaded ? "opacity-100" : "opacity-0"}
    />
  </div>
)

// AFTER (reliable)
return (
  <img
    src={imageSrc}
    onError={(e) => { e.currentTarget.src = fallbackSrc }}
  />
)
```

**File: `components/artifact-media-gallery.tsx`**
Simplified `GalleryImage` component similarly - removed shimmer state, renders `<img>` directly.

### Prevention Guidelines
- Avoid relying on `onLoad` events for critical UI state transitions
- If shimmer/skeleton loading is needed, use CSS-only solutions or intersection observer
- Test image loading with cached images, not just fresh loads
- Consider that browser caching behavior varies

### Files Modified
- `components/media-image.tsx`
- `components/artifact-media-gallery.tsx`

---

## Next.js Deprecation Warning: middlewareClientMaxBodySize (Fixed: November 2025)

### Symptoms
Console warning during development:
```
⚠ The "experimental.middlewareClientMaxBodySize" option has been deprecated.
Please use "experimental.proxyClientMaxBodySize" instead.
```

### Root Cause
Next.js 16 renamed the experimental config option.

### Fix Applied
**File: `next.config.mjs`**
```javascript
// BEFORE
experimental: {
  middlewareClientMaxBodySize: '100mb',
}

// AFTER
experimental: {
  proxyClientMaxBodySize: '100mb',
}
```

### Prevention Guidelines
- Check Next.js release notes when upgrading
- Address deprecation warnings promptly before they become errors

---

## Gallery Media Showing as Both Gallery Items AND Media Blocks (Fixed: November 2025)

### Symptoms
- When creating a new artifact and adding media to gallery via upload/import:
  - Media appeared correctly in gallery carousel
  - BUT the same media also appeared as separate media blocks below
- Only affected NEW uploads during artifact creation
- Adding existing media from library worked correctly

### Root Cause
**Two issues combined:**

1. **Missing required fields in `createUserMediaFromUrl`** (`lib/actions/media.ts`)
   - Insert to `user_media` table was silently failing
   - Missing fields: `mime_type`, `file_size_bytes`, `upload_source`
   - Supabase insert returned no error but record wasn't created

2. **URL mismatch after file reorganization** (`lib/actions/media-reorganize.ts`)
   - During artifact creation:
     - Files upload to temp folder: `temp/{userId}/{timestamp}-file.jpg`
     - `user_media` record created with temp URL
     - `artifact_media` link points to `user_media`
     - Artifact saved, `reorganizeArtifactMedia()` runs
     - Files moved to artifact folder (URLs change)
     - `artifact.media_urls` updated with new URLs
     - BUT `user_media.public_url` still had old temp URLs
   - On view page, URL comparison failed:
     - `artifact.media_urls` = new reorganized URLs
     - Gallery links (`artifact_media` → `user_media`) = old temp URLs
     - No match → media appeared in BOTH places

### Fix Applied

**File: `lib/actions/media.ts` - `createUserMediaFromUrl` function**
Added required fields with proper mime type detection:

```typescript
// BEFORE (missing required fields)
const { data, error } = await supabase
  .from("user_media")
  .insert({
    user_id: userId,
    filename,
    media_type: mediaType,
    public_url: url,
    storage_path: url,
  })

// AFTER (all required fields)
const { data, error } = await supabase
  .from("user_media")
  .insert({
    user_id: userId,
    filename,
    media_type: mediaType,
    mime_type: mimeType,        // Added
    file_size_bytes: 0,         // Added
    public_url: url,
    storage_path: url,
    upload_source: "gallery",   // Added
  })
```

**File: `lib/actions/media-reorganize.ts`**
Added `user_media` URL sync during file reorganization:

```typescript
// Track URL changes during move
const urlMapping: Map<string, string> = new Map() // old URL -> new URL

// After moving files, update user_media records
for (const [oldUrl, newUrl] of urlMapping) {
  await supabase
    .from("user_media")
    .update({
      public_url: newUrl,
      storage_path: newUrl,
    })
    .eq("public_url", oldUrl)
    .eq("user_id", user.id)
}
```

### Prevention Guidelines
- Always include all required database fields in inserts (check schema)
- When URLs change (file moves, reorganization), update ALL tables that reference them
- Test media flows with new uploads, not just existing library items
- Trace full flow: upload → save → reorganize → view

### Files Modified
- `lib/actions/media.ts` - Added required fields to `createUserMediaFromUrl`
- `lib/actions/media-reorganize.ts` - Added `user_media` URL update during reorganization

---

## Enhanced Orphaned Media Cleanup Script (November 2025)

### Background
The existing `scripts/cleanup-orphaned-media.ts` only checked the new media tables (`user_media`, `artifact_media`) but not legacy `artifacts.media_urls` arrays or JSONB metadata fields.

### Enhancement
Rewrote the script to comprehensively scan all media references:

1. **New media tables:**
   - `user_media` records where file returns 404
   - `artifact_media` links pointing to non-existent `user_media`

2. **Legacy artifacts table:**
   - `media_urls` arrays containing broken URLs
   - `thumbnail_url` pointing to broken URLs
   - `image_captions` JSONB keys (URLs) that are broken
   - `video_summaries` JSONB keys (URLs) that are broken
   - `audio_transcripts` JSONB keys (URLs) that are broken

3. **Performance:**
   - URL caching to avoid redundant HEAD requests
   - Batch processing with progress indicators

### Usage
```bash
# Dry run (identify orphans, no changes)
npx tsx scripts/cleanup-orphaned-media.ts

# Actually delete orphaned records
npx tsx scripts/cleanup-orphaned-media.ts --delete
```

### File Modified
- `scripts/cleanup-orphaned-media.ts` - Complete rewrite

---

## Back Button on New Artifact Page Always Goes to /artifacts (Fixed: November 2025)

### Symptoms
- Creating a new artifact from a collection page
- Clicking the back button always navigated to `/artifacts` instead of the collection page
- Expected behavior: return to the page you came from

### Root Cause
The back button had a hardcoded `href="/artifacts"` instead of tracking the originating page.

### Fix Applied
**File: `app/artifacts/new/page.tsx`**
Added `returnTo` query parameter handling:

```typescript
// Read returnTo parameter from URL
const { collectionId, returnTo } = await searchParams
const safeReturnTo = returnTo?.startsWith("/") ? returnTo : "/artifacts"

// Back button uses the safe return URL
<Link href={safeReturnTo}>
```

**File: `app/collections/[slug]/page.tsx`**
Added `returnTo` to the "Add Artifact" link:

```typescript
<Link href={`/artifacts/new?collectionId=${collection.id}&returnTo=/collections/${slug}`}>
```

### Prevention Guidelines
- When linking to creation/edit pages, include `returnTo` parameter with the current URL
- Validate `returnTo` starts with "/" to prevent open redirect vulnerabilities
- Provide sensible default fallback (e.g., `/artifacts`)

---

## Media Remove vs Delete Confusion (Fixed: November 2025)

### Symptoms
- Users confused about what happens when clicking trash icon on media blocks
- No clear distinction between:
  - Removing media from current artifact (media stays in library)
  - Permanently deleting media from storage (removes from ALL artifacts)

### Solution
Created a two-option modal for media actions:

**New Component: `components/media-action-modal.tsx`**
- "Remove from artifact" - Just removes from current artifact's media blocks, media stays in library
- "Delete permanently" - Deletes from storage AND removes from ALL artifacts across ALL collections

**New Server Action: `lib/actions/media.ts` - `permanentlyDeleteMedia()`**
```typescript
export async function permanentlyDeleteMedia(mediaUrl: string) {
  // 1. Delete from Supabase Storage or Cloudinary
  // 2. Delete user_media record (cascades to artifact_media)
  // 3. Remove from ALL artifacts.media_urls arrays
  // 4. Clean up AI metadata (captions, summaries, transcripts)
}
```

**UI Changes:**
- Changed media block button from trash icon to MoreVertical (⋮) icon
- Clicking opens `MediaActionModal` with two clear options
- Applied to both `new-artifact-form.tsx` and `artifact-detail-view.tsx`

### Files Modified
- `components/media-action-modal.tsx` (NEW)
- `lib/actions/media.ts` - Added `permanentlyDeleteMedia()` function
- `components/new-artifact-form.tsx` - Use modal instead of direct remove
- `components/artifact-detail-view.tsx` - Use modal instead of direct remove

---

## Gallery and Media Blocks Independence (Fixed: November 2025)

### Symptoms
- Same media couldn't exist in both gallery AND media blocks
- Removing from gallery caused item to appear as media block (or vice versa)
- Unexpected behavior when managing media placement

### Background
Gallery and media blocks serve different purposes:
- **Gallery**: "Attract slideshow" - visual hero display
- **Media Blocks**: "Detail and story" - inline content with future comments/threads

Same media should be able to exist in both or either.

### Root Cause
1. Media blocks were filtered to exclude gallery URLs
2. `removeArtifactMediaLink` was also removing from `artifacts.media_urls`
3. Gallery changes were syncing to `editMediaUrls` state

### Fix Applied
**File: `components/artifact-detail-view.tsx`**
- Removed filter that excluded gallery URLs from media blocks
- Media blocks now show ALL URLs in `artifacts.media_urls`

**File: `lib/actions/media.ts` - `removeArtifactMediaLink()`**
- Now ONLY deletes from `artifact_media` table
- Does NOT modify `artifacts.media_urls` array
- Gallery and media blocks are truly independent

### Data Model Clarification
- `artifacts.media_urls`: Array of ALL media for this artifact (used by media blocks)
- `artifact_media` table: Links for gallery display (subset of media_urls)
- Same URL can exist in both - they're independent views

### Files Modified
- `components/artifact-detail-view.tsx`
- `lib/actions/media.ts`

---

## Navigation Icons Semantics (Fixed: November 2025)

### Issue
Arrow icons (ArrowLeft/ArrowRight) were used for artifact-to-artifact navigation within collections, but arrows semantically represent page/structure navigation.

### Fix Applied
Changed to StepBack/StepForward icons which better represent "stepping through items in a sequence":

**File: `components/artifact-sticky-nav.tsx`**
```typescript
// BEFORE
import { ArrowLeft, ArrowRight } from "lucide-react"

// AFTER
import { StepBack, StepForward } from "lucide-react"
```

**File: `components/swipe-guidance.tsx`**
Same icon replacement for the bottom navigation widget.

### Icon Semantics
- **Arrows (←/→)**: Page navigation, breadcrumbs, back to parent
- **Step icons (⏮/⏭)**: Within-sequence navigation, prev/next item in collection

---

## Edit Artifact Cancel Not Cleaning Up Uploaded Media (Fixed: November 2025)

### Symptoms
- Upload new media during artifact edit
- Click Cancel
- Media files remain in storage (orphaned)
- Only cleaned up after 24-hour expiration + daily audit

### Root Cause
- `new-artifact-form.tsx` properly called `cleanupPendingUploads()` on cancel
- `artifact-detail-view.tsx` (edit mode) did NOT call cleanup on cancel
- `updateArtifact()` properly marks uploads as saved on successful save
- Gap: Cancel during edit left orphaned uploads

### Fix Applied

**File: `components/artifact-detail-view.tsx`**

1. Added state to track newly uploaded URLs during edit session:
```typescript
const [pendingUploadUrls, setPendingUploadUrls] = useState<string[]>([])
```

2. Track uploads in `handleMediaAdded`:
```typescript
const handleMediaAdded = async (newUrls: string[]) => {
  // ... existing code ...

  // Track newly uploaded URLs for cleanup on cancel
  const originalUrls = artifact.media_urls || []
  const trulyNewUrls = newUrls.filter(url => !originalUrls.includes(url))
  if (trulyNewUrls.length > 0) {
    setPendingUploadUrls(prev => [...prev, ...trulyNewUrls])
  }
}
```

3. Cleanup on cancel:
```typescript
const confirmCancel = async () => {
  // Clean up any newly uploaded media that wasn't saved
  if (pendingUploadUrls.length > 0) {
    console.log("[v0] CANCEL EDIT - Cleaning up", pendingUploadUrls.length, "pending uploads")
    await cleanupPendingUploads(pendingUploadUrls)
  }
  // ... redirect ...
}
```

**File: `lib/actions/pending-uploads.ts`**

Updated `cleanupPendingUploads()` to accept optional specific URLs:
```typescript
// BEFORE
export async function cleanupPendingUploads() {
  // Cleaned up ALL pending uploads for user
}

// AFTER
export async function cleanupPendingUploads(specificUrls?: string[]) {
  // If specificUrls provided, only clean those
  // Otherwise, clean ALL pending uploads for user
}
```

### Media Cleanup Flow Summary

| Scenario | Cleanup Method |
|----------|----------------|
| New artifact - Save | `createArtifact()` removes from `pending_uploads` |
| New artifact - Cancel | `cleanupPendingUploads()` deletes files + removes from table |
| Edit artifact - Save | `updateArtifact()` removes newly uploaded from `pending_uploads` |
| Edit artifact - Cancel | `cleanupPendingUploads(specificUrls)` deletes new files |
| Navigate away | 24hr expiration + daily audit cron catches orphans |

### Files Modified
- `components/artifact-detail-view.tsx` - Track and cleanup pending uploads on cancel
- `lib/actions/pending-uploads.ts` - Accept optional URL filter parameter

---

## Delete Artifact Modal with Media Preservation Option (November 2025)

### Background
Previously, deleting an artifact always permanently deleted all associated media from storage. Users had no option to keep media for reuse in other artifacts.

### Solution
Created a two-option modal (similar to the media block remove/delete pattern) that lets users choose:

1. **Keep media in library** (default) - Delete the artifact record but preserve media files in storage for reuse
2. **Delete media permanently** - Delete artifact AND permanently remove all media from storage

### Implementation

**New Component: `components/delete-artifact-modal.tsx`**
- Two-option selection UI matching `MediaActionModal` pattern
- "Keep media in library" selected by default
- Clear descriptions of what each option does
- Warning text updates based on selection

**Updated Server Action: `lib/actions/artifacts.ts` - `deleteArtifact()`**

Added `deleteMedia` parameter (defaults to `true` for backward compatibility):

```typescript
export async function deleteArtifact(artifactId: string, deleteMedia: boolean = true)
```

When `deleteMedia = false`:
- Only deletes the artifact record from database
- Media files remain in Supabase Storage/Cloudinary
- `user_media` records preserved for reuse
- Gallery links (`artifact_media`) cascade-deleted with artifact

When `deleteMedia = true`:
- Collects ALL media URLs from both `artifacts.media_urls` (media blocks) AND `artifact_media` table (gallery)
- Deletes media files from storage (Supabase/Cloudinary)
- Deletes `user_media` records (cascades to `artifact_media`)
- **Cleans up OTHER artifacts** that reference the same media:
  - Removes URL from `artifacts.media_urls` arrays
  - Updates `thumbnail_url` if it was the deleted media
  - Cleans up AI metadata (`image_captions`, `video_summaries`, `audio_transcripts`)
  - Revalidates affected artifact pages

### Comprehensive Cleanup for Permanent Delete

When permanently deleting media, the system ensures no broken references remain:

| Location | Cleanup Action |
|----------|----------------|
| Storage (Supabase/Cloudinary) | Files deleted |
| `user_media` table | Record deleted |
| `artifact_media` table | Cascade-deleted via `user_media` FK |
| Other artifacts' `media_urls` | URL removed from arrays |
| Other artifacts' `thumbnail_url` | Auto-selects new thumbnail |
| Other artifacts' AI metadata | Entries for URL deleted |

### UI Changes

**File: `components/artifact-detail-view.tsx`**
- Replaced inline `AlertDialog` in Danger Zone with `DeleteArtifactModal`
- Updated `handleDeleteArtifact` to accept `deleteMedia` boolean
- Help text updated to remove "all media will be lost" (now depends on user choice)

### Usage Flow

1. User clicks "Delete Artifact" button in Danger Zone
2. Modal opens with two options (Keep media / Delete permanently)
3. "Keep media in library" is pre-selected
4. User can switch selection if they want to delete media
5. User clicks "Delete Artifact" to confirm
6. System performs cleanup based on selection

### Files Modified
- `components/delete-artifact-modal.tsx` (NEW)
- `lib/actions/artifacts.ts` - Added `deleteMedia` parameter with full cleanup logic
- `components/artifact-detail-view.tsx` - Integrated new modal

---
## Small Thumbnail Derivative (120x120) Added (November 2025)

### Background
Media picker and gallery reorder cards were using 400x400 thumbnails which:
- Loaded unnecessary data for small UI elements
- Showed inconsistent crops on iOS vs desktop

### Solution
Added new `smallThumbnailUrl` derivative (120x120) to the media system.

### Changes

**File: `lib/cloudinary.ts`**
Added `getSmallThumbnailUrl()` function:
```typescript
export function getSmallThumbnailUrl(url: string, mediaDerivatives?: Record<string, MediaDerivatives> | null): string {
  // Returns 120x120 cropped thumbnail via Cloudinary fetch
}
```

**File: `lib/types/media.ts`**
Added to `UserMediaWithDerivatives`:
```typescript
export interface UserMediaWithDerivatives extends UserMedia {
  smallThumbnailUrl?: string  // 120x120 cropped (for pickers, reorder cards)
  thumbnailUrl?: string       // 400x400 cropped
  // ... other derivatives
}
```

**File: `lib/actions/media.ts`**
- `getUserMediaLibrary()` now includes `smallThumbnailUrl`
- `getArtifactMediaByRole()` now includes `smallThumbnailUrl`

**Files Updated:**
- `components/media-picker.tsx` - Uses `smallThumbnailUrl` for grid
- `components/artifact-gallery-editor.tsx` - Uses `smallThumbnailUrl` for reorder cards

---

## Thumbnail Selection from Gallery Items (November 2025)

### Feature
Gallery items can now be selected as artifact thumbnail, same as media blocks.

### Changes

**File: `components/artifact-gallery-editor.tsx`**
- Added `currentThumbnailUrl` and `onSelectThumbnail` props
- Gallery items display BookImage icon for thumbnail selection
- Current thumbnail shows yellow ring highlight

**File: `components/artifact-detail-view.tsx`**
- Added `getNextAvailableThumbnail()` helper function
- When current thumbnail is removed/deleted, auto-selects next available from:
  1. Gallery items (in order)
  2. Media blocks (in order)
- Both `handleRemoveMedia()` and `handlePermanentlyDeleteMedia()` use this logic

**File: `lib/actions/media.ts` - `permanentlyDeleteMedia()`**
- Now queries gallery media to find replacement thumbnail
- Considers both gallery and media blocks when auto-selecting

---

## Media Picker Unable to Select Items (Fixed: November 2025)

### Symptoms
- Media picker showed thumbnails but clicking items didn't select them
- Only items already in the artifact could be selected
- Console showed 400/404 errors for Cloudinary thumbnail URLs

### Root Cause
1. `style={{ display: media.thumbnailUrl ? "block" : "none" }}` hid items without thumbnailUrl
2. `onError` handler marked items as broken when thumbnail generation failed
3. Audio files naturally don't have Cloudinary image thumbnails (400 errors)
4. Some legacy Cloudinary images returned 404

### Fix Applied

**File: `components/media-picker.tsx`**
- Removed conditional `display` style that hid items
- Renamed `brokenMediaIds` to `failedThumbnailIds`
- Items with failed thumbnails now show fallback icon instead of being hidden:
  - Images: ImageIcon placeholder
  - Videos: Video icon fallback
  - Audio: Music icon (already worked)

---

## Duplicate Key Constraint on Gallery Sort Order (Fixed: November 2025)

### Symptoms
Adding media to gallery failed with:
```
duplicate key value violates unique constraint "unique_artifact_media_order"
```

### Root Cause
- Unique constraint exists on `(artifact_id, role, sort_order)`
- When adding to gallery, `sort_order` was calculated from `galleryMedia.length`
- After removing items, gaps existed in sort_order sequence
- New items got conflicting sort_order values

### Fix Applied

**File: `lib/actions/media.ts`**

`createArtifactMediaLink()`:
- Now queries for current max `sort_order` before insert
- Always calculates next available: `max_sort_order + 1`
- Ignores any provided `sort_order` value

`createArtifactMediaLinks()`:
- Same fix - queries max first, increments for each insert

**File: `components/artifact-gallery-editor.tsx`**
- Removed explicit `sort_order` from `createArtifactMediaLink` calls
- Let server calculate the value

---

## Edit Gallery Now Matches New Gallery (Fixed: November 2025)

### Symptoms
- New artifact: "Edit Gallery" opened AddMediaModal (Upload New OR Select Existing)
- Edit artifact: "Edit Gallery" opened MediaPicker (Select Existing ONLY)
- Inconsistent user experience

### Fix Applied

**File: `components/artifact-gallery-editor.tsx`**
- Changed from `MediaPicker` to `AddMediaModal`
- Added `userId` prop for upload support
- Updated `handleAddMedia` to work with URLs instead of `UserMediaWithDerivatives`
- Gallery items added via upload now work the same as on new artifact page

---

## Gallery/Media Blocks Independence on New Artifact Page (Fixed: November 2025)

### Symptoms
- On new artifact page, adding media to gallery also showed as media blocks
- Adding media to media blocks also showed in gallery
- Edit artifact page worked correctly, but new artifact had this issue

### Root Cause
The form combined gallery and media block URLs:

```typescript
// BEFORE - Combined all URLs
useEffect(() => {
  const combinedUrls = [...galleryUrls, ...mediaBlockUrls]
  form.setValue("media_urls", normalizeMediaUrls(combinedUrls))
}, [galleryUrls, mediaBlockUrls])
```

And `createArtifact` fell back to all visual media for gallery if `gallery_urls` was empty:
```typescript
// BEFORE - Fallback added everything to gallery
const galleryUrls = validatedFields.data.gallery_urls?.length > 0
  ? validatedFields.data.gallery_urls
  : validMediaUrls.filter(url => isImageUrl(url) || isVideoUrl(url))  // BAD
```

### Fix Applied

**File: `components/new-artifact-form.tsx`**
```typescript
// AFTER - Only media block URLs go to media_urls
useEffect(() => {
  form.setValue("media_urls", normalizeMediaUrls(mediaBlockUrls))
}, [mediaBlockUrls])
```

Also updated `onSubmit()`:
- Validation now accepts gallery OR media blocks (not requiring both)
- `gallery_urls` passed separately to `createArtifact`

**File: `lib/actions/artifacts.ts`**
```typescript
// AFTER - No fallback, gallery_urls must be explicit
const galleryUrls = validatedFields.data.gallery_urls || []
```

Also updated pending upload cleanup to include both gallery and media block URLs.

### Data Flow Now

| New Artifact Page | Storage |
|-------------------|---------|
| Gallery section | `gallery_urls` → `artifact_media` table |
| Media Blocks section | `media_urls` → `artifacts.media_urls` array |

These are now truly independent:
- Same media can exist in both
- Adding to one doesn't affect the other
- Removing from one doesn't affect the other

---

## Media Action Modal Text Update (November 2025)

### Change
Updated remove button text in `MediaActionModal` for clarity.

**File: `components/media-action-modal.tsx`**
```typescript
// BEFORE
"Remove from artifact"

// AFTER
"Remove Media Block from this artifact"
```

---

## Thumbnail Selection Single-Click Fix (November 2025)

### Symptoms
- Selecting a new thumbnail from media blocks required two taps
- First tap appeared to deselect, second tap selected

### Fix Applied
Added `stopPropagation()` and `preventDefault()` to prevent event bubbling:

**File: `components/artifact-detail-view.tsx`**
```typescript
const handleSelectThumbnail = (url: string, e?: React.MouseEvent) => {
  e?.stopPropagation()
  e?.preventDefault()
  setEditThumbnailUrl(url)
}
```

Updated all thumbnail button click handlers to pass the event.

**File: `components/artifact-gallery-editor.tsx`**
Updated type signatures and click handlers similarly.

---

## AI Metadata Lost After Save (Fixed: November 2025)

### Symptoms
- Generate captions/summaries on new artifact page - they show correctly in UI
- Save artifact
- View/edit artifact - captions/summaries are missing
- Database shows AI metadata exists but with wrong URL keys

### Root Cause
When saving an artifact, `reorganizeArtifactMedia()` moves files from temp folder to artifact folder, changing the URLs. The function updated `artifact.media_urls` with new URLs, but did NOT update the AI metadata JSONB fields.

AI metadata is keyed by URL:
```json
{
  "image_captions": {
    "https://...temp/file.jpg": "A beautiful sunset..."  // OLD temp URL
  }
}
```

After reorganization, `media_urls` had the new URL but `image_captions` still had the old temp URL as the key - no match.

### Fix Applied

**File: `lib/actions/media-reorganize.ts`**

Added AI metadata key updates to reorganization:

```typescript
// Fetch AI metadata fields
const { data: artifact } = await supabase
  .from("artifacts")
  .select("id, media_urls, user_id, image_captions, video_summaries, audio_transcripts, thumbnail_url")
  .eq("id", artifactId)
  .single()

// Update AI metadata keys when URLs change
if (artifact.image_captions && Object.keys(artifact.image_captions).length > 0) {
  const updatedCaptions: Record<string, string> = {}
  for (const [oldUrl, caption] of Object.entries(artifact.image_captions)) {
    const newUrl = urlMapping.get(oldUrl) || oldUrl
    updatedCaptions[newUrl] = caption as string
  }
  updateData.image_captions = updatedCaptions
}

// Same for video_summaries, audio_transcripts, thumbnail_url
```

### Prevention Guidelines
- When moving/renaming media files, update ALL places that reference the URL
- AI metadata JSONB fields use URLs as keys - remember to update them
- Test AI features end-to-end: generate → save → view

---

## Media Blocks Not Appearing in Media Picker (Fixed: November 2025)

### Symptoms
- Upload new media to Media Blocks on new artifact page
- Click "Edit Gallery" → "Select Existing"
- The media you just uploaded is NOT in the picker
- After saving artifact, media appears in picker

### Root Cause
`AddMediaModal` uploaded files and tracked them in `pending_uploads`, but did NOT create `user_media` records. Media Picker queries `user_media` table, so newly uploaded media was invisible.

`user_media` records were only created when `createArtifact()` was called (after save).

### Fix Applied

**File: `components/add-media-modal.tsx`**

Create `user_media` record immediately after upload:

```typescript
// After trackPendingUpload()
const mediaResult = await createUserMediaFromUrl(secureUrl, userId)
if (mediaResult.error) {
  console.warn("[v0] Failed to create user_media record (non-fatal):", mediaResult.error)
} else {
  console.log("[v0] Created user_media record for:", secureUrl)
}
```

Applied to both file uploads and audio recordings.

### Related Fix: Cleanup Removes user_media

**File: `lib/actions/pending-uploads.ts`**

When user cancels and uploads are cleaned up, also remove the `user_media` records:

```typescript
// After deleting from storage and pending_uploads
if (deletedUrls.length > 0) {
  await supabase
    .from("user_media")
    .delete()
    .in("public_url", deletedUrls)
    .eq("user_id", user.id)
}
```

Prevents orphaned `user_media` records with broken URLs.

---

## Cron Job Updated for Supabase Storage (November 2025)

### Background
The daily cleanup cron (`/api/cleanup-expired-uploads`) only handled Cloudinary deletions and didn't clean up orphaned `user_media` records.

### Updates Applied

**File: `app/api/cleanup-expired-uploads/route.ts`**

1. **Handles both storage backends:**
```typescript
if (isSupabaseStorageUrl(upload.url)) {
  result = await deleteFromSupabaseStorage(upload.url)
} else {
  result = await deleteCloudinaryMedia(upload.publicId, 'image')
}
```

2. **Cleans up orphaned user_media:**
```typescript
if (successfullyDeletedUrls.length > 0) {
  await supabase
    .from("user_media")
    .delete()
    .in("public_url", successfullyDeletedUrls)
    .select("id")
}
```

3. **Updated response format:**
```json
{
  "cleanup": {
    "deletedFromStorage": 2,
    "deletedFromDatabase": 3,
    "deletedUserMedia": 2,
    "failedDeletions": 0
  }
}
```

### Schedule
- **Cron:** `0 0 * * *` (daily at midnight UTC)
- **Config:** `vercel.json`

---

## UI Terminology Update (November 2025)

### Change
Standardized terminology for media management:
- **Media** = All uploadable items (images, videos, audio)
- **Gallery** = Media added to hero slideshow
- **Blocks** = Media added as inline media blocks

### Updates
- "Add Media" button next to Media Blocks → "Add Block(s)"
- Applied to both new artifact (`new-artifact-form.tsx`) and edit artifact (`artifact-detail-view.tsx`) pages

