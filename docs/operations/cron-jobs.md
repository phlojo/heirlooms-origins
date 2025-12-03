# Scheduled Tasks (Cron Jobs)

This document outlines all scheduled tasks and cron jobs configured for the Heirlooms application.

---

## Overview

Heirlooms uses Vercel Cron Jobs for scheduled tasks. Cron configuration is defined in `vercel.json` and executes serverless functions on a schedule.

**Important:** Vercel crons only run on **production deployments** and require at least the **Pro plan**.

---

## Active Cron Jobs

### Media Cleanup (`/api/cleanup-expired-uploads`)

**Endpoint:** `/api/cleanup-expired-uploads`
**Schedule:** `0 0 * * *` (Daily at midnight UTC)
**Config:** `vercel.json`

This is the **primary cleanup cron** that handles all media housekeeping.

#### What It Cleans

| Phase | What | Source | Action |
|-------|------|--------|--------|
| 1 | Expired pending uploads | `pending_uploads` table (24hr expiry) | Delete from storage + DB |
| 2 | Orphaned pending_uploads | DB entries for already-deleted files | Delete DB record |
| 3 | Orphaned user_media | `user_media` with temp URLs not linked to artifacts | Delete from storage + DB |
| 4 | Old transcription audio | `{userId}/transcriptions/` files older than 7 days | Delete from storage |

#### Phase 1: Expired Pending Uploads

When users upload files, they're tracked in `pending_uploads` with a 24-hour expiry:
- If artifact is saved → removed from `pending_uploads`, file stays
- If abandoned (user closes browser) → expires after 24hr → cleaned by cron

#### Phase 2: Already-Deleted Files

Sometimes files are manually deleted but `pending_uploads` records remain. This phase removes orphaned DB entries.

#### Phase 3: Orphaned Temp Media (Added 2025-11-30)

This catches files that slipped through due to a bug where `reorganizeArtifactMedia()` wasn't processing gallery URLs:

1. File uploaded to temp folder
2. Artifact saved → removed from `pending_uploads`
3. **BUG:** Gallery files not moved out of temp (fixed in `media-reorganize.ts`)
4. Artifact later deleted
5. Result: `user_media` record with temp URL, not linked to any artifact

The cron now:
1. Finds all `user_media` with temp URLs (`%/temp/%`)
2. Checks if linked to any artifact via `artifact_media`
3. If NOT linked → deletes storage file + `user_media` record

#### Phase 4: Old Transcription Audio (Added 2025-12-03)

When users dictate title/description using voice input, the audio is uploaded to `{userId}/transcriptions/` for archival purposes. These files:
- Are NOT tracked in any database table
- Accumulate over time with no cleanup

The cron now:
1. Lists all user folders in storage
2. For each user, lists files in `/transcriptions/` folder
3. Parses timestamp from filename (e.g., `title-1764716158016.webm`)
4. Deletes files older than 7 days

**Retention period:** 7 days (configurable via `TRANSCRIPTION_RETENTION_MS` constant)

#### Authentication

- In production: Requires `x-vercel-cron` header (added automatically by Vercel)
- In development: Allows any request for testing

#### Response Format

```json
{
  "success": true,
  "audit": {
    "totalPending": 5,
    "expiredCount": 3
  },
  "cleanup": {
    "deletedFromStorage": 2,
    "deletedFromDatabase": 3,
    "deletedUserMedia": 1,
    "orphanedTempMediaDeleted": 5,
    "failedDeletions": 0,
    "orphanedTempMediaFailed": 0,
    "transcriptionsDeleted": 10,
    "transcriptionsFailed": 0
  }
}
```

#### Manual Testing

```bash
# Local development (no auth required)
curl http://localhost:3000/api/cleanup-expired-uploads

# Production (requires Vercel cron header - can't call directly)
# Use Vercel dashboard to trigger manually or wait for scheduled run
```

---

## Inactive/Deprecated Endpoints

### Media Audit Report (`/api/cron/audit-media`)

