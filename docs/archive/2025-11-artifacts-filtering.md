# Artifacts Filtering & Sorting System

## Overview

This document details the multi-phase implementation of filtering and sorting functionality for the Heirlooms application. Phase 1 focuses on the Artifacts page, with subsequent phases extending to Collections and adding advanced features.

## Table of Contents

- [Phase 1: Artifacts Filtering & Sorting](#phase-1-artifacts-filtering--sorting)
- [Phase 2: Collections Extension](#phase-2-collections-extension)
- [Phase 3+: Advanced Features](#phase-3-advanced-features)
- [Architecture](#architecture)
- [Implementation Details](#implementation-details)
- [Testing](#testing)

---

## Phase 1: Artifacts Filtering & Sorting

**Status:** ✅ Completed

### Features Implemented

#### 1. Sort Options (5 total)
- **Newest First** (default) - Sort by `created_at` DESC
- **Oldest First** - Sort by `created_at` ASC
- **Title A–Z** - Sort by `title` ASC
- **Title Z–A** - Sort by `title` DESC
- **Last Edited** - Sort by `updated_at` DESC

#### 2. Type Filtering
- Multi-select filter for artifact types
- Dynamically pulls available types from database (`artifact_types` table)
- Smart toggle logic:
  - "All Types" selected by default (no filter applied)
  - Clicking a type when "All" is selected switches to only that type
  - Selecting all types returns to "All Types" state
  - Query optimization: empty array = no filter (better performance)

#### 3. UI Components
- **FilterBar** - Container component with horizontal layout
- **SortDropdown** - Select component with ArrowUpDown icon
- **TypeFilter** - Popover with checkboxes for multi-select
- **Clear Filters** button - Only appears when filters are active
- Responsive design:
  - Mobile: Abbreviated labels ("All" vs "All Types", just count vs "X selected")
  - Desktop: Full labels with "Sort:" and "Type:" prefixes
  - Width adjustments: Sort 148px mobile / 180px desktop, Type 140px / 180px

#### 4. URL State Management
- Filters stored in URL search parameters for shareable links
- Format: `/artifacts?sort=newest&types=type1,type2`
- Persists across page reloads
- `parseSortParam()` and `parseTypeParams()` validate URL parameters
- `buildFilterParams()` constructs URL from filter state

#### 5. Data Fetching
- Modified server actions to accept `ArtifactQueryOptions`:
  \`\`\`typescript
  interface ArtifactQueryOptions {
    limit?: number
    cursor?: {
      createdAt?: string
      updatedAt?: string
      title?: string
      id: string
    }
    sortBy?: SortOption
    typeIds?: string[]
  }
  \`\`\`
- Dynamic cursor-based pagination adapts to sort field
- Type filtering via Supabase `.in()` query

#### 6. Enhanced Empty States
- Contextual messages based on active filters:
  - "No artifacts match your filters" (when filters active)
  - "No artifacts yet" (when no filters)
- Preserves existing empty state styling

#### 7. Behavior Details
- Filter state resets appropriately:
  - Type filters reset when switching tabs (My Artifacts ↔ Community)
  - Sort order persists across tab switches
- Refetch logic triggers on filter changes
- Initial server-side filtering for faster page loads

### Files Created

\`\`\`
lib/utils/artifact-filters.ts         # Filter utilities and parsing functions
components/artifacts/sort-dropdown.tsx # Sort selector component
components/artifacts/type-filter.tsx   # Type multi-select component
components/artifacts/filter-bar.tsx    # Container component
\`\`\`

### Files Modified

\`\`\`
lib/actions/artifacts.ts               # Added ArtifactQueryOptions, dynamic sorting/filtering
components/artifacts-tabs.tsx          # Integrated filters, URL management, refetch logic
app/artifacts/page.tsx                 # Parse URL params, fetch types, pass to components
\`\`\`

### Key Code Patterns

#### Cursor Generation (Dynamic Based on Sort)
\`\`\`typescript
const getCursor = (artifact: Artifact, sort: SortOption) => {
  switch (sort) {
    case "newest":
    case "oldest":
      return { createdAt: artifact.created_at, id: artifact.id }
    case "title-asc":
    case "title-desc":
      return { title: artifact.title, id: artifact.id }
    case "last-edited":
      return { updatedAt: artifact.updated_at, id: artifact.id }
  }
}
\`\`\`

#### Smart Type Toggle Logic
\`\`\`typescript
const handleToggleType = (typeId: string) => {
  if (allSelected) {
    // Selecting from "All" state = only this type
    onChange([typeId])
  } else if (selectedTypes.includes(typeId)) {
    const newTypes = selectedTypes.filter((id) => id !== typeId)
    // Last one removed = back to "All"
    onChange(newTypes.length === 0 ? [] : newTypes)
  } else {
    const newTypes = [...selectedTypes, typeId]
    // All types selected = back to "All"
    onChange(newTypes.length === types.length ? [] : newTypes)
  }
}
\`\`\`

#### URL State Management
\`\`\`typescript
const updateURL = (sort: SortOption, typeIds: string[]) => {
  const params = buildFilterParams(sort, typeIds)
  router.push(`/artifacts${params ? `?${params}` : ""}`, { scroll: false })
}
\`\`\`

---

## Phase 2: Collections Extension

**Status:** 🔄 Planned (Not Yet Implemented)

### Goals

Extend the filtering and sorting system to the Collections page using the same modular architecture from Phase 1.

### Planned Features

#### 1. Sort Options for Collections
- **Newest First** (default) - Sort by `created_at` DESC
- **Oldest First** - Sort by `created_at` ASC
- **Title A–Z** - Sort by `title` ASC
- **Title Z–A** - Sort by `title` DESC
- **Last Edited** - Sort by `updated_at` DESC
- **Most Items** - Sort by artifact count DESC (requires join/aggregation)
- **Fewest Items** - Sort by artifact count ASC

#### 2. Type Filtering for Collections
- Filter by artifact types **contained within** collections
- Multi-select with same UX as artifacts
- Query challenge: Need to filter collections that contain artifacts of selected types
  - Approach 1: Join to `collection_artifacts` → `artifacts` → filter by `type_id`
  - Approach 2: Use `EXISTS` subquery
- Consider "Match any type" vs "Match all types" logic

#### 3. Collection-Specific Filters
- **Privacy Filter**:
  - All (default)
  - Public only
  - Private only (My Collections tab only)
- **Size Filter** (optional):
  - Empty collections
  - Small (1-5 items)
  - Medium (6-20 items)
  - Large (21+ items)

#### 4. Reusable Components
- Reuse `SortDropdown` component (different options config)
- Reuse `TypeFilter` component (same logic)
- Create `CollectionFilterBar` that includes collection-specific filters
- Share filter utilities where possible

### Implementation Strategy

1. **Create collection filter utilities** (`lib/utils/collection-filters.ts`)
   - Similar to `artifact-filters.ts` but with collection-specific options
   - Share type parsing utilities

2. **Extend server actions** (`lib/actions/collections.ts`)
   - Add `CollectionQueryOptions` interface
   - Implement dynamic sorting with cursor pagination
   - Handle type filtering with proper joins
   - Add privacy and size filtering

3. **Create/modify components**
   - Reuse: `SortDropdown`, `TypeFilter`
   - New: `CollectionFilterBar` (similar to `FilterBar`)
   - Modify: `collections-tabs.tsx` (add filter integration)

4. **Update page** (`app/collections/page.tsx`)
   - Parse URL parameters
   - Fetch with initial filters
   - Pass to components

### Technical Considerations

- **Type filtering complexity**: Collections don't have a direct `type_id`
  - Need to aggregate from contained artifacts
  - Performance: Consider indexed queries, limit joins
  - UX: "Collections containing artifacts of type X"

- **Artifact count sorting**: Requires aggregation
  - Option 1: Add computed column to `collections` table (denormalized)
  - Option 2: Perform join/count in query (normalized, slower)
  - Recommendation: Start with Option 2, optimize later if needed

- **Privacy filtering**:
  - Only applies to authenticated users
  - Community tab: Only show public collections
  - My Collections tab: Show both, allow filtering

---

## Phase 3+: Advanced Features

**Status:** 💡 Future Enhancements

### Potential Features

#### 1. Search Functionality
- **Text search** across artifact/collection titles and descriptions
- **Debounced input** for performance
- Search within filtered results
- Highlight matching terms
- Consider full-text search (PostgreSQL `tsvector`) for better performance

#### 2. Date Range Filtering
- Filter by creation date range
- Filter by last edited date range
- Preset ranges: Today, This Week, This Month, This Year
- Custom date picker

#### 3. Advanced Type Filtering
- **AND vs OR logic toggle**:
  - OR (current): Show artifacts of any selected type
  - AND: Show collections containing all selected types
- **Type groups/categories** (if types are categorized in future)

#### 4. User/Author Filtering
- Filter artifacts by author (Community tab)
- Autocomplete for user search
- "My favorites" filter (if favorites feature added)

#### 5. Tag System
- Add tags to artifacts/collections
- Multi-select tag filtering
- Tag autocomplete
- Popular tags suggestions

#### 6. Saved Filters / Presets
- Save frequently used filter combinations
- User-specific filter presets
- Share filter presets via URL
- Default filter preferences

#### 7. Sort Customization
- **Secondary sort**: Sort by title when dates are equal
- **Custom sort orders**: User-defined sorting rules
- **Drag-to-reorder** manual sorting (My Artifacts only)

#### 8. Bulk Actions with Filters
- Select all artifacts matching current filters
- Bulk edit, delete, add to collection
- Export filtered results

#### 9. Filter Analytics
- Track popular filter combinations
- Show filter usage stats to admins
- Optimize based on common queries

#### 10. Advanced Pagination
- Infinite scroll option (vs Load More button)
- Items per page selector (12, 24, 48, 96)
- Jump to page number
- Keyboard navigation (arrow keys, shortcuts)

### Implementation Priority (Recommended)

1. **High Priority**
   - Text search (Phase 3.1)
   - Date range filtering (Phase 3.2)

2. **Medium Priority**
   - User/author filtering (Phase 3.3)
   - Tag system (Phase 3.4)
   - Saved filters (Phase 3.5)

3. **Low Priority (UX enhancements)**
   - Sort customization (Phase 3.6)
   - Bulk actions (Phase 3.7)
   - Infinite scroll (Phase 3.8)

4. **Nice to Have (Analytics)**
   - Filter analytics (Phase 3.9)

---

## Architecture

### Modular Design Principles

The filtering system is built with modularity and reusability in mind:

1. **Separation of Concerns**
   - Filter utilities (`lib/utils/*-filters.ts`)
   - UI components (`components/artifacts/*`, `components/collections/*`)
   - Server actions (`lib/actions/*.ts`)
   - Page-level integration (`app/*/page.tsx`)

2. **Reusable Components**
   - `SortDropdown` - Configurable via `SORT_OPTIONS` constant
   - `TypeFilter` - Works with any list of types
   - Filter utilities can be shared across features

3. **URL as Source of Truth**
   - Shareable filtered views
   - Browser back/forward navigation works
   - No client-side state drift

4. **Server-Side Filtering**
   - Initial page load includes filtered data
   - SEO-friendly (if made public)
   - Reduced client-side JavaScript
   - Better performance for large datasets

5. **Progressive Enhancement**
   - Works without JavaScript (server-rendered)
   - Enhanced with client-side interactivity
   - Optimistic UI updates

### Data Flow

\`\`\`
User Action (change filter)
    ↓
Update Local State (sortBy, selectedTypes)
    ↓
Update URL Search Params (router.push)
    ↓
Trigger Refetch (server action)
    ↓
Server Queries Database (with filters)
    ↓
Return Filtered Results
    ↓
Update UI (artifacts list, empty states)
\`\`\`

### File Structure

\`\`\`
heirlooms-v0/
├── app/
│   ├── artifacts/
│   │   └── page.tsx                    # URL parsing, initial fetch
│   └── collections/
│       └── page.tsx                    # (Phase 2)
├── components/
│   ├── artifacts/
│   │   ├── filter-bar.tsx              # Container component
│   │   ├── sort-dropdown.tsx           # Reusable sort selector
│   │   └── type-filter.tsx             # Reusable type multi-select
│   ├── collections/
│   │   └── collection-filter-bar.tsx   # (Phase 2)
│   ├── artifacts-tabs.tsx              # Filter integration, refetch logic
│   └── collections-tabs.tsx            # (Phase 2)
├── lib/
│   ├── actions/
│   │   ├── artifacts.ts                # Modified with ArtifactQueryOptions
│   │   ├── collections.ts              # (Phase 2)
│   │   └── artifact-types.ts           # Fetch types for filtering
│   └── utils/
│       ├── artifact-filters.ts         # Filter utilities
│       └── collection-filters.ts       # (Phase 2)
└── ARTIFACTS-FILTERING.md              # This document
\`\`\`

---

## Implementation Details

### Database Queries

#### Artifacts with Type Filtering
\`\`\`typescript
let query = supabase
  .from("artifacts")
  .select("*, artifact_type:artifact_types(*), author:profiles(*)")
  .eq("is_public", true)

// Apply type filter
if (typeIds && typeIds.length > 0) {
  query = query.in("type_id", typeIds)
}

// Apply sorting
const sortConfig = getSortConfig(sortBy)
query = query.order(sortConfig.field, { ascending: sortConfig.ascending })

// Apply cursor pagination
if (cursor) {
  const operator = sortConfig.ascending ? "gt" : "lt"
  query = query[operator](sortConfig.field, cursor[sortConfig.field])
}
\`\`\`

#### Collections with Type Filtering (Phase 2)
\`\`\`typescript
// Approach: Use EXISTS subquery to filter collections containing artifacts of selected types
let query = supabase
  .from("collections")
  .select(`
    *,
    author:profiles(*),
    collection_artifacts!inner(artifact:artifacts!inner(type_id))
  `)

// Apply type filter (collections containing ANY of the selected types)
if (typeIds && typeIds.length > 0) {
  query = query.in("collection_artifacts.artifact.type_id", typeIds)
}

// Note: This returns collections with at least one artifact of selected types
// For "contains ALL types" logic, more complex query needed
\`\`\`

### Performance Considerations

1. **Indexes**
   - Ensure indexes on `artifacts(created_at)`, `artifacts(updated_at)`, `artifacts(title)`
   - Index on `artifacts(type_id)` for type filtering
   - Compound index on `(type_id, created_at)` for filtered+sorted queries

2. **Query Optimization**
   - Avoid `SELECT *` in production (specify needed columns)
   - Limit join depth (don't over-fetch nested data)
   - Use `.limit()` appropriately (current: 24 items per page)

3. **Caching Strategy** (Future)
   - Consider caching popular filter combinations
   - Cache artifact types list (changes infrequently)
   - Use Supabase realtime subscriptions for live updates (advanced)

4. **Cursor Pagination**
   - More efficient than offset pagination for large datasets
   - Stable results even when new items are added
   - Requires consistent sort order

### Edge Cases Handled

1. **Invalid URL Parameters**
   - `parseSortParam()` returns "newest" default for invalid values
   - `parseTypeParams()` validates against actual type IDs from database
   - Malformed type lists ignored

2. **Empty Results**
   - Contextual empty states based on filter state
   - Clear filters button appears when no results with active filters

3. **Type Filter Logic**
   - Handles transition from "All" to specific types gracefully
   - Prevents invalid states (empty but not "all")
   - Returns to "All" when all types manually selected

4. **Tab Switching**
   - Type filters reset to prevent confusion (My Artifacts may have different types available)
   - Sort order persists (useful across tabs)

5. **Mobile Responsiveness**
   - Abbreviated labels prevent wrapping
   - Controls stay on same line even on narrow screens
   - Touch-friendly target sizes (h-9 = 36px)

---

## Testing

### Manual Testing Checklist

#### Phase 1 (Artifacts)
- [ ] Sort by each of the 5 options, verify correct order
- [ ] Filter by single type, verify only that type appears
- [ ] Filter by multiple types, verify union of types
- [ ] Select all types manually, verify returns to "All Types"
- [ ] Deselect last type, verify returns to "All Types"
- [ ] Combine sort + type filter, verify both apply
- [ ] Clear filters button appears when filters active
- [ ] Clear filters button resets to defaults (newest, all types)
- [ ] Switch tabs, verify type filter resets, sort persists
- [ ] Reload page with filters in URL, verify filters apply
- [ ] Share URL with filters, verify recipient sees filtered view
- [ ] Load more pagination works with filters
- [ ] Empty states show correct message (with/without filters)
- [ ] Mobile: Controls fit on one line, abbreviated labels
- [ ] Mobile: Popover/dropdown interactions work on touch

#### Phase 2 (Collections) - Future
- [ ] Sort by collection-specific options (Most Items, etc.)
- [ ] Filter by artifact types contained in collections
- [ ] Privacy filter (public/private) works
- [ ] Size filter works (empty, small, medium, large)
- [ ] Combined filters work correctly
- [ ] Performance is acceptable with large collection counts

### Automated Testing

Currently no automated tests for filtering system. Recommended tests:

1. **Unit Tests** (`lib/utils/artifact-filters.test.ts`)
   \`\`\`typescript
   describe("parseSortParam", () => {
     it("returns valid sort option", () => {
       expect(parseSortParam("newest")).toBe("newest")
     })
     it("returns default for invalid option", () => {
       expect(parseSortParam("invalid")).toBe("newest")
     })
   })

   describe("parseTypeParams", () => {
     it("parses comma-separated type IDs", () => {
       expect(parseTypeParams("id1,id2", ["id1", "id2", "id3"]))
         .toEqual(["id1", "id2"])
     })
     it("filters out invalid type IDs", () => {
       expect(parseTypeParams("id1,invalid", ["id1"]))
         .toEqual(["id1"])
     })
   })
   \`\`\`

2. **Integration Tests** (using Playwright or similar)
   - Test filter interactions in real browser
   - Verify URL updates
   - Test pagination with filters
   - Test mobile responsive behavior

3. **Database Query Tests**
   - Verify correct SQL generated for filter combinations
   - Test cursor pagination edge cases
   - Verify indexes are used (EXPLAIN ANALYZE)

---

## Future Considerations

### Accessibility
- Keyboard navigation through filters
- Screen reader announcements when filters change
- ARIA labels for filter controls
- Focus management (popover open/close)

### Internationalization (i18n)
- Translate sort option labels
- Translate filter labels and messages
- Right-to-left (RTL) layout support
- Locale-aware sorting (collation)

### Analytics
- Track which filters are most used
- Monitor performance of filtered queries
- A/B test filter UI variations
- Identify slow queries for optimization

### Mobile App Considerations
- Native filter UI components
- Gesture-based filter controls
- Bottom sheet for filter options
- Save filter preferences locally

---

## References

- Initial implementation: PR #XX (Phase 1)
- Related issues: #XX (filter feature request)
- Design discussion: [Link to design doc/Figma]
- Performance benchmarks: [Link to performance testing results]

---

## Changelog

### 2025-11-23 - Phase 1 Completed
- ✅ Implemented 5 sort options for artifacts
- ✅ Implemented multi-select type filtering
- ✅ Created FilterBar, SortDropdown, TypeFilter components
- ✅ Added URL state management
- ✅ Modified server actions for dynamic filtering/sorting
- ✅ Enhanced empty states
- ✅ Mobile responsive design
- ✅ Sort dropdown width adjustment (148px mobile for arrow clearance)

### Future
- 🔄 Phase 2: Collections extension
- 💡 Phase 3+: Advanced features (search, date range, tags, etc.)
