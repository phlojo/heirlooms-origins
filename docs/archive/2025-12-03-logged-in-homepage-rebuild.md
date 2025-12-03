# Logged-In Homepage Rebuild

**Date**: 2025-12-03
**Status**: Complete
**Related**: Supersedes [2025-12-02-homepage-ux-improvements.md](2025-12-02-homepage-ux-improvements.md)

## Overview

Complete rebuild of the logged-in homepage from scratch, creating a focused dashboard experience with key metrics, recent content, and quick actions.

## Goals

1. Create a clean, scannable dashboard
2. Provide quick access to recent work
3. Show user metrics with visual interest
4. Reduce cognitive load compared to previous design
5. Ensure mobile-first responsive design

## What Was Removed

The previous logged-in homepage included:
- "Start Something New" action cards (4 cards)
- Horizontal scrolling carousel for recent artifacts
- Complex empty states for each section

These were removed to focus on content and navigation efficiency.

## New Implementation

### Section Breakdown

#### 1. Header
- **Component**: `HeirloomsLogoBadge` + "Heirlooms (Beta)"
- **Theme Toggle**: Icon-only button (mobile only, `lg:hidden`)
- **Purpose**: Consistent branding across all pages

#### 2. Welcome Message
- **Format**: "Welcome back, {username}"
- **Username Pill**:
  - Clickable link to `/profile`
  - Rounded full background (`bg-primary/10`)
  - Hover effect (`hover:bg-primary/15`)
  - Shows `display_name` or email username
- **Logout Button**:
  - Outlined variant (`variant="outline"`)
  - Icon-only (`LogOut` icon)
  - Height matches pill (34px)
  - Calls `/api/auth/signout` → redirects to `/`

#### 3. Quick Stats Cards
Two side-by-side cards showing counts:

**Artifacts Card**:
- Links to `/artifacts?tab=mine`
- Shows `AnimatedArtifactsIcon`
- Displays artifact count
- Random background image (10% opacity, 15% on hover)

**Collections Card**:
- Links to `/collections?tab=mine`
- Shows `LayoutGrid` icon
- Displays collection count
- Random background image (10% opacity, 15% on hover)

**Background Images**:
- Selected randomly from user's media using Fisher-Yates shuffle
- Refresh on every page load (`force-dynamic`)
- Only visual media (images + videos, no audio)
- Fallback to no background if no media

#### 4. Continue Where You Left Off
**Layout**: 3-column grid (3x2)
- **Content**: 5 most recent artifacts (sorted by `last-edited`)
- **Card Type**: `ArtifactCardCompact` with `singleLineTitle={true}`
- **6th Card**: "Add Artifact" card
  - Dashed border (`border-2 border-dashed`)
  - AnimatedArtifactsIcon
  - Links to `/artifacts/new`
  - Hover effects (border → primary, shadow appears)

**Header**:
- Title: "Continue Where You Left Off"
- "View All" link → `/artifacts?tab=mine`
  - Styled with `ArrowRight` icon
  - Muted text with hover transition

**Empty State**: Shows only "Add Artifact" card if no artifacts

#### 5. Your Collections
**Layout**: Responsive grid
- Mobile: 1 column
- Tablet (`md`): 2 columns
- Desktop (`lg`): 3 columns

**Content**: 5 most recent collections
- **Card Type**: `CollectionCard` with `mode="mine"`
- **Filter**: Excludes "Uncategorized" collection
- **6th Card**: "Add Collection" card
  - Dashed border (same style as artifact card)
  - LayoutGrid icon
  - Links to `/collections/new`
  - Aspect ratio matches collection cards (3:2)

**Header**:
- Title: "Your Collections"
- "View All" link → `/collections?tab=mine`

**Empty State**: Shows only "Add Collection" card if no collections

## Technical Details

### Component Changes

#### ArtifactCardCompact Enhancement
Added `singleLineTitle` prop to support single-line truncation:

```typescript
interface ArtifactCardCompactProps {
  // ... existing props
  singleLineTitle?: boolean
}

// In component:
<h3 className={`font-medium text-xs leading-tight ${singleLineTitle ? 'line-clamp-1' : 'line-clamp-2'}`}>
  {artifact.title}
</h3>
```

**Usage**: Only enabled on homepage (`singleLineTitle={true}`), everywhere else uses default 2-line clamp.

### Data Fetching Improvements

#### Fisher-Yates Shuffle
Replaced `Array.sort(() => Math.random() - 0.5)` with proper Fisher-Yates shuffle:

