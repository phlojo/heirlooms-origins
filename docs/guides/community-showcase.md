# Community Showcase Component

**Location**: `components/community-showcase.tsx`
**Last Updated**: 2025-12-02

## Overview

`CommunityShowcase` is a reusable component for displaying public artifacts in a masonry grid layout. It features card size toggling, localStorage persistence, and a foundation for future sort options.

## Usage

```tsx
import { CommunityShowcase } from "@/components/community-showcase"

<CommunityShowcase
  artifacts={publicArtifacts}
  title="Community Showcase"
  subtitle="Artifacts"
  showViewAll
  viewAllHref="/artifacts"
  maxItems={6}
  className="bg-muted/30"
/>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `artifacts` | `ShowcaseArtifact[]` | required | Artifacts to display |
| `title` | `string` | "Community Showcase" | Section title |
| `subtitle` | `string` | "Artifacts" | Subtitle text below title |
| `sortBy` | `ShowcaseSortOption` | "random" | Current sort option |
| `onSortChange` | `(sort) => void` | - | Callback when sort changes |
| `showViewAll` | `boolean` | `true` | Show "View All →" link |
| `viewAllHref` | `string` | "/artifacts" | URL for View All link |
| `maxItems` | `number` | 6 | Maximum artifacts to display |
| `showAuthor` | `boolean` | `false` | Show author on cards |
| `className` | `string` | - | Additional container classes |

## Features

### Masonry Grid Layout

Uses the existing `MasonryGrid` component for responsive, Pinterest-style layout:

- **Standard view**: 2 cols (mobile) → 3 (md) → 4 (lg) → 6 (xl)
- **Compact view**: 3 cols (mobile) → 4 (md) → 6 (lg) → 8 (xl)

### Card Size Toggle

Users can switch between standard (`ArtifactCard`) and compact (`ArtifactCardCompact`) views:

```tsx
const [viewType, setViewType] = useState<"standard" | "compact">("standard")

<Button onClick={handleViewToggle}>
  {isCompact ? <Grid2x2 /> : <Grid3x3 />}
</Button>
```

The preference persists in localStorage under `heirloom-showcase-view`.

### Header Layout

```
┌─────────────────────────────────────────────────────────┐
│ [📦] Community Showcase          [⊞] [View All →]      │
│      Artifacts                                          │
└─────────────────────────────────────────────────────────┘
```

- **Left**: Purple icon box + title + subtitle
- **Right**: View toggle button + "View All" link

## Sort Options

The component defines sort options for future use:

```typescript
export type ShowcaseSortOption =
  | "random"      // Random selection (current default)
  | "newest"      // Most recently added
  | "most-loved"  // Most favorites/likes (future)
  | "most-viewed" // Most views (future)
  | "trending"    // Trending/hot (future)
```

### Current Implementation

| Sort | Status | Notes |
|------|--------|-------|
| `random` | ✅ Working | Fisher-Yates shuffle, different set on each reload |
| `newest` | ✅ Working | Orders by `created_at` desc |
| `most-loved` | ⏳ Planned | Requires `love_count` column |
| `most-viewed` | ⏳ Planned | Requires `view_count` column |
| `trending` | ⏳ Planned | Requires analytics system |

### Data Fetching

The `getPublicShowcaseArtifacts` function in `app/page.tsx` handles sort-aware data fetching:

```tsx
async function getPublicShowcaseArtifacts(
  supabase: Client,
  sortBy: ShowcaseSortOption = "random",
  limit: number = 6
) {
  let query = supabase
    .from("artifacts")
    .select(`id, slug, title, ...`)
    .not("media_urls", "is", null)

  switch (sortBy) {
    case "newest":
      query = query.order("created_at", { ascending: false }).limit(limit)
      break
    case "random":
    default:
      // Fetch 4x more and shuffle client-side
      query = query.limit(limit * 4)
      break
  }

  const { data: artifacts } = await query

  if (sortBy === "random" && artifacts) {
    // Fisher-Yates shuffle
    const shuffled = [...artifacts]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled.slice(0, limit)
  }

  return artifacts || []
}
```

## Enabling Future Sort Options

### Database Changes Required

```sql
-- Add columns to artifacts table
ALTER TABLE artifacts ADD COLUMN view_count INTEGER DEFAULT 0;
ALTER TABLE artifacts ADD COLUMN love_count INTEGER DEFAULT 0;

-- Create loves/favorites table
CREATE TABLE artifact_loves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_id UUID REFERENCES artifacts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(artifact_id, user_id)
);

-- Index for efficient queries
CREATE INDEX idx_artifacts_love_count ON artifacts(love_count DESC);
CREATE INDEX idx_artifacts_view_count ON artifacts(view_count DESC);
```

### Code Changes Required

1. Update switch cases in `getPublicShowcaseArtifacts`:

```tsx
case "most-loved":
  query = query.order("love_count", { ascending: false }).limit(limit)
  break
case "most-viewed":
  query = query.order("view_count", { ascending: false }).limit(limit)
  break
```

2. Add sort selector UI to `CommunityShowcase` component
3. Implement view tracking API endpoint
4. Implement love/unlike functionality

## Artifact Interface

```typescript
interface ShowcaseArtifact {
  id: string
  slug: string
  title: string
  description?: string | null
  media_urls?: string[]
  media_derivatives?: Record<string, any> | null
  thumbnail_url?: string | null
  user_id?: string
  artifact_type?: {
    id: string
    name: string
    icon_name: string
  } | null
}
```

## Styling

- **Container**: `py-12 md:py-16` padding
- **Max width**: `max-w-6xl mx-auto`
- **Icon box**: Purple background (`bg-purple-100 dark:bg-purple-900/30`)
- **Grid gutter**: 12px via MasonryGrid
- **View toggle**: Ghost button with Grid2x2/Grid3x3 icons

## Related Components

| Component | Purpose |
|-----------|---------|
| `MasonryGrid` | Responsive masonry layout engine |
| `ArtifactCard` | Standard artifact card (larger) |
| `ArtifactCardCompact` | Compact artifact card (smaller) |

## File Dependencies

```
components/
├── community-showcase.tsx      # This component
├── masonry-grid.tsx           # Layout engine
├── artifact-card.tsx          # Standard card
└── artifact-card-compact.tsx  # Compact card

app/
└── page.tsx                   # Data fetching with getPublicShowcaseArtifacts
```
