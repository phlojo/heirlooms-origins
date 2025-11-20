# Artifact Gallery Feature - Design Document

**Status**: Planning / Not Yet Implemented  
**Date**: 2025-01-18

## Overview

Introduce an artifact gallery - a series of images/videos displayed at the very top of an artifact that can be scrolled left to right. This serves as a visual showcase before the narrative content begins.

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

## Implementation Requirements

### Database Changes
- Gallery images need separate storage/relationship
- Options:
  - New `gallery_images` junction table
  - Add `is_gallery` boolean flag to existing media
  - Add `display_order` for gallery image ordering

### Component Changes
- **Gallery Upload Control**: New dedicated upload component for gallery media
- **Gallery Display Component**: Horizontal scrolling carousel at top of artifact
- **Enhanced Media Block Picker**: Modal/tabbed interface with "From Gallery" vs "Upload New"
- **Order Management**: Drag-drop interface for reordering gallery images

### User Flow
1. Create/Edit Artifact
2. **Gallery Section** (first step) - Upload showcase media
3. Title & Description
4. Collection Selection
5. **Narrative Blocks** - Insert media (from gallery or new), text, audio, etc.

## Benefits

- **Visual Hierarchy**: Showcases most important/beautiful media first
- **Modern UX Pattern**: Familiar from product pages, real estate, social media
- **Emotional Impact**: Strong first impression for memory/heirloom content
- **Cleaner Structure**: Separates showcase media from narrative media

## Open Questions

1. Should gallery swipe override artifact-to-artifact swipe, or use different gesture?
2. Max number of gallery images? (Recommend 10-15 for performance)
3. Video handling in gallery - autoplay muted? Play on tap?
4. Mobile optimization for upload flow?

## Next Steps

1. Design gallery upload control UI
2. Design gallery carousel component
3. Create database schema for gallery media
4. Implement gallery display (view mode)
5. Implement gallery editing (edit mode)
6. Enhance media block picker with "from gallery" option
7. Handle swipe gesture conflicts
8. Test with various media counts and aspect ratios

---

**Reference Conversation**: Block duplication - Artifact Gallery brainstorm session
