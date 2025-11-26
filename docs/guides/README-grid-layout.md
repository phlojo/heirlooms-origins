# Artifact Grid Layout Documentation

This directory contains comprehensive guides for the artifact grid system and card design.

## Quick Links

### Core Documentation
- **[artifact-grid-layout.md](./artifact-grid-layout.md)** - Complete grid system architecture
  - How Masonry.js works
  - Column calculation algorithm
  - Responsive behavior at each breakpoint
  - Usage examples
  - Performance tips

- **[card-design-updates.md](./card-design-updates.md)** - Card design improvements
  - Card grounding explanation
  - Variable-height title wrapping
  - Component changes
  - CSS classes reference
  - Browser compatibility

### Implementation Details

#### Grid System (`components/masonry-grid.tsx`)
```tsx
<MasonryGrid isCompact={viewType === "compact"} gutter={8}>
  {artifacts.map(artifact => (
    <ArtifactCard key={artifact.id} artifact={artifact} />
  ))}
</MasonryGrid>
```

**Key Features**:
- Flows items top-down, column-by-column
- Responsive column count (2-6 standard, 3-8 compact)
- Zero visual gaps
- Automatic reflow on resize/image load

#### Card Components
- `artifact-card.tsx` - Standard view with author badge
- `artifact-card-compact.tsx` - Compact view, minimal spacing
- `artifact-card-full.tsx` - Detailed view with description

**All cards**:
- Support titles up to 5 lines (with ellipsis)
- Have variable heights based on content
- Use flexbox for proper layout
- Include bottom grounding padding

### Responsive Column Counts

**Standard View**:
| Size | Columns | Example |
|------|---------|---------|
| Mobile | 2 | iPhone |
| Tablet | 2-3 | iPad |
| Desktop | 3-4 | Laptop |
| Large | 4-6 | Large monitor |

**Compact View**:
| Size | Columns | Example |
|------|---------|---------|
| Mobile | 3 | iPhone |
| Tablet | 3-4 | iPad |
| Desktop | 4-6 | Laptop |
| Large | 6-8 | Large monitor |

## Getting Started

### Basic Implementation
```tsx
import { MasonryGrid } from '@/components/masonry-grid'
import { ArtifactCard } from '@/components/artifact-card'

function ArtifactGallery({ artifacts, isCompact }) {
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
const [viewType, setViewType] = useState('standard')

return (
  <>
    <button onClick={() => setViewType(viewType === 'standard' ? 'compact' : 'standard')}>
      Toggle View
    </button>

    <MasonryGrid isCompact={viewType === 'compact'}>
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

## Common Tasks

### Adjusting Grid Gutter
```tsx
<MasonryGrid isCompact={isCompact} gutter={16}>
  {/* Cards */}
</MasonryGrid>
```

### Changing Responsive Columns
Edit `components/masonry-grid.tsx`:
```tsx
const getDesiredColumns = (width: number, isCompact: boolean): number => {
  if (isCompact) {
    if (width < BREAKPOINTS.tablet) return 4  // Changed from 3
    // ... rest of logic
  }
}
```

### Styling Card Titles
Modify `line-clamp-5` to `line-clamp-3` for fewer lines:
```tsx
<h3 className="line-clamp-3">{artifact.title}</h3>
```

### Adjusting Card Padding
Change bottom padding values:
```tsx
// Standard card - currently pb-3 (12px)
<CardContent className="pb-4">  {/* Change to pb-4 for 16px */}

// Compact card - currently pb-2 (8px)
<div className="pb-3">  {/* Change to pb-3 for 12px */}
```

## Troubleshooting

### No columns visible
- Check that items have `key` prop set
- Verify `isCompact` prop matches view mode
- Ensure container has width (not `w-0` or `hidden`)

### Cards don't reflow on window resize
- Check browser console for errors
- Verify ResizeObserver is supported (IE 11+ with polyfill)
- Clear browser cache if styles don't update

### Titles are too long/short
- Adjust `line-clamp-X` value (currently 5)
- Test with various title lengths
- Consider max-width constraint if needed

### Grid has gaps
- This indicates masonry layout isn't working
- Check that children have proper width
- Verify Masonry.js library loaded
- Check browser console for JS errors

## Performance Tips

1. **Use pagination** - Load 24 items per page
2. **Lazy load images** - Use `MediaImage` component
3. **Memoize cards** - For large lists with React.memo
4. **Virtual scroll** - For 1000+ items

## Browser Support

✅ Modern browsers (Chrome, Firefox, Safari, Edge)
✅ Mobile (iOS Safari, Chrome Mobile)
❌ IE 11 (without polyfills)

## See Also

- [CLAUDE.md](../../CLAUDE.md) - Project guidelines
- [ARCHITECTURE.md](../../ARCHITECTURE.md) - System architecture
- [Card Design Updates](./card-design-updates.md) - Card improvements
- [Masonry.js Docs](https://masonry.desandro.com/) - Library reference

## Questions?

Refer to the detailed documentation:
- Grid layout questions → `artifact-grid-layout.md`
- Card design questions → `card-design-updates.md`
- Implementation examples → Look at `components/artifacts-tabs.tsx`
