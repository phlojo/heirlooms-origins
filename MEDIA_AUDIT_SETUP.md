# Media Audit System Setup

## Overview

The media audit system provides **safe, read-only reporting** of pending uploads without deleting anything. This prevents accidental deletion of media that's in use.

## How It Works

### Scheduled Audit Report
- Queries `pending_uploads` table
- Checks each URL against `artifacts.media_urls`
- Verifies existence in Cloudinary
- Generates categorized report:
  - **Safe to delete**: Expired, not in artifacts, exists in Cloudinary (abandoned uploads)
  - **Dangerous**: In pending_uploads BUT used in saved artifacts (bug scenario - markUploadsAsSaved failed)
  - **Already deleted**: In database but not in Cloudinary (orphaned DB entries)

### No Automatic Deletion
- Audit only reads data - never deletes
- Manual review required before cleanup
- Errs on side of safety

## Setup in Vercel

### 1. Add Cron Job
In your Vercel project:
1. Go to **Settings → Cron Jobs**
2. Click **Create Cron Job**
3. Configure:
   - **Path**: `/api/cron/audit-media`
   - **Schedule**: `0 2 * * *` (daily at 2 AM UTC)
   - **Description**: Media audit - safe read-only report

### 2. Optional: Add Security
Add environment variable:
\`\`\`
CRON_SECRET=your-random-secret-string
\`\`\`

The cron job will verify this secret before running.

### 3. View Reports

**Option A: Vercel Logs (Recommended)**
- Go to **Deployments → Your deployment → Functions**
- Click on `/api/cron/audit-media`
- View logs showing summary and details

**Option B: Direct API Call**
Visit: `https://yourdomain.com/api/cron/audit-media`
(Add `?secret=your-cron-secret` if CRON_SECRET is set)

Returns JSON report with full details.

## Manual Cleanup Process

When audit shows "safe to delete" items:

1. Review the report carefully
2. Verify URLs are truly not in use
3. Manually delete from Cloudinary using their dashboard
4. Remove database entries:

\`\`\`sql
DELETE FROM pending_uploads 
WHERE cloudinary_url = 'url-to-delete'
AND expires_at < NOW()
AND cloudinary_url NOT IN (
  SELECT unnest(media_urls) FROM artifacts
);
\`\`\`

## Dangerous Items Resolution

If audit shows "dangerous" items (in pending_uploads but used in artifacts):

1. **DO NOT DELETE from Cloudinary** - media is in use!
2. Simply remove the pending_uploads database entry:

\`\`\`sql
DELETE FROM pending_uploads 
WHERE cloudinary_url IN (
  SELECT unnest(media_urls) FROM artifacts
);
\`\`\`

This fixes the tracking issue without touching the media files.

## Safety Features

1. **Read-only audit**: No automatic deletion
2. **Cross-referencing**: Checks against both database and Cloudinary
3. **Explicit categorization**: Clear labeling of safe vs dangerous
4. **Manual review**: Human verification before cleanup
5. **Deprecated old function**: `cleanupExpiredUploads()` now logs warning

## Monitoring

Check these metrics in audit reports:
- **Dangerous count should be 0**: If not, investigate why markUploadsAsSaved() is failing
- **Safe to delete growing**: Normal for abandoned uploads, can clean manually quarterly
- **Already deleted**: Orphaned DB entries, safe to remove from database
