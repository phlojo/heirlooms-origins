# Temp Media Reorganization Fix

**Date:** 2025-11-30
**Status:** Complete
**Related Bug:** UB-251129-01

---

## Summary

Fixed a critical bug where media files uploaded to the gallery were never moved from the temp folder to the artifact folder, causing visibility issues for non-owners.

---

## Problem

Users reported that media was visible to artifact owners but not to other users viewing public collections. Investigation revealed:

1. Large number of files stuck in Supabase Storage temp folders
2. Files belonged to saved artifacts (not abandoned uploads)
3. Gallery media was affected; media blocks less so

---

## Root Cause

`reorganizeArtifactMedia()` in `lib/actions/media-reorganize.ts` only processed URLs from `artifacts.media_urls`, which contains **media block URLs**.

Gallery URLs are stored separately in `user_media.public_url` via the `artifact_media` junction table and were **never processed**.

### The Bug Flow

1. User uploads image to gallery → file goes to `{userId}/temp/{timestamp}-{filename}`
2. `user_media` record created with temp URL
3. `artifact_media` link created (role="gallery")
4. Artifact saved → file removed from `pending_uploads` (marked as "saved")
5. `reorganizeArtifactMedia()` called but only reads `artifact.media_urls`
6. **Gallery URLs not in `media_urls`** → nothing to move
7. Files stay in temp folder indefinitely

### Why It Caused Visibility Issues

Temp folder has user-scoped RLS policies - only the owner can read files there. Once files are moved to the artifact folder, they become publicly accessible (for public collections).

---

## Fix Applied

### 1. `lib/actions/media-reorganize.ts`

Updated `reorganizeArtifactMedia()` to also fetch and process gallery URLs:

```typescript
// NEW: Also fetch gallery URLs from user_media via artifact_media
const { data: galleryLinks } = await supabase
  .from("artifact_media")
  .select("media:user_media(id, public_url)")
  .eq("artifact_id", artifactId)
  .eq("role", "gallery")

const galleryUrls = (galleryLinks || [])
  .map((link: any) => link.media?.public_url)
  .filter((url): url is string => !!url)

// Combine all URLs (deduplicated)
const allUrls = [...new Set([...mediaBlockUrls, ...galleryUrls])]
```

### 2. `app/api/cleanup-expired-uploads/route.ts`

Added **Phase 3** to catch orphaned temp media that slipped through:

- Finds all `user_media` with temp URLs (`%/temp/%`)
- Checks if linked to any artifact via `artifact_media`
- If NOT linked → deletes storage file + `user_media` record

Also switched to using **service role client** since cron jobs run without a user session.

### 3. `scripts/migrate-temp-media.ts`

Enhanced to update AI metadata keys (image_captions, video_summaries, audio_transcripts) when migrating files.

---

## Migration

Ran migration script to fix existing affected artifacts:

```bash
pnpm tsx scripts/migrate-temp-media.ts --migrate
```

Results:
- **28 files migrated** successfully
- **4 files** had missing storage (already deleted)
- **5 orphaned user_media** cleaned by updated cron

---

## Files Modified

| File | Change |
|------|--------|
| `lib/actions/media-reorganize.ts` | Process gallery URLs from user_media |
| `app/api/cleanup-expired-uploads/route.ts` | Add Phase 3 orphaned temp cleanup, use service role |
| `scripts/migrate-temp-media.ts` | Update AI metadata keys |
| `scripts/list-temp-files.ts` | New utility to audit temp folders |
| `docs/operations/cron-jobs.md` | Complete rewrite with accurate info |
| `docs/operations/bug-tracker.md` | Document fix details |

---

## Prevention

The unified media model (gallery + blocks) requires checking **both** storage locations:

1. `artifacts.media_urls` - media block URLs
2. `user_media` via `artifact_media` - gallery URLs

Any code that processes "all media for an artifact" must query both.

---

## Testing

After deploying:

1. Create new artifact with gallery-only media
2. Save artifact
3. Check Supabase Storage - files should be in `{userId}/{artifactId}/` not temp
4. View as logged-out user - media should be visible

---

## Related Documentation

- [Cron Jobs](../operations/cron-jobs.md) - Updated with accurate cleanup info
- [Bug Tracker](../operations/bug-tracker.md) - Full fix details
- [User Bugs](../operations/user-bugs.md) - UB-251129-01
- [Media System Architecture](../architecture/media-system.md) - Gallery vs Blocks independence
