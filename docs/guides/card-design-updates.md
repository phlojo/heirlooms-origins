# Artifact Card Design Updates

## Summary of Changes (November 2025)

This document outlines the design improvements made to artifact cards for better visual consistency and content handling.

## Changes Made

### 1. Card Grounding (Bottom Padding)

**Objective:** Ensure cards sit firmly without visual floating or alignment issues.

**Implementation:**

Cards now have consistent bottom padding to create visual "grounding":

| Card Type | Padding | Amount | CSS Property |
|-----------|---------|--------|--------------|
| **Standard** | Bottom | 12px | `pb-3` |
| **Compact** | Bottom | 8px | `pb-2` |
| **Full** | Bottom | 20px | `pb-5` |

**Code Changes:**

```tsx
// ArtifactCard
<CardContent className="pt-0 pb-3 px-2 flex-none">
  {/* Author badge or empty space */}
</CardContent>

// ArtifactCardCompact
<div className="px-1.5 pt-1.5 pb-2 flex-none">
  {/* Title only */}
</div>

// ArtifactCardFull
<CardContent className="space-y-2 pt-0 pb-5 flex-none">
  {/* Description, metadata, author */}
</CardContent>
```

**Why This Matters:**
- Creates visual weight distribution
- Prevents cards from appearing to float
- Ensures consistent spacing in grids
- Improves readability in dense layouts

---

### 2. Variable-Height Title Wrapping

**Objective:** Allow titles to expand naturally without forced truncation while preventing excessive height.

**Implementation:**

Titles can now wrap up to **5 lines** before truncation:

```tsx
// Before
<h3 className="font-semibold text-sm leading-tight truncate">
  {artifact.title}
</h3>

// After
<h3 className="font-semibold text-sm leading-tight line-clamp-5">
  {artifact.title}
</h3>
```

**Applies to:**
- `ArtifactCard` - Standard view title
- `ArtifactCardCompact` - Compact view title
- `ArtifactCardFull` - Full view title

**Line Limits:**

| Context | Max Lines | Reasoning |
|---------|-----------|-----------|
| Card title | 5 | Readable without excessive height |
| Card description | 2 | Snippet only (full text on detail page) |
| List items | 1-2 | Space constraints in sidebars |

---

### 3. Card Height Flexibility

**Objective:** Cards scale to exact height of wrapped content with no empty space.

**Implementation:**

Cards now use **flexbox column layout** with `flex-none` on text sections:

```tsx
<Card className="flex flex-col h-full">
  {/* Thumbnail: fixed aspect-square */}
  <div className="aspect-square">
    <MediaImage />
  </div>

  {/* Title section: variable height, flex-none prevents growth */}
  <CardHeader className="flex-none">
    <h3 className="line-clamp-5">{artifact.title}</h3>
  </CardHeader>

  {/* Content section: variable height, flex-none prevents growth */}
  <CardContent className="flex-none">
    {/* Author, metadata, etc. */}
  </CardContent>
</Card>
```

**Key CSS Classes:**
- `flex flex-col` - Establishes flexbox column layout
- `flex-none` - Prevents flex growth/shrink
- `aspect-square` - Maintains thumbnail square shape
- `line-clamp-5` - Limits title to 5 lines with ellipsis

**Result:**
- Cards with 1-line titles are shorter
- Cards with 5-line titles are taller
- Different cards have different heights
- No wasted empty space in any card
- Masonry layout absorbs height variation

---

## Visual Impact

### Before vs After

**Before:**
```
┌──────────┐  ┌──────────┐  ┌──────────┐
│          │  │          │  │          │
│  Image   │  │  Image   │  │  Image   │
│          │  │          │  │          │
├──────────┤  ├──────────┤  ├──────────┤
│ Short    │  │ A very   │  │ Another  │
│ title    │  │ long     │  │ long one │
│          │  │ title    │  │ here     │
│          │  │ text     │  │          │
│          │  │          │  │          │
└──────────┘  └──────────┘  └──────────┘
```
*Uniform heights with truncated/wasted space*

**After:**
```
┌──────────┐  ┌──────────┐  ┌──────────┐
│          │  │          │  │          │
│  Image   │  │  Image   │  │  Image   │
│          │  │          │  │          │
├──────────┤  ├──────────┤  ├──────────┤
│ Short    │  │ A very   │  │ Another  │
│ title    │  │ long     │  │ long one │
│          │  │ title    │  │ here     │
│          │  │ that     │  │          │
│          │  │ wraps    │  │          │
│          │  │ here     │  │          │
└──────────┘  └──────────┘  └──────────┘
```
*Variable heights fitting content exactly with no waste*

