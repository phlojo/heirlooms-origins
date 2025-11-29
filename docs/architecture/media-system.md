# Media System Architecture

**Status:** Production
**Last Updated:** 2025-11-28

## Overview

The Heirlooms media system uses a **unified media model** where all user-uploaded media is stored centrally and can be referenced by artifacts in different contexts. This enables:

- **Gallery**: Curated showcase at top of artifact pages
- **Media Blocks**: Inline media within narrative content
- **Media Picker**: Shared library for selecting existing media

## Core Concepts

### Terminology

| Term | Definition |
|------|------------|
| **Media** | Any uploaded file (image, video, audio) |
| **Gallery** | Horizontal carousel showcase at top of artifact |
| **Media Block** | Inline media embedded in narrative content |
| **Media Picker** | Dialog for selecting from user's media library |

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      Artifact Page                          │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐   │
│  │                    GALLERY                           │   │
│  │  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐                    │   │
│  │  │     │ │     │ │     │ │     │  ← Flickity        │   │
│  │  │ IMG │ │ VID │ │ IMG │ │ IMG │    carousel        │   │
│  │  │     │ │     │ │     │ │     │                    │   │
│  │  └─────┘ └─────┘ └─────┘ └─────┘                    │   │
│  │  role="gallery", ordered by sort_order              │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │               NARRATIVE CONTENT                      │   │
│  │                                                       │   │
│  │  "This watch belonged to my grandfather..."          │   │
│  │                                                       │   │
│  │  ┌──────────────────┐  ← MEDIA BLOCK                 │   │
│  │  │                  │    role="inline_block"         │   │
│  │  │   Detail Photo   │                                │   │
│  │  │                  │                                │   │
│  │  └──────────────────┘                                │   │
│  │                                                       │   │
│  │  "Notice the intricate engravings..."                │   │
│  │                                                       │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Independence Principle

**Gallery and Media Blocks are completely independent**. They:

1. **Draw from the same pool** (user_media table via Media Picker)
2. **Operate independently** - Adding to gallery doesn't affect blocks
3. **Have separate ordering** - Each maintains its own sort_order
4. **Can share media** - Same image can appear in both (via different artifact_media links)

### Data Flow

```
                    ┌──────────────────┐
                    │   user_media     │
                    │  (Media Library) │
                    └────────┬─────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
              ▼                             ▼
      ┌───────────────┐            ┌───────────────┐
      │ artifact_media │            │ artifact_media │
      │ role="gallery" │            │role="inline"   │
      └───────────────┘            └───────────────┘
              │                             │
              ▼                             ▼
      ┌───────────────┐            ┌───────────────┐
      │    Gallery    │            │  Media Block  │
      │   Component   │            │   Component   │
      └───────────────┘            └───────────────┘
```

### Media Picker Integration

When adding media to **either** Gallery or Blocks:

1. **Media Picker dialog opens** - Shows all user's uploaded media
2. **Two options**:
   - "Choose from Library" - Select existing media
   - "Upload New" - Upload new file (creates user_media record)
3. **Creates artifact_media link** - With appropriate role ("gallery" or "inline_block")
4. **Both sections see updates** - Library is shared, links are independent

## Database Schema

### user_media (Central Library)

```sql
CREATE TABLE user_media (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  public_url TEXT NOT NULL,
  filename TEXT,
  mime_type TEXT,
  size_bytes BIGINT,
  storage_provider TEXT DEFAULT 'supabase',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### artifact_media (Role-based Links)

```sql
CREATE TABLE artifact_media (
  id UUID PRIMARY KEY,
  artifact_id UUID REFERENCES artifacts(id),
  media_id UUID REFERENCES user_media(id),
  role TEXT NOT NULL,  -- 'gallery', 'inline_block', 'cover'
  sort_order INTEGER DEFAULT 0,
  is_primary BOOLEAN DEFAULT FALSE,
  caption_override TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(artifact_id, media_id, role)
);
```

### Roles Explained

| Role | Purpose | Location |
|------|---------|----------|
| `gallery` | Showcase carousel | Top of artifact page |
| `inline_block` | Narrative media | Within content blocks |
| `cover` | Thumbnail/preview | Collection grid, search results |

## Component Architecture

### View Mode Components

| Component | File | Library |
|-----------|------|---------|
| Gallery Carousel | `artifact-media-gallery.tsx` | Flickity |
| Media Block Viewer | `media-block.tsx` | Native |

### Edit Mode Components

| Component | File | Library |
|-----------|------|---------|
| Gallery Editor | `artifact-gallery-editor.tsx` | @dnd-kit |
| Block Media Picker | `add-media-modal.tsx` | - |
| Media Library Picker | `media-picker.tsx` | - |

## Key Behaviors

### Adding Media

**To Gallery:**
1. Click "Add to Gallery" button
2. MediaPicker opens showing user's library
3. Select existing or upload new
4. Creates `artifact_media` with `role="gallery"`
5. Gallery updates with new item at end

**To Media Block:**
1. Click "Add Block(s)" button
2. AddMediaModal opens showing upload options
3. Upload new or select from library
4. Creates `artifact_media` with `role="inline_block"`
5. Block appears in narrative content

### Ordering

- **Gallery**: Drag-to-reorder via @dnd-kit, auto-saves
- **Blocks**: Order determined by position in content JSON

### Deletion

- **From Gallery/Block**: Removes `artifact_media` link only
- **From Library**: Removes `user_media` AND all `artifact_media` links (cascade)

## Storage Architecture

See `MEDIA-ARCHITECTURE.md` for full details on:
- Supabase Storage for originals
- Cloudinary fetch for derivatives
- Pending uploads and cleanup

## Related Documentation

- `MEDIA-ARCHITECTURE.md` - Storage layer details
- `docs/guides/artifact-gallery-editor.md` - Gallery editor implementation
- `docs/operations/cron-jobs.md` - Media cleanup automation
