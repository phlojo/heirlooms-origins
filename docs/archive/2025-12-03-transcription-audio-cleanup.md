# Transcription Audio Cleanup

**Date:** 2025-12-03
**Type:** Bug Fix / Feature Enhancement
**Status:** Complete

## Problem

Transcription audio files (voice recordings from dictation) were accumulating in Supabase Storage with no cleanup mechanism.

### How Transcription Audio Works

When users dictate title/description using voice input (`transcription-input.tsx`):
1. Audio is recorded in browser
2. Sent to `/api/transcribe` → OpenAI Whisper for transcription
3. Audio file uploaded to `{userId}/transcriptions/{fieldType}-{timestamp}.webm` for archival

### The Gap

These files were:
- Uploaded to `{userId}/transcriptions/` folder
- **NOT tracked** in `pending_uploads` table (no 24hr expiry)
- **NOT tracked** in `user_media` table (no DB reference)
- **NOT in temp folder** (Phase 3 cleanup didn't catch them)
- **Result:** Files accumulated forever with no cleanup

### Discovery

Found during investigation of orphaned media:
```
9ee6586e-.../transcriptions/title-1764716158016.webm
9ee6586e-.../transcriptions/description-1764716142223.webm
7efa7d6f-.../transcriptions/description-1764560972494.webm
... (10 files total, ~1 MB)
```

## Solution

Added **Phase 4** to the cleanup cron (`/api/cleanup-expired-uploads`):

1. List all user folders in storage
2. For each user, check `/transcriptions/` folder
3. Parse timestamp from filename (e.g., `title-1764716158016.webm`)
4. Delete files older than 7 days

### Implementation

**File:** `app/api/cleanup-expired-uploads/route.ts`

```typescript
// Transcription audio retention period (7 days)
const TRANSCRIPTION_RETENTION_MS = 7 * 24 * 60 * 60 * 1000

// Extract timestamp from transcription filename
function extractTimestampFromFilename(filename: string): number | null {
  const match = filename.match(/-([\d]+)\.webm$/)
  return match ? parseInt(match[1], 10) : null
}

// Phase 4: Clean up old transcription audio files
for (const userId of userIds) {
  const { data: transcriptionFiles } = await supabase.storage
    .from("heirlooms-media")
    .list(`${userId}/transcriptions`)

  for (const file of transcriptionFiles) {
    const timestamp = extractTimestampFromFilename(file.name)
    const age = now - timestamp
    if (age > TRANSCRIPTION_RETENTION_MS) {
      filesToDelete.push(`${userId}/transcriptions/${file.name}`)
    }
  }

  await supabase.storage.from("heirlooms-media").remove(filesToDelete)
}
```

### Response Format

The cleanup endpoint now returns:
```json
{
  "cleanup": {
    "transcriptionsDeleted": 10,
    "transcriptionsFailed": 0
  }
}
```

## Cleanup Phases Summary

| Phase | What | Retention | Added |
|-------|------|-----------|-------|
| 1 | Expired pending uploads | 24 hours | Original |
| 2 | Orphaned pending_uploads DB entries | N/A | Original |
| 3 | Orphaned user_media in temp folder | Immediate | 2025-11-30 |
| 4 | Old transcription audio | 7 days | 2025-12-03 |

## Also Fixed: cleanup-supabase-storage.ts Script

The `scripts/cleanup-supabase-storage.ts` script was only checking `artifacts.media_urls` and `thumbnail_url` for referenced media. This missed files referenced in `user_media` table (gallery media).

**Fix:** Updated `getAllArtifactMediaUrls()` → `getAllReferencedMediaUrls()` to also check `user_media.public_url`.

Before fix: Would have incorrectly identified 37 files as orphaned (82 MB)
After fix: Correctly identified 11 truly orphaned files (6.68 MB)

## Files Modified

- `app/api/cleanup-expired-uploads/route.ts` - Added Phase 4
- `scripts/cleanup-supabase-storage.ts` - Fixed to check user_media table
- `scripts/investigate-media.ts` - New script for debugging media issues
- `docs/operations/cron-jobs.md` - Updated documentation

## Testing

```bash
# Test cleanup endpoint locally
curl http://localhost:3000/api/cleanup-expired-uploads

# Manual cleanup of storage orphans
pnpm tsx scripts/cleanup-supabase-storage.ts          # Dry run
pnpm tsx scripts/cleanup-supabase-storage.ts --delete # Actually delete

# Investigate specific media URL
pnpm tsx scripts/investigate-media.ts "<url>" "<artifactId>"
```

## Notes

- Retention period (7 days) is configurable via `TRANSCRIPTION_RETENTION_MS` constant
- Files without parseable timestamps are skipped (safety measure)
- Cron runs daily at midnight UTC
- Phase 4 only affects Supabase Storage (not Cloudinary legacy transcriptions)