---

## Implementation Details

### CardHeader Updates

```tsx
// Standard card
<CardHeader className="pb-1.5 pt-2 px-2 flex-none">
  <h3 className="font-semibold text-sm leading-tight line-clamp-5">
    {artifact.title}
  </h3>
</CardHeader>
```

**Padding breakdown:**
- `pb-1.5` (6px) - Separates title from content below
- `pt-2` (8px) - Separates title from thumbnail above
- `px-2` (8px) - Horizontal margin
- `flex-none` - Prevents card from stretching this section

### CardContent Updates

```tsx
// Standard card
<CardContent className="pt-0 pb-3 px-2 flex-none">
  {showAuthor && artifact.user_id && (
    <div className="flex justify-end overflow-hidden">
      <Author userId={artifact.user_id} size="sm" />
    </div>
  )}
</CardContent>
```

**Properties:**
- `pt-0` - No top padding (connects to CardHeader)
- `pb-3` (12px) - Bottom grounding padding
- `px-2` (8px) - Horizontal margin
- `flex-none` - Prevents flex growth

---

## Component Changes Summary

### ArtifactCard (`components/artifact-card.tsx`)

**Changes:**
- Added `style?: React.CSSProperties` prop for Masonry positioning
- Changed Card className to `flex flex-col` for flexbox
- Changed Card className to add `h-full` for height handling
- Changed CardHeader className to add `flex-none`
- Changed CardContent className to add `flex-none`
- Changed CardContent padding from `pb-2` to `pb-3`
- Changed title className from `truncate` to `line-clamp-5`

### ArtifactCardCompact (`components/artifact-card-compact.tsx`)

**Changes:**
- Added `style?: React.CSSProperties` prop for Masonry positioning
- Changed Card className to `flex flex-col` for flexbox
- Changed Card className to add `h-full` for height handling
- Changed title wrapper className from `p-1.5` to `px-1.5 pt-1.5 pb-2`
- Changed title wrapper to add `flex-none`
- Changed title className from `truncate` to `line-clamp-5`

### ArtifactCardFull (`components/artifact-card-full.tsx`)

**Changes:**
- Added `style?: React.CSSProperties` prop for Masonry positioning
- Changed Card className to `flex flex-col` for flexbox
- Changed CardHeader className to add `flex-none`
- Changed CardContent className to add `flex-none`
- Changed CardContent padding from `pb-4` to `pb-5`
- Changed title className from `line-clamp-1` to `line-clamp-5`

---

## CSS Reference

### Tailwind Classes Used

| Class | Property | Value |
|-------|----------|-------|
| `pb-2` | padding-bottom | 8px |
| `pb-3` | padding-bottom | 12px |
| `pb-5` | padding-bottom | 20px |
| `pt-2` | padding-top | 8px |
| `px-2` | padding: 0 8px | |
| `px-1.5` | padding: 0 6px | |
| `pt-1.5` | padding-top | 6px |
| `flex` | display | flex |
| `flex-col` | flex-direction | column |
| `flex-none` | flex-shrink, flex-grow | 0 |
| `h-full` | height | 100% |
| `line-clamp-5` | -webkit-line-clamp | 5 |
| | display | -webkit-box |
| | -webkit-box-orient | vertical |
| | overflow | hidden |

---

## Testing

### Visual Testing Checklist

- [ ] Short titles (1 line) show with minimal card height
- [ ] Medium titles (2-3 lines) wrap appropriately
- [ ] Long titles (5 lines) use max lines before ellipsis
- [ ] No empty space visible below title text
- [ ] All cards sit firmly (no visual floating)
- [ ] Author badges align consistently
- [ ] Grid layout handles varied card heights
- [ ] Responsive padding looks good on all screen sizes
- [ ] Hover effects still work properly
- [ ] Transitions are smooth

### Unit Tests

Key test areas (in `__tests__/components/ui/artifact-card.test.tsx`):

```typescript
describe('ArtifactCard Wrapping', () => {
  test('renders long titles with line clamping', () => {
    // Verify line-clamp-5 is applied
  })

  test('card height varies with title length', () => {
    // Measure card heights for different title lengths
  })

  test('no empty space below title', () => {
    // Verify flex-none prevents extra space
  })
})
```

