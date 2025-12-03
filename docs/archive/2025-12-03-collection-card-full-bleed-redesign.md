# Collection Card Full-Bleed Redesign

**Date**: 2025-12-03
**Status**: Complete
**Branch**: `collection-thumbs-bug-fix`

## Problem

Collection cards on iOS Safari had a bug where thumbnails didn't extend to the right edge of the card. This was caused by the interaction between `aspect-ratio` and `max-height` CSS properties.

### Root Cause

The previous implementation used:
```css
aspect-[3/2] sm:aspect-[4/2] max-h-[240px] sm:max-h-none
```

On iOS Safari, when `max-height` caps the height, the browser recalculates width based on the aspect ratio, causing the thumbnail to shrink instead of filling 100% width. Desktop Chrome DevTools simulation doesn't reproduce this iOS-specific behavior.

## Solution

Instead of patching the bug, we redesigned the card to use a **full-bleed thumbnail** with an **overlaid text section** - a pattern similar to Netflix/Pinterest cards.

### Before (Stacked Layout)
```
┌─────────────────────┐
│                     │
│     Thumbnail       │  ← ends here
│     (aspect ratio)  │
│                     │
├─────────────────────┤
│  Title              │  ← text section starts here
│  Description        │
│  Author / Count     │
└─────────────────────┘
```

### After (Full-Bleed + Overlay)
```
┌─────────────────────┐
│                     │
│   Full-bleed        │  ← absolute inset-0, fills entire card
│   Thumbnail         │
│                     │
│ ┌─────────────────┐ │
│ │ Title  [badges] │ │  ← absolute bottom-0, translucent bg
│ │ Count           │ │
│ └─────────────────┘ │
└─────────────────────┘
```

## Implementation

### Collection Card Changes (`components/collection-card.tsx`)

**Card Container:**
```tsx
// Before
<Card className="group overflow-hidden border transition-all hover:shadow-lg p-0 animate-fade-in">
  <div className="relative aspect-[3/2] sm:aspect-[4/2] overflow-hidden bg-muted max-h-[240px] sm:max-h-none">

// After
<Card className="group overflow-hidden border transition-all hover:shadow-lg p-0 animate-fade-in relative aspect-[4/3] sm:aspect-[3/2]">
```

**Thumbnail Layer:**
```tsx
// Before: Nested in aspect-ratio container
<div className="h-full transition-transform group-hover:scale-105">
  <CollectionThumbnailGrid ... />
</div>

// After: Absolute positioned, fills entire card
<div className="absolute inset-0 transition-transform group-hover:scale-105">
  <CollectionThumbnailGrid ... />
</div>
```

**Text Overlay:**
```tsx
// Before: Separate section below thumbnail
<div className="p-3 sm:p-4 space-y-2 opacity-100">

// After: Absolute positioned at bottom with translucent background
<div className="absolute inset-x-0 bottom-0 bg-background/70 backdrop-blur-sm p-3 sm:p-4 space-y-1.5">
```

### Homepage "Add Collection" Card (`components/homepage/logged-in-homepage.tsx`)

Updated to match new card structure:
```tsx
<Card className="... relative aspect-[4/3] sm:aspect-[3/2] ...">
  {/* Icon centered in card */}
  <div className="absolute inset-0 flex items-center justify-center">
    <LayoutGrid className="h-16 w-16 ..." />
  </div>
  {/* Text overlay at bottom */}
  <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4">
    ...
  </div>
</Card>
```

## Design Decisions

### Aspect Ratios
- **Mobile**: `aspect-[4/3]` - Slightly taller, more thumbnail visible
- **Desktop**: `aspect-[3/2]` - Wider, matches landscape displays

### Text Overlay Styling
- **Background**: `bg-background/70` - 70% opacity for readability while showing thumbnail
- **Blur**: `backdrop-blur-sm` - Subtle blur effect for depth
- **Padding**: `p-3 sm:p-4` - Consistent with other cards

### Removed Elements
- **Description**: Removed from card overlay (was cluttering the compact space)
- **Author info**: Still shown in "all" mode at bottom of overlay

### Preserved Behaviors
- Hover zoom effect on thumbnail (`group-hover:scale-105`)
- Private/Unsorted badges
- Tooltip on unsorted badge
- Link navigation

## Benefits

1. **No iOS Safari bug** - Aspect ratio on card container, not nested thumbnail
2. **Better visual design** - Full-bleed images are more engaging
3. **Consistent heights** - Fixed aspect ratio = predictable grid layout
4. **Modern pattern** - Matches Netflix, Pinterest, App Store cards
5. **More thumbnail visible** - Text doesn't take away from image real estate

## Files Changed

| File | Changes |
|------|---------|
| `components/collection-card.tsx` | Full redesign to overlay pattern |
| `components/homepage/logged-in-homepage.tsx` | "Add Collection" card matching structure |

## Testing

### Visual Testing
- [x] Desktop Chrome - Cards render correctly
- [x] Desktop Firefox - Cards render correctly
- [x] iOS Safari - Thumbnails extend full width (bug fixed)
- [x] Dark mode - Overlay readable in both themes
- [x] Hover effects - Zoom transition works smoothly

### Automated Tests
Existing collection card tests in `__tests__/components/ui/collection-card.test.tsx` should pass (primarily test rendering, not layout).

## Related

- [Card Design Updates](../guides/card-design-updates.md) - Artifact card patterns
- [iOS Safari Scroll Fixes](2025-11-27-ios-safari-scroll-fixes.md) - Previous iOS fixes
- [Homepage Rebuild](2025-12-03-logged-in-homepage-rebuild.md) - Homepage changes
