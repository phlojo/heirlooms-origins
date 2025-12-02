# Homepage System

**Location**: `app/page.tsx`
**Components**: `components/homepage/logged-out-homepage.tsx`, `components/homepage/logged-in-homepage.tsx`
**Last Updated**: 2025-12-02
**Related**: See [2025-12-02-homepage-ux-improvements.md](../archive/2025-12-02-homepage-ux-improvements.md) for implementation details

## Overview

The homepage implements a dual-experience system that renders different content based on authentication state. Logged-out visitors see a marketing landing page, while authenticated users see a personalized dashboard.

## Authentication Branching

The page uses server-side authentication to determine which experience to render:

```tsx
// app/page.tsx
const user = await getCurrentUser()

if (user) {
  return <LoggedInHomepage {...dashboardData} />
}

return <LoggedOutHomepage {...showcaseData} />
```

This pattern:
- Uses existing `getCurrentUser()` from `lib/supabase/server.ts`
- Fetches appropriate data server-side before rendering
- No client-side auth checks or loading states needed

## Logged-Out Homepage (Marketing)

### Purpose
Convert visitors into users by showcasing the product's value proposition.

### Sections

| Section | Description |
|---------|-------------|
| **Hero** | Logo + "Heirlooms" branding with (Beta) tag, headline, dual CTA buttons |
| **How It Works** | 3-step carousel with navigation arrows and dots |
| **Community Showcase: Artifacts** | `CommunityShowcase` component with masonry grid |
| **Community Showcase: Collections** | Collection cards with similar header styling |
| **Built For** | 4 audience cards (Families, Collectors, Makers, Story Preservers) |
| **Final CTA** | "Get Started Free" button |
| **Footer** | Minimal branding |
| **Bottom Nav** | Mobile navigation bar |

### Component Architecture

```
LoggedOutHomepage
├── Hero Section
│   ├── Gradient background
│   ├── Floating background images (2)
│   ├── Logo + "Heirlooms" + "(Beta)" badge
│   ├── Headline + Subheading
│   └── CTA Buttons
│       ├── "Create Your First Artifact" (purple, Package icon) → /artifacts/new
│       ├── "Start Your First Collection" (primary, LayoutGrid icon) → /collections/new
│       └── "See How It Works" (ghost) → scrolls to section
├── How It Works Carousel (HowItWorksCarousel)
│   ├── 3 cards with slide animation
│   ├── Left/Right navigation arrows (overlay)
│   └── Dot indicators (clickable)
├── Community Showcase: Artifacts (CommunityShowcase component)
│   ├── Header: Package icon + title/subtitle + view toggle + View All
│   └── MasonryGrid with ArtifactCard/ArtifactCardCompact
├── Community Showcase: Collections
│   ├── Header: LayoutGrid icon + title/subtitle + View All
│   └── CollectionCard grid (up to 4)
├── Built For (4 cards)
│   ├── Families (Users icon)
│   ├── Collectors (Sparkles icon)
│   ├── Makers & Creators (Palette icon)
│   └── Story Preservers (Heart icon)
├── Final CTA Section
├── Footer
└── BottomNav (mobile)
```

### Hero CTA Buttons

The hero section has two primary action buttons that redirect to login with appropriate `returnTo` parameters:

```tsx
// Create artifact → login → /artifacts/new
<Link href="/login?returnTo=/artifacts/new">
  <Package /> Create Your First Artifact
</Link>

// Create collection → login → /collections/new
<Link href="/login?returnTo=/collections/new">
  <LayoutGrid /> Start Your First Collection
</Link>
```

### How It Works Carousel

The carousel uses CSS transforms for smooth slide animations:

```tsx
function HowItWorksCarousel() {
  const [activeIndex, setActiveIndex] = useState(0)

  return (
    <div style={{ transform: `translateX(-${activeIndex * 100}%)` }}>
      {/* Cards */}
    </div>
  )
}
```

Features:
- **Navigation arrows**: Overlaid on cards, fade out at first/last step
- **Dot indicators**: Clickable, active dot is pill-shaped
- **Slide animation**: 300ms ease-out transition

### Data Fetching

The marketing page fetches random public showcase data:

```tsx
async function getPublicShowcaseArtifacts(
  supabase: Client,
  sortBy: ShowcaseSortOption = "random",
  limit: number = 6
) {
  // Fetches 4x more artifacts for random shuffle
  // Uses Fisher-Yates shuffle for true randomness
  // Returns shuffled subset
}

async function getPublicShowcaseData() {
  const artifacts = await getPublicShowcaseArtifacts(supabase, "random", 6)
  // ... collections and background images
}
```

**Random on Reload**: Each page load shows a different random set of artifacts.

## Logged-In Homepage (Dashboard)

### Purpose
Provide quick access to user's content and actions.

### Sections

| Section | Description |
|---------|-------------|
| **Welcome Header** | "Welcome back, {firstName}" with AppLayout navigation |
| **Quick Stats** | Clickable artifact/collection count cards |
| **Continue Where You Left Off** | Horizontal scroll of recently edited artifacts |
| **Your Collections** | Grid of user's collections (up to 6) |
| **Start Something New** | 4 action cards for common tasks |

