# Homepage UX Improvements

**Date**: 2025-12-02
**Branch**: `homepage-ux-improve`
**Status**: Complete

## Summary

Improved both logged-in and logged-out homepage experiences with visual polish, better user engagement cues, and consistent design patterns. Key changes include stat card background images, carousel improvements, and icon consistency with bottom navigation.

## Changes Made

### Logged-In Homepage (`components/homepage/logged-in-homepage.tsx`)

#### Header Section
- Title: "Heirlooms (Beta)" with styled beta indicator
- Welcome: "Welcome back, {username}" with blue pill badge
- Logout button added next to theme toggle (mobile only, `lg:hidden`)

#### Stat Cards
- Reduced padding (`px-3 py-2` for compact appearance)
- Random artifact images as backgrounds (15% opacity)
- Icons: `Package` (artifacts), `LayoutGrid` (collections)

#### Recent Artifacts
- Increased from 6 to 9 artifacts
- Added "Add Artifact" card with dashed border at end
- Muted "View all" buttons (`text-muted-foreground hover:text-foreground`)

#### Start Something New
- 2x2 grid layout
- Icons: `LayoutGrid` (Create Collection), `Users` (Explore Community)

### Logged-Out Homepage (`components/homepage/logged-out-homepage.tsx`)

#### Hero Section
- Button colors swapped:
  - "Create Your First Artifact" → primary (blue)
  - "Start Your First Collection" → purple (`bg-purple-600`)
- Background opacity increased to 20%

#### Randomization
- Fixed unreliable `Array.sort(() => Math.random() - 0.5)` with Fisher-Yates shuffle

### Data Layer (`app/page.tsx`)

- `recentArtifacts` limit: 6 → 9
- New `statBackgrounds` object for stat card images
- Media filtering: images and videos only (no audio)

### Carousel/Cards

#### `components/artifacts-carousel.tsx`
- Added `items-start` to flex container (prevents card stretching)

#### `components/artifact-card-compact.tsx`
- Removed `h-full` (prevents unnecessary height stretching)

## Files Modified

| File | Changes |
|------|---------|
| `components/homepage/logged-in-homepage.tsx` | Header, stats, carousel, icons |
| `components/homepage/logged-out-homepage.tsx` | Buttons, opacity, shuffle |
| `app/page.tsx` | Data fetching, statBackgrounds |
| `components/artifacts-carousel.tsx` | Flex alignment |
| `components/artifact-card-compact.tsx` | Height fix |

## Interface Changes

```typescript
// Added to LoggedInHomepageProps
statBackgrounds?: {
  artifacts: string | null
  collections: string | null
}
```

## Technical Notes

### Fisher-Yates Shuffle
```typescript
const shuffledMedia = [...allVisualMedia]
for (let i = shuffledMedia.length - 1; i > 0; i--) {
  const j = Math.floor(Math.random() * (i + 1))
  ;[shuffledMedia[i], shuffledMedia[j]] = [shuffledMedia[j], shuffledMedia[i]]
}
```

### Media Type Filtering
```typescript
import { isImageUrl, isVideoUrl } from "@/lib/media"

if (isImageUrl(url) || isVideoUrl(url)) {
  allVisualMedia.push(url)
}
```

### Card Alignment
```tsx
// Carousel container
<div className="flex items-start overflow-x-auto ...">
```

## Additional Session Changes

### Spacing & Layout Refinements

#### Hero Section
- Reduced top padding from `py-16 md:py-24 lg:py-32` to `py-8 md:py-12 lg:py-16`
- Reduced carousel padding from `py-8` to `py-4`
- Reduced "How It Works" top spacing to `pt-2 md:pt-4`

#### Secondary CTAs
- "See How It Works" changed to outline button
- Added "or" separator and inline "Login" button
- Buttons now on same row: `[See How It Works] or [Login]`

#### Interactive Subheading
- Added bold jump links for "collections", "artifacts", "stories"
- `#showcase-collections` and `#showcase-artifacts` scroll targets
- `/stories` link for stories

#### How It Works Cards
- Added background images (15% opacity) from public artifacts
- Added bottom gradient overlay (50% opacity, black to transparent)

#### Built For Section
- Font size matched to other headings (`text-2xl md:text-3xl lg:text-4xl`)
- 2x2 grid on mobile (`grid-cols-2`)
- Reduced card padding (`p-3 md:p-6`)

#### Final CTA
- Font size matched to other headings

### Desktop Width Constraint

Added consistent `max-w-7xl` (1280px) across all pages:

- **Logged-out homepage**: Per-section constraint with full-width backgrounds
- **AppLayout**: Main content area constrained

### Carousel Edge Fades

Added CSS mask gradients to `ArtifactsCarousel`:

```tsx
maskImage: "linear-gradient(to right, transparent, black 2rem, black calc(100% - 2rem), transparent)"
```

Cards now fade at edges instead of being cut abruptly.

### Compact Card Height

- Reduced title line clamp from 5 to 2 lines (`line-clamp-2`)
- Tighter padding (`pt-1 pb-1.5`)
- Compact carousel padding (`pb-1` instead of `pb-4`)

### Bug Fix: Cloudinary URL Length Limit

**Problem**: Images with long filenames (>200 chars) fail Cloudinary fetch with "public_id is too long" error.

**Root Cause**: iOS device filenames include UUIDs and metadata, combined with our path structure.

**Solution** (2 parts):
1. **Prevention**: Truncate filenames to 40 chars during upload (`lib/actions/supabase-storage.ts`)
2. **Fallback**: Skip Cloudinary fetch for URLs >200 chars, return original Supabase URL (`lib/cloudinary.ts`)

## Additional Files Modified

| File | Changes |
|------|---------|
| `components/app-layout.tsx` | Added `max-w-7xl mx-auto` to main |
| `components/community-showcase.tsx` | Changed to `max-w-7xl` |
| `lib/actions/supabase-storage.ts` | Filename truncation |
| `lib/cloudinary.ts` | URL length check fallback |

## Test Results

```
Test Files: 20 passed | 1 skipped (21)
Tests:      558 passed | 14 skipped (572)
Duration:   19.65s
```

All tests pass with no regressions.
