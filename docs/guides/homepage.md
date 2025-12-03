# Homepage System

**Location**: `app/page.tsx`
**Components**: `components/homepage/logged-out-homepage.tsx`, `components/homepage/logged-in-homepage.tsx`
**Last Updated**: 2025-12-03
**Related**: See [2025-12-02-homepage-ux-improvements.md](../archive/2025-12-02-homepage-ux-improvements.md) for previous implementation details

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
// Create artifact (primary blue) → login → /artifacts
<Link href="/login?returnTo=/artifacts">
  <Package /> Create Your First Artifact
</Link>

// Create collection (purple) → login → /collections
<Link href="/login?returnTo=/collections">
  <LayoutGrid /> Start Your First Collection
</Link>
```

Below the main CTAs, there's a secondary row with "See How It Works" and "Login" buttons:

```tsx
<div className="flex items-center justify-center gap-3">
  <Button variant="outline" onClick={scrollToHowItWorks}>
    See How It Works <ChevronDown />
  </Button>
  <span>or</span>
  <Button variant="outline" asChild>
    <Link href="/login?returnTo=/">Login</Link>
  </Button>
</div>
```

### Interactive Subheading Links

The subheading paragraph contains jump links to page sections:

```tsx
<p>
  Create beautiful digital <a href="#showcase-collections">collections</a> of your
  <a href="#showcase-artifacts">artifacts</a>, preserve their
  <Link href="/stories">stories</Link>, and share them...
</p>
```

- **collections** → jumps to `#showcase-collections` section
- **artifacts** → jumps to `#showcase-artifacts` section
- **stories** → links to `/stories` page

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
- **Background images**: Each card has a muted background image (15% opacity) from public artifacts
- **Bottom gradient**: Cards have a bottom-to-top gradient overlay (50% opacity) for text readability

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

**Rebuilt**: 2025-12-03 - Complete redesign from scratch

### Purpose
Provide quick access to user's content and key actions with an at-a-glance dashboard.

### Sections

| Section | Description |
|---------|-------------|
| **Header** | Heirlooms logo + "(Beta)" badge + Theme toggle (mobile) |
| **Welcome Message** | "Welcome back, {username}" with clickable profile pill + logout button |
| **Quick Stats** | 2 clickable cards showing artifact/collection counts with random background images |
| **Continue Where You Left Off** | 3x2 grid of 5 recent artifacts + "Add Artifact" card, with "View All" link |
| **Your Collections** | Responsive grid of 5 recent collections + "Add Collection" card, with "View All" link |

### Component Architecture

```
LoggedInHomepage (client component)
├── AppLayout (with full navigation)
│   ├── Header Section
│   │   ├── HeirloomsLogoBadge (h-10 w-10)
│   │   ├── "Heirlooms" title
│   │   ├── "(Beta)" badge
│   │   └── ThemeToggle (ml-auto, mobile only)
│   │
│   ├── Welcome Message
│   │   ├── "Welcome back,"
│   │   ├── Username pill (clickable → /profile)
│   │   │   └── hover:bg-primary/15 transition
│   │   └── Logout button (outlined, icon-only)
│   │       └── LogOut icon, calls /api/auth/signout
│   │
│   ├── Quick Stats (2-column grid)
│   │   ├── Artifacts Card (Link → /artifacts?tab=mine)
│   │   │   ├── Random background image (10% opacity, 15% on hover)
│   │   │   ├── AnimatedArtifactsIcon
│   │   │   ├── Count display
│   │   │   └── "Artifacts" label
│   │   └── Collections Card (Link → /collections?tab=mine)
│   │       ├── Random background image (10% opacity, 15% on hover)
│   │       ├── LayoutGrid icon
│   │       ├── Count display
│   │       └── "Collections" label
│   │
│   ├── Continue Where You Left Off
│   │   ├── Header (flex justify-between)
│   │   │   ├── "Continue Where You Left Off" title
│   │   │   └── "View All" link → /artifacts?tab=mine
│   │   └── 3-column grid
│   │       ├── 5 recent artifacts (ArtifactCardCompact, singleLineTitle=true)
│   │       └── Add Artifact card (dashed border)
│   │           └── AnimatedArtifactsIcon + "Add Artifact"
│   │
│   └── Your Collections
│       ├── Header (flex justify-between)
│       │   ├── "Your Collections" title
│       │   └── "View All" link → /collections?tab=mine
│       └── Responsive grid (md:grid-cols-2 lg:grid-cols-3)
│           ├── 5 recent collections (CollectionCard, mode="mine")
│           │   └── Excludes "Uncategorized" collection
│           └── Add Collection card (dashed border)
│               └── LayoutGrid icon + "Add Collection"
```

