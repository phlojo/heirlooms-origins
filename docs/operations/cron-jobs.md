# Scheduled Tasks (Cron Jobs)

This document outlines all scheduled tasks and cron jobs configured for the Heirlooms application.

---

## Overview

Heirlooms uses Vercel Cron Jobs for scheduled tasks. All cron jobs are configured in Vercel project settings and execute serverless functions on a schedule.

---

## Active Cron Jobs

### Media Audit Report

**Endpoint:** `/api/cron/audit-media`
**Schedule:** `0 2 * * *` (Daily at 2 AM UTC)
**Purpose:** Generate read-only audit report of pending media uploads

**What it does:**
- Queries `pending_uploads` table for expired uploads
- Checks each URL against artifacts table
- Verifies existence in Cloudinary
- Generates categorized report:
  - **Safe to delete:** Expired, not in artifacts (abandoned uploads)
  - **Dangerous:** In pending_uploads BUT used in saved artifacts (bug scenario)
  - **Already deleted:** In database but not in Cloudinary (orphaned DB entries)

**Important:** This is a **read-only audit**. No automatic deletion occurs. See [Media Audit Guide](../guides/media-audit.md) for manual cleanup procedures.

**Security:**
- Requires `CRON_SECRET` environment variable
- Validates secret in request headers
- Returns 401 if unauthorized

**Monitoring:**
View reports in:
- Vercel deployment logs (Functions → `/api/cron/audit-media`)
- Direct API call: `https://yourdomain.com/api/cron/audit-media?secret=CRON_SECRET`

**Expected Results:**
- `dangerous` count should be 0 (if not, investigate `markUploadsAsSaved()` failures)
- `safe_to_delete` may grow over time (normal for abandoned uploads)
- `already_deleted` indicates orphaned DB entries (safe to clean)

**Related Documentation:**
- [Media Audit Setup Guide](../guides/media-audit.md)
- [Media System Architecture](../../ARCHITECTURE.md#media-system-architecture)

---

## Setting Up Cron Jobs in Vercel

### 1. Add Cron Job

1. Go to Vercel project → **Settings → Cron Jobs**
2. Click **Create Cron Job**
3. Configure:
   - **Path:** `/api/cron/audit-media`
   - **Schedule:** `0 2 * * *`
   - **Description:** Media audit - safe read-only report

### 2. Configure Security

Add environment variable in Vercel:
\`\`\`
CRON_SECRET=your-random-secret-string
\`\`\`

Use a strong random string (32+ characters recommended).

### 3. Test Cron Job

**Manual trigger:**
\`\`\`bash
curl -X GET "https://yourdomain.com/api/cron/audit-media?secret=YOUR_CRON_SECRET"
\`\`\`

**Expected response:**
\`\`\`json
{
  "success": true,
  "summary": {
    "total_pending": 5,
    "safe_to_delete": 3,
    "dangerous": 0,
    "already_deleted": 2
  },
  "details": { ... }
}
\`\`\`

---

## Future Cron Jobs

### Planned Tasks

**Automated Media Cleanup** (Not yet implemented)
- Schedule: Daily at 3 AM UTC
- Purpose: Automatically delete safe-to-delete media
- Depends on: Media audit report showing 0 dangerous items for 7+ days

**User Activity Digest** (Not yet implemented)
- Schedule: Weekly on Mondays at 9 AM UTC
- Purpose: Send weekly summary emails to active users
- Includes: New artifacts, collection updates, storage usage

**Database Maintenance** (Not yet implemented)
- Schedule: Weekly on Sundays at 4 AM UTC
- Purpose: Vacuum, analyze, and optimize database
- Supabase may handle this automatically

**Analytics Aggregation** (Not yet implemented)
- Schedule: Daily at 1 AM UTC
- Purpose: Pre-aggregate analytics data for dashboard
- Reduces real-time query load

---

## Cron Schedule Reference

Common cron expressions:

| Expression | Meaning |
|------------|---------|
| `0 * * * *` | Every hour at minute 0 |
| `0 2 * * *` | Daily at 2:00 AM UTC |
| `0 */6 * * *` | Every 6 hours |
| `0 0 * * 0` | Weekly on Sundays at midnight |
| `0 0 1 * *` | Monthly on the 1st at midnight |
| `*/15 * * * *` | Every 15 minutes |

**Time zone:** All Vercel cron jobs run in UTC.

---

## Monitoring & Alerts

### View Execution Logs

1. Go to Vercel → **Deployments**
2. Select latest deployment
3. Click **Functions**
4. Find `/api/cron/audit-media`
5. View logs and invocation history

### Set Up Alerts (Future)

Consider setting up alerts for:
- Cron job failures (execution errors)
- Dangerous media count > 0 (data integrity issue)
- Execution time > 10 seconds (performance degradation)
- Missing scheduled runs (cron misconfiguration)

---

## Troubleshooting

### Cron Job Not Running

1. Check Vercel cron configuration is active
2. Verify schedule expression is valid
3. Check environment variables are set
4. View deployment logs for errors

### Authentication Errors

1. Verify `CRON_SECRET` is set in Vercel
2. Ensure secret matches in API route validation
3. Check request headers include correct secret

### Timeout Errors

1. Check function execution time (max 10s on Hobby plan)
2. Optimize database queries
3. Consider pagination for large datasets
4. Upgrade Vercel plan if needed

---

## Best Practices

1. **Always test cron jobs manually** before deploying
2. **Log all cron executions** with timestamps and results
3. **Use read-only operations** when possible (safer)
4. **Set reasonable timeouts** to prevent hanging
5. **Monitor execution frequency** to avoid rate limits
6. **Document all cron jobs** in this file
7. **Version control cron logic** in `/app/api/cron/`

---

**Last Updated:** 2025-01-23
