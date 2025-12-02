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

## Test Results

```
Test Files: 20 passed | 1 skipped (21)
Tests:      558 passed | 14 skipped (572)
Duration:   19.65s
```

All tests pass with no regressions.