**Status:** NOT configured in `vercel.json` - not running as cron
**Purpose:** Read-only audit report (no cleanup action)

This endpoint exists but is not scheduled. The cleanup endpoint above handles all necessary operations.

If you want audit-only reporting without cleanup, this can be added to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cleanup-expired-uploads",
      "schedule": "0 0 * * *"
    },
    {
      "path": "/api/cron/audit-media",
      "schedule": "0 2 * * *"
    }
  ]
}
```

---

## Configuration

### vercel.json

```json
{
  "buildCommand": "pnpm run build",
  "installCommand": "pnpm install",
  "crons": [
    {
      "path": "/api/cleanup-expired-uploads",
      "schedule": "0 0 * * *"
    }
  ]
}
```

### Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Admin access for cleanup operations |
| `CLOUDINARY_API_KEY` | Yes | For Cloudinary file deletion |
| `CLOUDINARY_API_SECRET` | Yes | For Cloudinary file deletion |

**Note:** The cleanup endpoint uses the **service role key** to bypass RLS, since cron jobs run without a user session.

---

## Monitoring

### View Cron Logs in Vercel

1. Go to Vercel project dashboard
2. Click **Logs** tab
3. Filter by function: `/api/cleanup-expired-uploads`
4. Or filter by "Cron" to see all cron executions

### Check Cron Configuration

1. Go to Vercel project → **Settings**
2. Click **Cron Jobs** in sidebar
3. View configured jobs and execution history

### Expected Results

| Metric | Healthy Value | Investigate If |
|--------|---------------|----------------|
| `deletedFromStorage` | 0-10 | Consistently high (upload flow issue) |
| `orphanedTempMediaDeleted` | 0 | High after fix deployed (one-time cleanup) |
| `failedDeletions` | 0 | Any failures (storage access issue) |
| `transcriptionsDeleted` | 0-20 | Very high (voice input heavily used) |
| `transcriptionsFailed` | 0 | Any failures (storage access issue) |

---

## Troubleshooting

### Cron Not Running

1. **Check Vercel plan** - Crons require Pro plan or higher
2. **Check deployment** - Crons only run on production domain
3. **Check vercel.json** - Ensure cron is configured
4. **Check logs** - Look for execution errors in Vercel Logs

### No Logs Appearing

1. Crons only run on production, not preview deployments
2. Hobby plan doesn't support crons
3. Check Vercel dashboard → Settings → Cron Jobs for status

### Cleanup Not Working

1. Check `SUPABASE_SERVICE_ROLE_KEY` is set in Vercel env vars
2. Check Supabase Storage bucket policies allow service role delete
3. Review function logs for specific error messages

---

## Related Documentation

- [Media System Architecture](../architecture/media-system.md)
- [Bug Tracker - Gallery Media Not Reorganized](bug-tracker.md#gallery-media-not-reorganized-from-temp-folder-fixed-november-2025)
- [User Bug UB-251129-01](user-bugs.md#ub-251129-01-media-stuck-in-temp-folder---not-visible-to-other-users)

---

## Scripts

### Migration Script

For one-time cleanup of existing temp files (after deploying the `reorganizeArtifactMedia` fix):

```bash
# Dry run - preview what will be migrated
pnpm tsx scripts/migrate-temp-media.ts

# Actually migrate files
pnpm tsx scripts/migrate-temp-media.ts --migrate
```

### Temp File Audit Script

To see what's currently in temp folders:

```bash
pnpm tsx scripts/list-temp-files.ts
```

---

## Cron Schedule Reference

| Expression | Meaning |
|------------|---------|
| `0 0 * * *` | Daily at midnight UTC |
| `0 2 * * *` | Daily at 2:00 AM UTC |
| `0 */6 * * *` | Every 6 hours |
| `0 0 * * 0` | Weekly on Sundays at midnight |
| `*/15 * * * *` | Every 15 minutes |

**Time zone:** All Vercel cron jobs run in UTC.

---

**Last Updated:** 2025-12-03
