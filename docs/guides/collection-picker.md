# Collection Picker Guide

## Overview

The **Collection Picker** is a collapsible UI component that replaces the previous dropdown selector for choosing artifact collections. It provides a visual grid of mini collection cards with thumbnail previews, similar to the Artifact Type Selector pattern.

## Components

### CollectionPicker (`components/collection-picker.tsx`)

Main container component with collapsible behavior and localStorage state persistence.

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `userId` | `string` | (required) | User ID for fetching collections |
| `selectedCollectionId` | `string \| null` | `null` | Currently selected collection ID |
| `onSelectCollection` | `(id: string \| null) => void` | (required) | Callback when selection changes |
| `required` | `boolean` | `false` | If true, prevents deselection |
| `defaultOpen` | `boolean` | `false` | Initial collapsed/expanded state |
| `storageKey` | `string` | `undefined` | localStorage key for persisting open state |
| `onCreateNew` | `() => void` | `undefined` | Callback for "Create new collection" action |

**Features:**
- Collapsible section with chevron indicator
- localStorage persistence of open/collapsed state
- Scrollable grid (max 2.5 rows visible)
- Gradient fade indicator when more content is below
- Loading skeletons during fetch
- Empty state with "Create your first collection" CTA

### CollectionPickerCard (`components/collection-picker-card.tsx`)

Mini collection card displaying thumbnail grid and metadata.

**Props:**

| Prop | Type | Description |
|------|------|-------------|
| `collection` | `CollectionPickerItem` | Collection data object |
| `isSelected` | `boolean` | Whether this card is currently selected |
| `onClick` | `() => void` | Click handler |

**CollectionPickerItem interface:**
```typescript
interface CollectionPickerItem {
  id: string
  title: string
  slug: string
  thumbnailImages: string[]  // Up to 4 thumbnail URLs
  itemCount: number
  isUncategorized?: boolean
}
```

**Thumbnail Grid Layouts:**
- **0 images**: Placeholder icon (HeirloomsIcon or FolderOpen for Uncategorized)
- **1 image**: Full-size single image
- **2 images**: Side-by-side, each filling full height
- **3 images**: 2x2 grid with one empty cell
- **4+ images**: 2x2 grid (first 4 images)

## Server Action

### `getMyCollectionsWithThumbnails` (`lib/actions/collections.ts`)

Fetches user's collections with thumbnail images and item counts.

```typescript
export async function getMyCollectionsWithThumbnails(userId: string): Promise<{
  collections: CollectionPickerItem[]
  error: string | null
}>
```

**Returns:**
- List of collections with up to 4 thumbnail images each
- Item count for each collection
- `isUncategorized` flag for the special "Uncategorized" collection

## Usage

### New Artifact Form

```tsx
import { CollectionPicker } from "@/components/collection-picker"

<CollectionPicker
  userId={userId}
  selectedCollectionId={collectionId}
  onSelectCollection={(id) => setCollectionId(id)}
  defaultOpen={true}
  storageKey="artifact-new-collection-picker"
/>
```

### Edit Artifact Page

```tsx
<CollectionPicker
  userId={userId}
  selectedCollectionId={collectionId}
  onSelectCollection={(id) => setCollectionId(id)}
  storageKey="artifact-edit-collection-picker"
/>
```

## UI Specifications

### Dimensions
- **Grid layout**: 4 columns (mobile), 5 columns (sm+)
- **Max visible height**: 280px (~2.5 rows)
- **Card padding**: 8px (p-2)
- **Grid gap**: 8px (gap-2)
- **Thumbnail corner radius**: 4px (`rounded`)

### Visual States
- **Default**: Transparent border, muted background
- **Hover**: Accent background, subtle border
- **Selected**: Primary border, accent background, bottom pill indicator
- **Loading**: Skeleton placeholders

### Scroll Behavior
- Vertical scroll when content exceeds 280px
- Gradient fade at bottom when more content is available
- Thin scrollbar with muted thumb

## Styling Details

### Thumbnail Grid
```css
/* Container with 4px corner radius */
.aspect-square.rounded.overflow-hidden

/* 2-image layout: side by side */
.grid.h-full.w-full.grid-cols-2.gap-0.5

/* 3-4 image layout: 2x2 grid */
.grid.h-full.w-full.grid-cols-2.grid-rows-2.gap-0.5
```

### Scroll Indicator
```css
/* Gradient fade at bottom */
.pointer-events-none
.absolute.bottom-0.left-0.right-0
.h-8.bg-gradient-to-t.from-background/80.to-transparent
```

## localStorage Persistence

The open/collapsed state is persisted per-component using the `storageKey` prop:

- `artifact-new-collection-picker` - New Artifact form
- `artifact-edit-collection-picker` - Edit Artifact page

State is saved on toggle and restored on component mount.

## Accessibility

- Uses semantic `<button>` elements for cards
- `type="button"` to prevent form submission
- Keyboard navigable via Collapsible primitive
- Screen reader accessible labels

## Related Components

- **ArtifactTypeSelector**: Similar pattern for selecting artifact types
- **CollectionSelector** (deprecated): Previous dropdown implementation
- **AddMediaModal**: Similar collapsible section pattern