```typescript
const shuffledMedia = [...allVisualMedia]
for (let i = shuffledMedia.length - 1; i > 0; i--) {
  const j = Math.floor(Math.random() * (i + 1))
  ;[shuffledMedia[i], shuffledMedia[j]] = [shuffledMedia[j], shuffledMedia[i]]
}
```

**Benefit**: True random distribution, matches pattern used in logged-out homepage

#### Page Directive
```typescript
export const dynamic = "force-dynamic"
```

Ensures:
- No static generation or caching
- Fresh data on every page load
- Random backgrounds change each visit

### Responsive Design

#### Width Constraints
All sections use `w-full min-w-0` to prevent overflow:
- Main container
- Section headers
- Grid layouts
- Stat cards

**Mobile Edge Case**: Cards wrap properly with `gap-3` spacing, no horizontal scroll

#### Grid Breakpoints
```typescript
// Artifacts: 3-column fixed
grid-cols-3

// Collections: Responsive
grid gap-2 md:grid-cols-2 lg:grid-cols-3
```

### Styling Patterns

#### "View All" Links
Consistent with logged-out homepage:
```typescript
className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
```

#### Add Cards
```typescript
// Dashed border with hover
className="border-2 border-dashed border-muted-foreground/30 hover:border-primary hover:shadow-lg bg-transparent hover:bg-muted/30"
```

#### Stat Card Backgrounds
```typescript
<div
  className="absolute inset-0 bg-cover bg-center opacity-10 group-hover:opacity-15 transition-opacity"
  style={{ backgroundImage: `url(${background})` }}
/>
```

## Testing

All relevant tests pass with no regressions:
- ✅ Artifact card tests (21/21)
- ✅ Collection card tests (30/30)
- ✅ Media utility tests (42/42)
- ✅ Media action tests (49/49)

**Total**: 142 tests passed

## File Changes

### Modified Files
- `components/homepage/logged-in-homepage.tsx` - Complete rebuild
- `components/artifact-card-compact.tsx` - Added `singleLineTitle` prop
- `app/page.tsx` - Updated Fisher-Yates shuffle for backgrounds
- `docs/guides/homepage.md` - Updated documentation

### No Breaking Changes
- All component props remain backward compatible
- `singleLineTitle` defaults to `false` (2-line behavior)
- Existing usages of components unchanged

## Performance Considerations

### Page Load
- Server-side rendering with fresh data
- No client-side data fetching
- Minimal client JavaScript (logout handler only)

### Image Optimization
- Background images use Cloudinary transformations
- Lazy loading for off-screen cards
- Proper image sizing via `getThumbnailUrl()`

### Shuffle Performance
- Fisher-Yates runs once on server
- O(n) time complexity
- Minimal overhead for typical media counts

## Future Enhancements

Potential additions (not implemented):
- Activity feed showing recent edits across artifacts
- Quick stats trends (e.g., "5 new this week")
- Pinned/favorite collections
- Recent collaborators or shared items
- Drag-and-drop quick upload zone

## Migration Notes

No migration needed - this is a UI-only change. All data structures and APIs remain the same.

## Decision Log

### Why rebuild from scratch?
The previous design had too many sections competing for attention. Starting fresh allowed us to focus on the most important user needs: seeing their content and taking action.

### Why 3x2 grid for artifacts?
- Shows meaningful preview (6 items)
- Maintains visual hierarchy
- Leaves space for "Add" card
- No horizontal scrolling issues on mobile

### Why random backgrounds on stats?
- Adds visual interest without clutter
- Uses user's own content (personalization)
- Subtle at 10% opacity (doesn't compete with text)
- Changes on reload (feels fresh)

### Why single-line titles?
- Grid density is important for overview
- Prevents card height inconsistency
- Full title still visible on hover (future enhancement)
- Not needed elsewhere (artifact detail page has space)

### Why exclude "Uncategorized" collection?
- System collection, not user-created
- Shows up in collections tab anyway
- Focuses attention on intentional collections
- Reduces visual clutter

## Lessons Learned

1. **Start from user needs**: The rebuild focused on "what do users need to do?" rather than "what can we show?"
2. **Visual hierarchy matters**: Two clear sections (artifacts, collections) > four competing sections
3. **Subtle background images work**: 10% opacity is enough for interest without distraction
4. **Fisher-Yates is worth it**: Proper randomization feels better than `sort(random)`
5. **Single-line truncation improves scanning**: Grid views benefit from consistent card heights

## References

- [Homepage Guide](../guides/homepage.md) - Updated documentation
- [Previous Implementation](2025-12-02-homepage-ux-improvements.md) - Superseded design
- [Card Design Updates](../guides/card-design-updates.md) - Card component patterns
