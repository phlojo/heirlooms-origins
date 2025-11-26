# Artifact Grid Layout & Masonry System

## Overview

The artifact grid uses a **masonry layout** system that optimally arranges items with variable heights without creating visual gaps. This provides a gallery-like experience similar to Pinterest, Instagram, or Google Photos.

**Key characteristics:**
- Items flow **top-down, column-by-column** (not left-to-right)
- **Variable card heights** are fully supported (titles wrap up to 5 lines)
- **Zero visual gaps** - items pack tightly into columns
- **Fully responsive** - column count adjusts at breakpoints
- **Two view modes** - Standard (larger cards) and Compact (smaller cards)

## Architecture

### Components

#### MasonryGrid (`components/masonry-grid.tsx`)
Core layout component that wraps artifact cards in a masonry grid.

**Props:**
```typescript
interface MasonryGridProps {
  children: React.ReactNode        // Artifact cards to display
  isCompact: boolean               // View mode: compact (true) or standard (false)
  gutter?: number                  // Space between items (default: 8px)
  onColumnWidthChange?: (width: number) => void  // Callback when column width changes
}
```

**Features:**
- Calculates desired column count based on container width and view mode
- Wraps children in divs with calculated widths for Masonry positioning
- Initializes Masonry.js layout engine with proper configuration
- Handles window resize events to reflow on breakpoint changes
- Observes image loading to reflowing when images arrive
- Uses ResizeObserver for card height changes (variable-height titles)

**Responsive Behavior:**

*Standard View (2-6 columns):*
```
Mobile (<640px):       2 columns
Tablet (640-768px):    2 columns
Desktop (768-1024px):  3 columns
Large (1024-1280px):   4 columns
XL (≥1280px):          6 columns
```

*Compact View (3-8 columns):*
```
Mobile (<640px):       3 columns
Tablet (640-768px):    3 columns
Desktop (768-1024px):  4 columns
Large (1024-1280px):   6 columns
XL (≥1280px):          8 columns
```

#### ArtifactCard (`components/artifact-card.tsx`)
Standard artifact display card with title, thumbnail, and author badge.

**Updates for masonry:**
- Added `style` prop to accept Masonry positioning styles
- Added `h-full` to Card for proper height handling
- Uses `flex flex-col` for flexbox column layout
- CardHeader and CardContent use `flex-none` to prevent flex growth

**Responsive Title Wrapping:**
- Titles can wrap up to **5 lines** (`line-clamp-5`)
- Card height scales to fit wrapped title content
- No empty space below text (cards hug exact height)

#### ArtifactCardCompact (`components/artifact-card-compact.tsx`)
Compact version for high-density displays.

**Updates for masonry:**
- Same style prop and flexbox adjustments as standard card
- Minimal padding to fit more cards per column
- Smaller icon size and text for compact layouts

### Grid Integration

**ArtifactsTabs** (`components/artifacts-tabs.tsx`) integrates MasonryGrid for both tabs:

```tsx
<MasonryGrid isCompact={viewType === "compact"} gutter={8}>
  {allArtifactsList.map((artifact) =>
    viewType === "standard" ? (
      <ArtifactCard key={artifact.id} artifact={artifact as any} showAuthor={true} />
    ) : (
      <ArtifactCardCompact key={artifact.id} artifact={artifact as any} showAuthor={false} />
    ),
  )}
</MasonryGrid>
```

- Both "Community" and "My Artifacts" tabs use masonry
- View toggle switches between Standard and Compact modes
- Preference persists via `updateArtifactsViewPreference()`

## How Masonry Layout Works

### Column Calculation Algorithm

1. **Measure container width** - Get pixel width of grid container
2. **Determine desired columns** - Based on breakpoints and view mode
3. **Calculate item width** - `(containerWidth - gutter * (columns - 1)) / columns`
4. **Wrap children** - Each child gets explicit width via inline-block div
5. **Initialize Masonry** - Masonry.js positions items column-by-column

### Example Calculation

Container: 1200px wide, Standard view, 8px gutter
- Desired columns: 4 (lg breakpoint)
- Item width: `(1200 - 8 * 3) / 4 = 294px`
- Each card wrapper gets `width: 294px`
- Masonry positions cards in 4 columns with 8px gaps

### Reflowing Triggers

Masonry automatically reflows when:
1. **Window resizes** - Detected via `window.addEventListener('resize')`
2. **Images load** - Detected via image `load` and `error` events
3. **Card heights change** - Detected via `ResizeObserver` on container
4. **Children change** - Detected via useEffect dependency on `children`

## Card Styling

### Responsive Heights

All artifact cards use a **flexbox column layout**:
```tsx
<Card className="flex flex-col">
  <div className="aspect-square">/* Thumbnail (fixed height) */</div>
  <CardHeader className="flex-none">/* Title section (variable height) */</CardHeader>
  <CardContent className="flex-none">/* Metadata (variable height) */</CardContent>
</Card>
```

