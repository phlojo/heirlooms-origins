# Artifact Gallery Editor Guide

**Component**: `components/artifact-gallery-editor.tsx`
**Library**: @dnd-kit (React drag-and-drop)
**Date**: 2025-11-27

## Overview

The Artifact Gallery Editor provides a drag-and-drop interface for managing media in artifact galleries. Built with @dnd-kit, it offers horizontal reordering, optimistic updates, and auto-save functionality.

## Features

### Core Functionality
- **Drag-and-drop reordering** - Horizontal list with visual feedback
- **Auto-save** - Changes persist immediately (optimistic updates)
- **Add media** - MediaPicker integration for selecting from library
- **Remove media** - One-click removal with confirmation toast
- **Empty state** - Helpful prompt when no media exists
- **Accessibility** - Touch, mouse, and keyboard support

### Visual Design
- **Compact cards** - 64x64 thumbnails with type labels
- **Drag handles** - GripVertical icon for intuitive dragging
- **Hidden scrollbar** - Clean appearance with scroll functionality
- **Auto-saved badge** - Green indicator showing changes persist automatically
- **Responsive** - Works on mobile and desktop

## Component Architecture

### Component Tree
```
ArtifactGalleryEditor
├── Header (title, badge, "Add to Gallery" button)
├── Gallery Grid (DndContext)
│   ├── SortableContext (horizontal strategy)
│   │   └── SortableItem (for each media)
│   │       ├── Drag Handle (GripVertical)
│   │       ├── Thumbnail (image/video preview)
│   │       ├── Type Label (capitalize media type)
│   │       └── Remove Button (X icon)
│   └── Empty State (when no media)
└── MediaPicker Dialog
```

### Key Components

#### `SortableItem`
Individual draggable card for each media item.

**Props:**
- `item: ArtifactMediaWithDerivatives` - Media data with derivatives
- `onRemove: (linkId, filename) => void` - Remove callback

**Features:**
- Uses `useSortable` hook from @dnd-kit
- Visual opacity change when dragging (0.5)
- Smooth transitions via CSS transforms
- Grab/grabbing cursor states

#### `ArtifactGalleryEditor`
Main container component.

**Props:**
- `artifactId: string` - Artifact ID for media links
- `galleryMedia: ArtifactMediaWithDerivatives[]` - Current gallery media
- `onUpdate: () => void` - Callback to refetch data after add/remove

**State:**
- `isPickerOpen` - MediaPicker dialog visibility
- `isReordering` - Loading state during save
- `items` - Local state for optimistic updates

## Implementation Patterns

### Optimistic Updates

The editor uses optimistic updates for instant feedback:

```typescript
// 1. Immediately update UI
const newItems = arrayMove(items, oldIndex, newIndex)
setItems(newItems)

// 2. Save to database in background
const result = await reorderArtifactMedia({ ... })

// 3. Revert on error
if (result.error) {
  setItems(galleryMedia) // Revert to prop state
}

// 4. Don't refetch (already updated)
toast.success("Reordered successfully")
// No onUpdate() call
```

**Benefits:**
- Zero perceived latency
- Smooth user experience
- Maintains data integrity (reverts on error)
- Reduces server load (no unnecessary refetch)

### State Synchronization

Local state syncs with prop changes via useEffect:

```typescript
const [items, setItems] = useState(galleryMedia)

useEffect(() => {
  setItems(galleryMedia)
}, [galleryMedia])
```

This ensures:
- Optimistic updates work for reorder
- Add/remove operations update correctly
- External changes propagate to UI

### Drag Sensors Configuration

Uses two sensors for comprehensive input support:

```typescript
const sensors = useSensors(
  useSensor(PointerSensor),        // Mouse and touch
  useSensor(KeyboardSensor, {      // Keyboard navigation
    coordinateGetter: sortableKeyboardCoordinates,
  })
)
```

**Accessibility:**
- Mouse: Click and drag
- Touch: Tap and drag on mobile
- Keyboard: Arrow keys to reorder

### Horizontal Sorting Strategy

