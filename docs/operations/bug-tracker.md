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
