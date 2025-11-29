# User-Reported Bugs

This file tracks bugs reported by users (external). For internal bugs discovered during development, see `bug-tracker.md`.

---

## Bug ID Format
User bugs use the format: `UB-YYMMDD-NN` (e.g., UB-251129-01)
- `UB` = User Bug (distinguishes from internal bugs)
- `YYMMDD` = Date reported
- `NN` = Sequential number for that day

## Status Legend
- **Open** - Bug confirmed, not yet fixed
- **In Progress** - Actively being worked on
- **Fixed** - Fix applied, pending verification
- **Verified** - Fix confirmed working in production
- **Won't Fix** - Not a bug or by design

---

## Active Bugs

## UB-251129-01: Media stuck in temp folder - not visible to other users

**Status:** In Progress
**Reported:** 2025-11-29
**Reporter:** Jason Leake
**Priority:** Critical
**Branch:** userbugs-112905

### User Report
> Created a collection "luggage" with two artifacts. Added pictures to each artifact. User can see the pictures inside the artifacts, but other users cannot see them. Thumbnails visible on artifact cards but not collection. Media confirmed still in Supabase temp folder.

### Affected URLs
- Collection: https://heirloomsapp.com/collections/luggage?mode=all
- Artifact 1: https://heirloomsapp.com/artifacts/roll-aboard-1764427863997
- Artifact 2: https://heirloomsapp.com/artifacts/my-backpack-1764425754823

### Steps to Reproduce
1. Log in as user
2. Create new collection
3. Create artifact within collection
4. Upload media (photos)
5. Save artifact
6. Log out / view as different user
7. Media not visible (still in temp folder with user-scoped RLS)

### Expected Behavior
- Media should be reorganized from temp folder to artifact folder on save
- Media should be publicly accessible (for public collections)

### Actual Behavior
- Media remains in temp folder after save
- Only artifact owner can view media (temp folder has user-scoped RLS)
- Other users see broken/missing images

### Environment
- Production: heirloomsapp.com

### Investigation Notes
Media in Supabase temp folder structure: `temp/{userId}/{timestamp}-{filename}`
Should be reorganized to: `{userId}/{artifactId}/{timestamp}-{filename}`

`reorganizeArtifactMedia()` in `lib/actions/media-reorganize.ts` should run after artifact creation/update but appears to not be executing or failing silently.

### Root Cause
**Two issues combined:**

**Issue 1: Files stuck in temp folder**
`updateArtifact()` in `lib/actions/artifacts.ts` was missing the call to `reorganizeArtifactMedia()`.

When a user edits an existing artifact and adds new media:
1. Files upload to temp folder: `temp/{userId}/{timestamp}-{filename}`
2. `updateArtifact()` marks uploads as saved (removes from `pending_uploads`)
3. **BUG**: `updateArtifact()` did NOT call `reorganizeArtifactMedia()` to move files
4. Files remain in temp folder

Meanwhile `createArtifact()` correctly called `reorganizeArtifactMedia()` after saving.

**Issue 2: RLS policy on user_media table (the actual blocker)**
Even after migrating files out of temp, gallery still didn't display for other users.

The `user_media` table had RLS policies that only allowed the **owner** to read their records. When the gallery component fetched `artifact_media` joined with `user_media`, the join returned `null` for non-owners because RLS blocked access.

This is why:
- Owner viewing their own artifacts → RLS passes → works
- Other user (or logged out) viewing → RLS blocks `user_media` join → gallery empty
- Testing with Supabase Dashboard → service role bypasses RLS → looks fine

### Fix Applied

**Fix 1: Code change - `lib/actions/artifacts.ts:834-846`**

Added `reorganizeArtifactMedia()` call after marking uploads as saved in `updateArtifact()`:

```typescript
// Phase 2: Reorganize Supabase Storage media from temp to artifact folder
console.log("[v0] UPDATE ARTIFACT - Reorganizing newly uploaded media files...")
const reorganizeResult = await reorganizeArtifactMedia(validatedFields.data.id)
```

**Fix 2: RLS policy - `scripts/sql/fix-user-media-rls.sql`**

Added SELECT policy on `user_media` to allow public read for linked media:

```sql
CREATE POLICY "Allow public read for media linked to artifacts"
ON user_media
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM artifact_media
    WHERE artifact_media.media_id = user_media.id
  )
);
```

**Fix 3: Migration script - `scripts/migrate-temp-media.ts`**

Moved existing temp folder media to artifact folders and updated all database references.

### Verification
- [x] Fix tested locally
- [x] RLS policy applied to dev database
- [x] Migration script run (14 files moved)
- [x] Gallery now visible on dev.heirloomsapp.com
- [ ] Code changes deployed to production
- [ ] RLS policy applied to production database
- [ ] User (Jason) confirmed fix

### Manual Fix for Existing Affected Artifacts
For Jason Leake's artifacts that already have media stuck in temp:

**Option 1:** User edits artifact and clicks Save (triggers reorganization)

**Option 2:** Run migration script:
```bash
# Dry run (preview what will be migrated)
pnpm tsx scripts/migrate-temp-media.ts

# Actually migrate files
pnpm tsx scripts/migrate-temp-media.ts --migrate
```

The script will:
1. Find all artifacts with media in temp folder
2. Move files to proper artifact folder: `{userId}/{artifactId}/{filename}`
3. Update `artifacts.media_urls`, `thumbnail_url`, and AI metadata keys
4. Update `user_media` records with new URLs

---

---

## Resolved Bugs

<!-- Move fixed bugs here with resolution notes -->

---

## Bug Template

When adding a new user bug, use this template:

```markdown
## UB-YYMMDD-NN: [Brief Title]

**Status:** Open | In Progress | Fixed | Verified | Won't Fix
**Reported:** YYYY-MM-DD
**Reporter:** [User identifier or "Anonymous"]
**Priority:** Critical | High | Medium | Low
**Branch:** [fix branch name if applicable]

### User Report
> [Exact user description, quoted]

### Steps to Reproduce
1. Step one
2. Step two
3. ...

### Expected Behavior
[What should happen]

### Actual Behavior
[What actually happens]

### Environment
- Device: [if known]
- Browser: [if known]
- OS: [if known]

### Investigation Notes
[Developer notes during investigation]

### Root Cause
[Once identified]

### Fix Applied
**Files Modified:**
- `path/to/file.ts` - [brief description]

**PR/Commit:** [link or hash]

### Verification
- [ ] Fix tested locally
- [ ] Fix deployed to staging
- [ ] User confirmed fix (if applicable)
- [ ] Fix deployed to production
```

---

## Integration with Development

### Workflow
1. User reports bug via feedback channel
2. Create entry in this file with `Open` status
3. Create branch: `userbugs-MMDDNN` (e.g., `userbugs-112901`)
4. Update status to `In Progress`
5. Document investigation in bug entry
6. Apply fix, update status to `Fixed`
7. After production deployment and verification, update to `Verified`
8. Move to Resolved Bugs section

### Cross-Referencing
- If a user bug relates to an internal bug, note it: "See also: [bug-tracker.md#section-name]"
- If fix documentation is extensive, add to `bug-tracker.md` and reference: "Details: [bug-tracker.md#section-name]"