```typescript
<SortableContext
  items={items.map(item => item.id)}
  strategy={horizontalListSortingStrategy}
>
```

**Features:**
- Optimized for horizontal lists
- Smooth animations
- Predictable drop zones
- No vertical movement

## Server Actions Integration

### Add Media Flow

```typescript
const handleAddMedia = async (selectedMedia: UserMediaWithDerivatives[]) => {
  for (const media of selectedMedia) {
    const result = await createArtifactMediaLink({
      artifact_id: artifactId,
      media_id: media.id,
      role: "gallery",
      sort_order: galleryMedia.length,
    })

    if (result.error) {
      toast.error(`Failed to add ${media.filename}: ${result.error}`)
      return
    }
  }

  toast.success(`Added ${selectedMedia.length} item(s)`)
  onUpdate() // Refetch to get new data
}
```

**Key points:**
- Sequential loop (not parallel) to maintain order
- Early return on error (fail fast)
- Call `onUpdate()` to refetch with new media

### Remove Media Flow

```typescript
const handleRemove = async (linkId: string, filename: string) => {
  const result = await removeArtifactMediaLink(linkId)

  if (result.error) {
    toast.error(`Failed to remove ${filename}: ${result.error}`)
    return
  }

  toast.success(`Removed ${filename}`)
  onUpdate() // Refetch to remove from list
}
```

**Key points:**
- Uses link ID (not media ID) to remove specific connection
- Call `onUpdate()` to refetch updated list

### Reorder Flow

```typescript
const handleDragEnd = async (event: DragEndEvent) => {
  const { active, over } = event

  if (!over || active.id === over.id) return

  // Optimistic update
  const newItems = arrayMove(items, oldIndex, newIndex)
  setItems(newItems)

  // Save to database
  const reorders = newItems.map((item, idx) => ({
    media_id: item.media_id,
    new_sort_order: idx,
  }))

  const result = await reorderArtifactMedia({
    artifact_id: artifactId,
    role: "gallery",
    reorders,
  })

  // Error handling
  if (result.error) {
    setItems(galleryMedia) // Revert
    toast.error(`Failed to reorder: ${result.error}`)
  } else {
    toast.success("Reordered successfully")
  }
}
```

**Key points:**
- Two-phase database update (see `lib/actions/media.ts:441-529`)
- Optimistic update before save
- Revert on error
- No refetch (already updated)

## Styling Details

### Container
- **Height**: `192px` (fixed to prevent layout shift)
- **Overflow**: `overflow-x-auto` (horizontal scroll)
- **Scrollbar**: Hidden via CSS (see below)
- **Gap**: `4px` between cards

### Cards
- **Padding**: `12px` (p-3)
- **Gap**: `4px` (gap-1) between internal elements
- **Border radius**: `rounded-sm`
- **Background**: Inherits from Card component
- **Width**: `auto` (fits content)

### Scrollbar Hiding
```css
.gallery-grid::-webkit-scrollbar {
  display: none !important;
}
.gallery-grid {
  -ms-overflow-style: none !important;
  scrollbar-width: none !important;
}
```

**Cross-browser support:**
- Webkit (Chrome, Safari): `::-webkit-scrollbar`
- Firefox: `scrollbar-width: none`
- IE/Edge: `-ms-overflow-style: none`

### Thumbnails
- **Size**: 64x64 pixels (h-16 w-16)
- **Object fit**: `object-cover` (fills container)
- **Rounded**: `rounded` (4px corners)
- **Background**: `bg-muted` (fallback for loading)

### Drag Handle
- **Icon**: GripVertical (20x20)
- **Color**: `text-muted-foreground`
- **Cursor**: `cursor-grab` (idle), `cursor-grabbing` (active)
- **Size**: 20x20 (h-5 w-5)

## Common Use Cases

### 1. Adding Gallery Media

```typescript
// User clicks "Add to Gallery" button
// → MediaPicker dialog opens
// → User selects media from library
// → handleAddMedia() creates links
// → onUpdate() refetches with new media

<Button onClick={() => setIsPickerOpen(true)}>
  <Plus className="mr-2 h-4 w-4" />
  Add to Gallery
</Button>
```

