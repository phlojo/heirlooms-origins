# Artifact Gallery Feature - Design Document

**Status**: ✅ **Implemented**
**Date**: 2025-01-18 (Planning) | 2025-11-27 (Implementation Complete)

## Overview

Artifact gallery feature allows users to create a visual showcase at the top of artifact pages with horizontal scrolling/swiping media. The implementation uses **Flickity** for view mode (carousel display) and **@dnd-kit** for edit mode (drag-to-reorder management).

**Key Features:**
- Horizontal swipe/scroll carousel with touch support
- Drag-and-drop reordering in edit mode
- Auto-save with optimistic updates
- Support for images and videos
- Responsive design (desktop hover arrows, mobile touch)
- Seamless integration with unified media model

## Key Design Decisions

### Gallery Media Selection

**Dedicated Upload Control:**
- Gallery has its own separate media input control
- Media uploaded here goes exclusively to the gallery showcase
- Gallery is the **first and most important step** when creating/editing an artifact
- Gracefully displays a single image if only one media item is added

### Narrative Block Media Integration

**Enhanced Media Picker:**
When inserting a media block in the narrative section, users see two options:

1. **"Choose from Gallery"** - Select from existing gallery images
2. **"Upload New"** - Upload new media (goes only in this block, not gallery)

### Key Principles

- **Clear Intent**: Gallery = curated showcase, Blocks = narrative-specific media
- **No Auto-Magic**: Users consciously decide what's important for the gallery
- **Flexible Reuse**: Gallery images can be referenced in narrative without file duplication
- **Clean UX**: Gallery is the obvious first step - showcases best content immediately

## Visual & UX Considerations

### Gallery Behavior
- Horizontal scroll/swipe with subtle indicators (dots or thumbnails)
- Tap to expand fullscreen view
- Touch-friendly on mobile, elegant hover arrows on desktop
- Maintain consistent rounded corners and soft shadows per design system

### Visual Treatment
- Full-width or contained with padding (TBD)
- Consistent height (~60vh?) with object-fit for various aspect ratios
- Smooth transitions between images
- Works gracefully with single image (no minimum requirements)

### Technical Considerations
- **Swipe Gesture Conflict**: Current artifact-to-artifact swipe navigation might conflict with gallery swipe-through gestures (needs resolution)
- **No Gallery Case**: If artifact has no gallery media, skip gallery entirely

## Implementation Details

### Database Schema (✅ Implemented)
**Two-table unified media model:**
- `user_media` - Canonical storage for all user-uploaded media
- `artifact_media` - Junction table linking artifacts to media with roles

**Key fields in artifact_media:**
- `role`: 'gallery' | 'inline_block' | 'cover'
- `sort_order`: Integer for ordering within role
- `is_primary`: Boolean for primary media designation
- `caption_override`: Optional caption for this specific use

**Dual-write pattern:** Maintains both new tables AND legacy `artifacts.media_urls` array for backward compatibility.

### Component Architecture (✅ Implemented)

#### View Mode: `artifact-media-gallery.tsx`
**Library**: Flickity carousel
**Features:**
- Touch/swipe navigation
- Custom prev/next buttons (show/hide based on position)
- Page dots for position indicator
- Lazy loading (2 items ahead)
- Adaptive height
- Image fit toggle (tap to switch cover/contain)
- Auto-pause videos on slide change
- Responsive styling

#### Edit Mode: `artifact-gallery-editor.tsx`
**Library**: @dnd-kit (modern React drag-and-drop)
**Features:**
- Horizontal sortable list with `horizontalListSortingStrategy`
- Drag handle with GripVertical icon
- 64x64 thumbnails with type labels
- Add media via MediaPicker dialog
- Remove media with X button
- Auto-save on reorder (optimistic updates)
- Revert on error
- Toast notifications
- Empty state with dashed border

**Key Implementation Details:**
- Container height: 192px with hidden scrollbar
- Card spacing: 4px gap, 12px padding
- Sensors: PointerSensor + KeyboardSensor for accessibility
- No refetch after reorder (uses optimistic updates)
- Refetch only on add/remove operations

### User Flow (✅ Implemented)
**View Mode:**
1. Gallery displays at top of artifact page (if media exists)
2. User swipes/clicks to navigate through media
3. Tap image to toggle fit mode
4. Videos auto-pause when switching slides

**Edit Mode:**
1. Navigate to artifact edit page (`/artifacts/[slug]?mode=edit`)
2. Gallery section appears with "Add to Gallery" button
3. Click "Add to Gallery" → MediaPicker dialog
4. Select from existing library or upload new media
5. Drag media cards to reorder (auto-saves)
6. Click X to remove media (auto-saves)
7. Changes reflect instantly with optimistic updates

## Benefits