### Key Features

#### Interactive Elements

1. **Clickable Username Pill**
   - Links to `/profile` page
   - Hover effect: `bg-primary/15`
   - Shows display name or email username

2. **Logout Button**
   - Icon-only outlined button
   - Same height as username pill (34px)
   - Calls `/api/auth/signout` endpoint
   - Redirects to `/` after sign out

3. **Stat Cards with Backgrounds**
   - Random media from user's artifacts used as backgrounds
   - Images refresh on every page load (Fisher-Yates shuffle)
   - 10% opacity normally, 15% on hover
   - Click navigates to respective "My" tabs

4. **View All Links**
   - Styled like logged-out homepage (muted → foreground on hover)
   - Include ArrowRight icon
   - Link to user's filtered views

5. **Add Cards**
   - Dashed border with hover effects
   - Match the card type size (artifact: square, collection: 3:2 aspect)
   - Show appropriate icons (AnimatedArtifactsIcon, LayoutGrid)

#### Single-Line Titles

The `ArtifactCardCompact` component accepts a `singleLineTitle` prop:
- Default: 2 lines with `line-clamp-2`
- Homepage: 1 line with `line-clamp-1` and truncation
- Only applied to homepage, not elsewhere in app

### Data Fetching

```tsx
async function getUserDashboardData(userId: string) {
  const supabase = await createClient()

  // Fetch user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, created_at")
    .eq("id", userId)
    .single()

  // Fetch recent artifacts (sorted by last edited)
  const { artifacts: recentArtifacts } = await getMyArtifactsPaginated(userId, {
    limit: 9,
    sortBy: "last-edited",
  })

  // Fetch user collections
  const { collections } = await getMyCollectionsPaginated(userId, 6)

  // Get stats
  const [artifactsCount, collectionsCount] = await Promise.all([
    supabase.from("artifacts").select("*", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("collections").select("*", { count: "exact", head: true }).eq("user_id", userId),
  ])

  // Collect all visual media URLs (images and videos, no audio) for random backgrounds
  const allVisualMedia: string[] = []
  recentArtifacts.forEach((artifact) => {
    const mediaUrls = artifact.media_urls as string[] | undefined
    if (mediaUrls) {
      mediaUrls.forEach((url) => {
        if (isImageUrl(url) || isVideoUrl(url)) {
          allVisualMedia.push(url)
        }
      })
    }
  })

  // Fisher-Yates shuffle and pick 2 random images for stat card backgrounds
  const shuffledMedia = [...allVisualMedia]
  for (let i = shuffledMedia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffledMedia[i], shuffledMedia[j]] = [shuffledMedia[j], shuffledMedia[i]]
  }
  const statBackgrounds = {
    artifacts: shuffledMedia[0] || null,
    collections: shuffledMedia[1] || shuffledMedia[0] || null,
  }

  return {
    profile,
    recentArtifacts,
    collections,
    stats: {
      artifactsCount: artifactsCount.count || 0,
      collectionsCount: collectionsCount.count || 0,
    },
    statBackgrounds,
  }
}
```

**Key Points:**
- Uses Fisher-Yates shuffle for true randomness
- Backgrounds refresh on every page load (`force-dynamic`)
- Falls back gracefully if no media available
- Excludes audio files from backgrounds (visual media only)

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
- **Max-width constraint**: Content capped at `max-w-7xl` (1280px) per section
- Background elements (gradients, floating images) remain full-width

### Desktop Width Constraint

All pages use `max-w-7xl` (1280px) for consistent desktop appearance:

```tsx
// Logged-out homepage: each section constrains its own content
<section className="py-16">
  <div className="max-w-7xl mx-auto px-4">
    {/* Content */}
  </div>
</section>

// AppLayout (logged-in pages): main content area constrained
<main className="max-w-7xl mx-auto px-4">
  {children}
</main>
```

### Carousel Edge Fades

The `ArtifactsCarousel` component uses CSS masks to fade cards at edges:

```tsx
<div
  style={{
    maskImage: "linear-gradient(to right, transparent, black 2rem, black calc(100% - 2rem), transparent)",
    WebkitMaskImage: "linear-gradient(to right, transparent, black 2rem, black calc(100% - 2rem), transparent)",
  }}
>
  {/* Cards */}
</div>
```

This creates a smooth fade effect that works on any background color.

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