### 2. Reordering Media

```typescript
// User drags media card
// → SortableItem shows visual feedback
// → On drop, handleDragEnd() fires
// → UI updates immediately (optimistic)
// → Database saves in background
// → Toast confirms success/error

<DndContext onDragEnd={handleDragEnd}>
  <SortableContext items={items} strategy={horizontalListSortingStrategy}>
    {items.map(item => <SortableItem key={item.id} item={item} />)}
  </SortableContext>
</DndContext>
```

### 3. Removing Media

```typescript
// User clicks X button
// → Confirmation toast appears
// → handleRemove() deletes link
// → onUpdate() refetches updated list
// → Item disappears from UI

<Button onClick={() => onRemove(item.id, media.filename)}>
  <X className="h-4 w-4" />
</Button>
```

## Error Handling

### Network Errors
```typescript
try {
  const result = await createArtifactMediaLink({ ... })
  if (result.error) {
    toast.error(`Failed: ${result.error}`)
    return // Early exit
  }
} catch (error) {
  console.error("[GalleryEditor] Error:", error)
  toast.error("Failed to add media")
}
```

### Reorder Errors
```typescript
if (result.error) {
  toast.error(`Failed to reorder: ${result.error}`)
  setItems(galleryMedia) // Revert to prop state
  return
}
```

### Add/Remove Errors
```typescript
// Show error toast
toast.error(`Failed to add ${media.filename}: ${result.error}`)

// Return early (don't proceed with loop)
return

// Don't call onUpdate() (keeps current state)
```

## Performance Considerations

### Optimistic Updates
- **Benefit**: Zero perceived latency for reorder
- **Trade-off**: Must handle revert on error
- **Impact**: Significantly improved UX

### Refetch Strategy
- **Reorder**: No refetch (optimistic update)
- **Add/Remove**: Refetch to get server state
- **Rationale**: Reorder is local state change, add/remove changes data

### Database Updates
- **Two-phase reorder**: Prevents unique constraint violations
- **Sequential add**: Maintains order, fails fast
- **Single delete**: Simple, no cascading issues

## Testing Checklist

### Functionality
- [ ] Drag media to reorder
- [ ] Add media from picker
- [ ] Remove media with X button
- [ ] Empty state displays correctly
- [ ] Auto-save indicator visible

### Interactions
- [ ] Mouse drag works
- [ ] Touch drag works (mobile)
- [ ] Keyboard navigation works
- [ ] Horizontal scroll works
- [ ] Scrollbar is hidden

### Error Handling
- [ ] Network error shows toast
- [ ] Reorder error reverts UI
- [ ] Add error stops loop
- [ ] Remove error shows message

### Performance
- [ ] Reorder feels instant
- [ ] No flicker on updates
- [ ] Smooth animations
- [ ] No layout shift

## Troubleshooting

### Items not reordering
**Check:**
- `items` state is being updated
- `handleDragEnd` is firing
- No console errors
- `sort_order` unique constraint not violated

### Flickering on update
**Check:**
- Using optimistic updates (not refetching)
- `useEffect` dependency array correct
- No multiple re-renders

### Scrollbar visible
**Check:**
- Custom CSS is loaded
- `.gallery-grid` class applied
- No conflicting styles

### Cards not aligned
**Check:**
- `gap-1` (4px) applied
- `p-3` (12px) padding correct
- `inline-flex` on Card
- `items-center justify-center` on children

## Related Files

- `components/artifact-gallery-editor.tsx` - This component
- `components/artifact-media-gallery.tsx` - View mode component
- `components/media-picker.tsx` - Media selection dialog
- `lib/actions/media.ts` - Server actions (lines 203-529)
- `lib/types/media.ts` - TypeScript types
- `docs/planning/artifact-gallery.md` - Feature design doc

## References

- [@dnd-kit Documentation](https://docs.dndkit.com/)
- [@dnd-kit/sortable Guide](https://docs.dndkit.com/presets/sortable)
- [Optimistic UI Patterns](https://www.epicweb.dev/optimistic-ui)