- Thumbnail: Always `aspect-square` (1:1 ratio, fixed size)
- Title: Wraps up to 5 lines, creates variable height
- Total card height = fixed thumbnail + variable title + metadata

### Grounding

Bottom padding ensures cards sit firmly without empty space:
- **Standard card**: `pb-3` (CardContent padding-bottom)
- **Compact card**: `pb-2` (title wrapper padding-bottom)
- **Full card**: `pb-5` (CardContent padding-bottom)

## Usage

### Basic Implementation

```tsx
import { MasonryGrid } from '@/components/masonry-grid'
import { ArtifactCard } from '@/components/artifact-card'

export function MyArtifactGallery({ artifacts, isCompact }) {
  return (
    <MasonryGrid isCompact={isCompact} gutter={8}>
      {artifacts.map(artifact => (
        <ArtifactCard key={artifact.id} artifact={artifact} />
      ))}
    </MasonryGrid>
  )
}
```

### With View Toggle

```tsx
const [viewType, setViewType] = useState<'standard' | 'compact'>('standard')

return (
  <>
    <button onClick={() => setViewType(viewType === 'standard' ? 'compact' : 'standard')}>
      Toggle View
    </button>

    <MasonryGrid isCompact={viewType === 'compact'} gutter={8}>
      {artifacts.map(artifact => (
        viewType === 'standard' ? (
          <ArtifactCard key={artifact.id} artifact={artifact} />
        ) : (
          <ArtifactCardCompact key={artifact.id} artifact={artifact} />
        )
      ))}
    </MasonryGrid>
  </>
)
```

## Performance Considerations

### Optimization Tips

1. **Pagination** - Load artifacts in batches (currently 24 per page)
   - Uses "Load More" button to fetch additional items
   - Prevents rendering thousands of items at once

2. **Image Optimization** - Use `getThumbnailUrl()` for responsive images
   - Applies Cloudinary transformations
   - Reduces file size before rendering

3. **Lazy Loading** - Cards use lazy image loading
   - MediaImage component handles image rendering
   - ResizeObserver detects when images load and reflows

4. **Memoization** - Consider memoizing card components if needed
   ```tsx
   const MemoizedCard = React.memo(ArtifactCard)
   ```

### Known Limitations

- Masonry.js is a client-side library - layout happens in browser
- Initial render may cause layout shift until container width is measured
- Very large item counts (1000+) may experience layout calculation delays

## Dependencies

**masonry-layout** (v4.2.2)
- Lightweight layout engine (~10KB minified)
- Handles complex column calculations
- Supports dynamic item addition/removal

**Type definitions:** `types/masonry-layout.d.ts`

## Testing

### Test Coverage

- Card rendering with variable-height titles
- Responsive column count at different breakpoints
- Masonry layout arrangement without gaps
- View mode toggling between Standard and Compact
- Image loading and reflowing
- Pagination with "Load More"

### Manual Testing Checklist

- [ ] View grid on mobile (2 cols standard, 3 cols compact)
- [ ] View grid on tablet (2-3 cols standard, 3-4 cols compact)
- [ ] View grid on desktop (3-4 cols standard, 4-6 cols compact)
- [ ] Toggle between Standard and Compact views
- [ ] Verify no visual gaps between cards
- [ ] Verify cards are "grounded" (no empty space below titles)
- [ ] Load more artifacts and verify layout
- [ ] Resize window and verify reflow
- [ ] Check that variable-height titles don't cause layout issues
- [ ] Verify author pills show in standard view

## Future Enhancements

### Potential Improvements

1. **Virtual Scrolling** - For very large artifact collections
   - Only render visible items in viewport
   - Improves performance with 1000+ items

2. **Drag & Drop Reordering** - For personal collections
   - Allow users to organize artifacts
   - Save new order to database

3. **Filter Animations** - Smooth animations when filter applied
   - Items fade/slide when hidden
   - New items fade in

4. **Aspect Ratio Options** - Square, 4:3, 16:9
   - User preference for different aspect ratios
   - Different visual hierarchy

## Related Documentation

- [Navigation Guide](./navigation.md) - Artifact page routing
- [Artifact Types](./artifact-types.md) - Type system and badges
- [Media System](../ARCHITECTURE.md#media-system) - Image/video handling
- [Component Testing](../TESTING.md) - Test structure and patterns

## References

- [Masonry.js Documentation](https://masonry.desandro.com/)
- [Tailwind Responsive Design](https://tailwindcss.com/docs/responsive-design)
- [CSS Flexbox Guide](https://developer.mozilla.org/en-US/docs/Learn/CSS/CSS_layout/Flexbox)