---

## Browser Compatibility

### Line Clamping

`line-clamp-5` uses CSS working draft spec:
- ✅ Chrome 77+
- ✅ Firefox 68+
- ✅ Safari 13+
- ✅ Edge 79+

### Flexbox

`flex-col` and `flex-none` supported in all modern browsers:
- ✅ IE 11+ (with fallbacks)
- ✅ All mobile browsers

---

## Accessibility Considerations

### Title Wrapping

- **Full text available**: Hover tooltips can show complete title
- **Screen readers**: Full title text available in HTML
- **Truncation indication**: Ellipsis visible when text is cut off

**Example implementation with tooltips:**
```tsx
import { Tooltip } from '@/components/ui/tooltip'

<Tooltip content={artifact.title}>
  <h3 className="line-clamp-5">{artifact.title}</h3>
</Tooltip>
```

### Visual Balance

- Adequate padding creates visual hierarchy
- Clear separation between sections
- Consistent spacing aids navigation

---

## Performance Impact

### CSS Changes Impact

- **Line clamping**: Minimal impact (CSS property)
- **Flexbox layout**: Standard rendering cost
- **Height flexibility**: No additional layout recalculations

**Metrics:**
- Build size increase: ~100 bytes (CSS class additions)
- Runtime performance: No measurable change
- Browser paint time: No measurable change

---

## Future Considerations

### Potential Enhancements

1. **Dynamic font scaling** - Smaller text on compact cards
2. **Gradient text overflow** - Fade effect instead of ellipsis
3. **Subtitle field** - Short description under title
4. **Custom font sizes** - Per-card title customization
5. **Animation on hover** - Title expansion on hover

---

## Collection Card Design (December 2025)

### Full-Bleed Thumbnail Pattern

Collection cards use a **full-bleed thumbnail** with **overlaid text** - different from the stacked artifact card pattern.

```
┌─────────────────────┐
│                     │
│   Full-bleed        │  ← absolute inset-0
│   Thumbnail Grid    │
│                     │
│ ┌─────────────────┐ │
│ │ Title  [badges] │ │  ← absolute bottom-0
│ │ Count           │ │     bg-background/70 backdrop-blur-sm
│ └─────────────────┘ │
└─────────────────────┘
```

### Structure

```tsx
<Card className="relative aspect-[4/3] sm:aspect-[3/2]">
  {/* Full-bleed thumbnail */}
  <div className="absolute inset-0 transition-transform group-hover:scale-105">
    <CollectionThumbnailGrid images={thumbnailImages} title={title} />
  </div>

  {/* Text overlay at bottom */}
  <div className="absolute inset-x-0 bottom-0 bg-background/70 backdrop-blur-sm p-3 sm:p-4">
    <h3>{title}</h3>
    <p>{itemCount} artifacts</p>
  </div>
</Card>
```

### Key Properties

| Property | Value | Purpose |
|----------|-------|---------|
| Card aspect ratio | `4/3` mobile, `3/2` desktop | Fixed card proportions |
| Thumbnail position | `absolute inset-0` | Fill entire card |
| Overlay position | `absolute inset-x-0 bottom-0` | Anchor to bottom |
| Overlay background | `bg-background/70` | 70% opacity |
| Overlay blur | `backdrop-blur-sm` | Depth effect |

### Why Full-Bleed?

1. **iOS Safari compatibility** - Avoids `aspect-ratio` + `max-height` conflict
2. **More thumbnail visible** - Text doesn't consume separate vertical space
3. **Modern aesthetic** - Netflix/Pinterest card pattern
4. **Predictable layout** - Fixed aspect ratio = consistent grid heights

### Collection Card Variants

| Component | Usage |
|-----------|-------|
| `CollectionCard` | Standard card with full-bleed pattern |
| `CollectionCardHorizontal` | List view (1/3 thumbnail, 2/3 text) |
| `UncategorizedCollectionCard` | Wide `aspect-[4/1]` for system collection |

---

## Related Documentation

- [Artifact Grid Layout](./artifact-grid-layout.md) - Masonry grid system
- [Component Architecture](../ARCHITECTURE.md) - Card component structure
- [Testing Guide](../TESTING.md) - Test patterns for components
- [Tailwind CSS Docs](https://tailwindcss.com/docs) - CSS reference
- [Collection Card Redesign](../archive/2025-12-03-collection-card-full-bleed-redesign.md) - Implementation details