- **Visual Hierarchy**: Showcases most important/beautiful media first
- **Modern UX Pattern**: Familiar from product pages, real estate, social media
- **Emotional Impact**: Strong first impression for memory/heirloom content
- **Cleaner Structure**: Separates showcase media from narrative media

## Resolved Design Decisions

### 1. Swipe Gesture Conflicts (✅ Resolved)
**Decision**: Gallery swipe takes precedence, artifact-to-artifact navigation uses sticky nav arrows
**Implementation**:
- Flickity handles horizontal swipe for gallery navigation
- Artifact prev/next navigation moved to sticky nav at top
- No gesture conflicts

### 2. Gallery Image Limits (✅ Decided)
**Decision**: No hard limit enforced
**Rationale**:
- Lazy loading handles performance
- Users naturally limit to showcase items
- Horizontal scroll accommodates any count
- Can add soft limit/warning later if needed

### 3. Video Handling (✅ Implemented)
**Decision**: Videos show poster/thumbnail, user taps to play
**Implementation**:
- Videos display with `poster` attribute (uses thumbnailUrl)
- Native browser controls
- Preload metadata for first video only
- Auto-pause when switching slides

### 4. Mobile Optimization (✅ Implemented)
**Decision**: Touch-first design with responsive controls
**Implementation**:
- Touch/swipe native to Flickity
- MediaPicker dialog responsive
- Drag-and-drop works on touch devices
- Custom prev/next buttons with proper touch targets

## Technical Challenges & Solutions

### Challenge 1: Flickering on Reorder (Original Packery Implementation)
**Problem**: Using Packery + Draggabilly caused flickering due to React re-renders fighting with DOM manipulation
**Solution**: Switched to @dnd-kit, a React-first library that works with virtual DOM

### Challenge 2: Optimistic Updates
**Problem**: Noticeable delay after reordering while refetching from database
**Solution**:
- Maintain local state synced with prop
- Update UI immediately on drag end
- Save to database in background
- Revert on error

### Challenge 3: Reorder Unique Constraint Violations
**Problem**: Updating sort_order caused constraint violations when swapping positions
**Solution**: Two-phase update:
1. Set all items to negative temporary values
2. Set to final positive values
Ensures no conflicts during transition

### Challenge 4: Scrollbar UX
**Problem**: System scrollbar looked inconsistent with design
**Solution**: Hide scrollbar with CSS while keeping scroll functionality:
```css
.gallery-grid::-webkit-scrollbar { display: none !important; }
.gallery-grid { scrollbar-width: none !important; }
```

## Files Modified/Created

### New Files
- `components/artifact-media-gallery.tsx` - Flickity view component
- `components/artifact-gallery-editor.tsx` - @dnd-kit edit component
- `components/media-picker.tsx` - Media library selector
- `lib/types/media.ts` - TypeScript types
- `lib/actions/media.ts` - Server actions
- `scripts/012-015_*.sql` - Database migrations

### Modified Files
- `app/artifacts/[slug]/page.tsx` - Fetch gallery media
- `components/artifact-detail-view.tsx` - Render gallery
- `lib/schemas.ts` - Media validation schemas
- `app/globals.css` - Flickity custom styles
- `package.json` - Added flickity, @dnd-kit packages

## Performance Characteristics

**View Mode:**
- Lazy loading (2 slides ahead)
- First 2 images: `loading="eager"`
- Rest: `loading="lazy"`
- Derivatives via Cloudinary fetch URLs
- No JavaScript execution until gallery initializes

**Edit Mode:**
- Optimistic updates (no loading states)
- Debounced auto-save
- Single database query on reorder
- Efficient re-renders (React hooks pattern)

## Future Enhancements (Potential)

1. **Captions**: Per-media captions in gallery (schema supports `caption_override`)
2. **Cover Image**: Auto-set first gallery image as artifact cover
3. **Fullscreen View**: Lightbox/modal for full-screen media viewing
4. **Inline Block Reuse**: Use gallery media in narrative blocks (schema supports `inline_block` role)
5. **Batch Operations**: Select multiple media to delete/reorder
6. **Media Analytics**: Track which gallery media gets most engagement
7. **Video Autoplay**: Muted autoplay option for first video

## Testing Checklist

- [x] Gallery displays in view mode
- [x] Flickity carousel navigation works
- [x] Drag-to-reorder in edit mode
- [x] Add media via picker
- [x] Remove media
- [x] Auto-save on changes
- [x] Optimistic updates work
- [x] Error handling and reversion
- [x] Touch/swipe on mobile
- [x] Keyboard navigation
- [x] Empty state displays
- [x] Videos play correctly
- [x] Image fit toggle works
- [x] Backward compatibility with media_urls

---

**Reference Conversation**: Block duplication - Artifact Gallery brainstorm session
