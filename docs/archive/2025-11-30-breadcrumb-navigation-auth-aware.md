# Auth-Aware Breadcrumb Navigation & Animation Fixes

**Date**: 2025-11-30
**Branch**: userbugs-112905

## Summary

This update improves the artifact breadcrumb navigation with auth-aware routing and adds edit mode confirmation dialogs. Also fixes a visual glitch in the animated artifacts icon.

## Changes

### 1. Animated Artifacts Icon Fix

**File**: `components/navigation/animated-artifacts-icon.tsx`

**Problem**: The icon animation had a visible "shift" during cross-fade transitions when two icons overlapped momentarily.

**Solution**: Changed from cross-fade (two overlapping icons) to sequential fade (single icon with fade out → switch → fade in):

- Phase 1: Fade out current icon (400ms)
- Phase 2: Switch to next icon, fade in (400ms)
- Phase 3: Hold visible (1000ms)
- Total cycle: 1800ms

### 2. Auth-Aware Breadcrumb Navigation

**File**: `components/artifact-breadcrumb.tsx`

**Changes**:
- **Logged in**: Shows "My Collections" → navigates to `/collections?tab=mine`
- **Not logged in**: Shows "Collections" → navigates to `/collections?tab=all`
- **Collection link**: Uses slug-based URL `/collections/${slug}` (fixed 404 bug)

### 3. Edit Mode Navigation Confirmation

**Files**:
- `components/artifact-breadcrumb.tsx`
- `components/artifact-sticky-nav.tsx`
- `components/artifact-detail-view.tsx`

**Behavior**:
- In edit mode, clicking breadcrumb links shows a confirmation dialog if there are unsaved changes
- Dialog warns: "You have unsaved changes. If you leave now, your changes will be lost."
- Two options: "Stay and keep editing" or "Leave without saving"
- Leaving triggers `onAbandonChanges` callback to clean up pending uploads

### 4. Collections Tab URL Sync

**File**: `components/collections-tabs.tsx`

**Changes**:
- Tab selection now reads from URL query param (`?tab=mine` or `?tab=all`)
- URL param takes priority over sessionStorage
- Enables deep linking to specific tabs from breadcrumb navigation

## Props Added

### ArtifactBreadcrumbProps
```typescript
interface ArtifactBreadcrumbProps {
  collectionId?: string
  collectionSlug?: string
  collectionName?: string
  isLoggedIn?: boolean        // NEW: Controls label and destination
  isEditMode?: boolean        // NEW: Shows confirmation dialog
  hasUnsavedChanges?: boolean // NEW: Determines if dialog shown
  onAbandonChanges?: () => Promise<void> // NEW: Cleanup callback
}
```

### ArtifactStickyNavProps
```typescript
// Added props
isLoggedIn?: boolean
hasUnsavedChanges?: boolean
onAbandonChanges?: () => Promise<void>
```

## Bug Fixes

- **404 on collection breadcrumb**: Was constructing URL as `/collections/${id}/${slug}` but route is `/collections/[slug]`. Fixed to use slug-only URL.

## Test Results

- **528 tests passed** (19 test files, 1 skipped)
- No regressions detected

## Files Modified

1. `components/navigation/animated-artifacts-icon.tsx` - Sequential fade animation
2. `components/artifact-breadcrumb.tsx` - Auth-aware routing + edit mode confirmation
3. `components/artifact-sticky-nav.tsx` - Pass through new props
4. `components/artifact-detail-view.tsx` - Added handleAbandonChanges callback
5. `components/collections-tabs.tsx` - URL query param handling
6. `app/artifacts/[slug]/page.tsx` - Added isLoggedIn prop for view mode