### Component Architecture

```
LoggedInHomepage
├── AppLayout (with full navigation)
│   ├── Welcome Header
│   │   ├── Logo + "Welcome back, {firstName}"
│   │   └── Subtext
│   ├── Quick Stats (2 cards)
│   │   ├── Artifacts count → /artifacts
│   │   └── Collections count → /collections
│   ├── Continue Where You Left Off
│   │   ├── Horizontal ScrollArea with ArtifactCards
│   │   └── Empty state if no artifacts
│   ├── Your Collections
│   │   ├── CollectionCard grid (up to 6)
│   │   └── Empty state if no collections
│   └── Start Something New (4 action cards)
│       ├── Create Artifact → /artifacts/new
│       ├── Create Collection → /collections/new
│       ├── Explore Community → /artifacts
│       └── Write a Story → /stories
```

### Data Fetching

```tsx
async function getUserDashboardData(userId: string) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, created_at")
    .eq("id", userId)
    .single()

  const { artifacts: recentArtifacts } = await getMyArtifactsPaginated(userId, {
    limit: 9,  // Shows 9 artifacts for better visual density
    sortBy: "last-edited",
  })

  const { collections } = await getMyCollectionsPaginated(userId, 6)

  // Collect visual media for stat card backgrounds
  const allVisualMedia: string[] = []
  recentArtifacts.forEach((artifact) => {
    if (artifact.media_urls) {
      artifact.media_urls.forEach((url) => {
        if (isImageUrl(url) || isVideoUrl(url)) {
          allVisualMedia.push(url)
        }
      })
    }
  })

  // Fisher-Yates shuffle for random selection
  const shuffledMedia = allVisualMedia.sort(() => Math.random() - 0.5)
  const statBackgrounds = {
    artifacts: shuffledMedia[0] || null,
    collections: shuffledMedia[1] || shuffledMedia[0] || null,
  }

  return { profile, recentArtifacts, collections, stats, statBackgrounds }
}
```

## Login Redirect Flow

CTAs properly redirect users back to their intended destination after login:

| Source | returnTo | After Login |
|--------|----------|-------------|
| Homepage "Create Artifact" | `/artifacts/new` | New artifact form |
| Homepage "Create Collection" | `/collections/new` | New collection form |
| Homepage "Get Started Free" | `/` | Logged-in homepage |
| Direct `/artifacts/new` access | `/artifacts/new` | New artifact form |
| Direct `/collections/new` access | `/collections/new` | New collection form |

## Reused Components

| Component | Usage |
|-----------|-------|
| `CommunityShowcase` | Artifacts showcase with masonry grid |
| `AppLayout` | Dashboard shell with navigation (logged-in only) |
| `ArtifactCard` / `ArtifactCardCompact` | Artifact previews |
| `CollectionCard` | Collection previews |
| `MasonryGrid` | Responsive masonry layout |
| `BottomNav` | Mobile navigation (logged-out) |
| `Button` | All CTAs with appropriate variants |
| `Card`, `CardContent` | Stat cards, action cards |
| `Empty` | Empty states |
| `MediaImage` | Background images |

## Styling

### Marketing Page
- No AppLayout wrapper (standalone page)
- Full-width sections with gradient backgrounds
- `min-h-[100dvh]` for full viewport height
- `pb-20 lg:pb-0` for bottom nav spacing on mobile
- Responsive padding: `px-4 py-16 md:py-24`

### Dashboard Page
- Wrapped in AppLayout with full navigation
- Standard page padding: `pb-20` for bottom nav
- Uses existing spacing utilities: `space-y-8`

## File Structure

```
app/
└── page.tsx                              # Main entry, auth branching, data fetching

components/homepage/
├── logged-out-homepage.tsx               # Marketing landing page
└── logged-in-homepage.tsx                # User dashboard

components/
└── community-showcase.tsx                # Reusable showcase component
```

## Props Interface

### LoggedOutHomepageProps

```typescript
interface LoggedOutHomepageProps {
  backgroundImages: string[]
  showcaseArtifacts: ShowcaseArtifact[]
  showcaseCollections: ShowcaseCollection[]
}
```

### LoggedInHomepageProps

```typescript
interface LoggedInHomepageProps {
  user: SupabaseUser
  profile: {
    display_name?: string | null
    created_at?: string | null
  } | null
  recentArtifacts: DashboardArtifact[]
  collections: DashboardCollection[]
  stats: {
    artifactsCount: number
    collectionsCount: number
  }
  // Optional background images for stat cards (from user's media)
  statBackgrounds?: {
    artifacts: string | null
    collections: string | null
  }
}
```

## Future Enhancements

- **Inbox section** - Pending AI tasks, unprocessed media
- **Activity feed** - Recent changes across collections
- **Quick upload** - Drag-and-drop zone on dashboard
- **Onboarding flow** - First-time user guidance
- **Sort options for showcase** - Most loved, trending, newest (requires DB columns)
