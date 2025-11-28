# Migration Execution Guide - Media Gallery & User Media Architecture

**Date**: 2025-11-27
**Migration Files**: 012-015 (User Media Architecture)
**Risk Level**: Low (Idempotent, backward compatible)

---

## 📋 Pre-Migration Checklist

- [ ] **Backup Database** - Create a snapshot in Supabase Dashboard
- [ ] **Review Migration Files** - Read through all 4 migration scripts
- [ ] **Check Environment** - Verify you're in the correct environment (dev/staging/prod)
- [ ] **Note Current State** - Count existing artifacts with media: `SELECT COUNT(*) FROM artifacts WHERE media_urls IS NOT NULL`

---

## 🚀 Migration Execution

### Option A: Supabase Dashboard (Recommended)

**Steps:**
1. Go to Supabase Dashboard → Your Project → SQL Editor
2. Run each migration in order (paste and execute):

#### Migration 1: Create user_media table
```bash
# File: scripts/012_create_user_media_table.sql
```
- Creates the canonical user media storage table
- Sets up RLS policies for user isolation
- Creates indexes for fast queries
- **Expected**: "Success. No rows returned"

#### Migration 2: Create artifact_media table
```bash
# File: scripts/013_create_artifact_media_table.sql
```
- Creates the join table linking artifacts to media
- Sets up role-based organization (gallery, inline_block, cover)
- Creates RLS policies inheriting from artifacts
- **Expected**: "Success. No rows returned"

#### Migration 3: Backfill existing data
```bash
# File: scripts/014_backfill_user_media.sql
```
- Migrates existing artifacts.media_urls to new tables
- Creates user_media records for each unique URL
- Creates artifact_media links with role='gallery'
- **Expected**: Console logs showing progress, e.g., "Processing artifact: ...", "Created new media: ..."

**Monitor output for:**
- Total user_media records created
- Total artifact_media records created
- Any errors or warnings

#### Migration 4: Add performance indexes
```bash
# File: scripts/015_add_media_performance_indexes.sql
```
- Creates composite indexes for common queries
- Adds updated_at triggers
- **Expected**: "Success. No rows returned"

### Option B: Supabase CLI

**Prerequisites:**
```bash
# Ensure Supabase CLI is installed
supabase --version

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF
```

**Execute migrations:**
```bash
# Navigate to project root
cd C:/dev/heirlooms-v0

# Run migrations in order
supabase db push scripts/012_create_user_media_table.sql
supabase db push scripts/013_create_artifact_media_table.sql
supabase db push scripts/014_backfill_user_media.sql
supabase db push scripts/015_add_media_performance_indexes.sql
```

### Option C: psql (Direct Database Connection)

**Connect:**
```bash
psql "postgresql://postgres:[YOUR-PASSWORD]@[YOUR-PROJECT-REF].supabase.co:5432/postgres"
```

**Execute:**
```sql
\i scripts/012_create_user_media_table.sql
\i scripts/013_create_artifact_media_table.sql
\i scripts/014_backfill_user_media.sql
\i scripts/015_add_media_performance_indexes.sql
```

---

## ✅ Post-Migration Verification

### 1. Verify Table Creation
```sql
-- Check user_media table exists
SELECT COUNT(*) FROM user_media;

-- Check artifact_media table exists
SELECT COUNT(*) FROM artifact_media;
```

**Expected:** Both queries return a count (0 if no data, or number of backfilled records)

### 2. Verify Backfill Success
```sql
-- Count artifacts with media
SELECT COUNT(*) FROM artifacts WHERE media_urls IS NOT NULL;

-- Count backfilled user_media records
SELECT COUNT(*) FROM user_media;

-- Count backfilled artifact_media links
SELECT COUNT(*) FROM artifact_media;

-- Sample backfilled data
SELECT
  a.title,
  um.filename,
  am.role,
  am.sort_order
FROM artifact_media am
JOIN user_media um ON am.media_id = um.id
JOIN artifacts a ON am.artifact_id = a.id
LIMIT 5;
```

**Expected:**
- user_media count ≥ unique media URLs across all artifacts
- artifact_media count ≥ total media_urls array lengths
- Sample query returns artifact titles with their media

### 3. Verify RLS Policies
```sql
-- Check user_media policies
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename = 'user_media';

-- Check artifact_media policies
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename = 'artifact_media';
```

**Expected:** 4 policies for each table (select, insert, update, delete)

### 4. Verify Indexes
```sql
-- Check user_media indexes
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'user_media';

-- Check artifact_media indexes
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'artifact_media';
```

**Expected:** Multiple indexes including composite indexes for performance

### 5. Verify Triggers
```sql
-- Check updated_at triggers
SELECT tgname, tgrelid::regclass
FROM pg_trigger
WHERE tgrelid::regclass::text IN ('user_media', 'artifact_media');
```

**Expected:** `user_media_updated_at_trigger` and `artifact_media_updated_at_trigger`

---

## 🧪 Application Testing

### Test 1: Gallery Display
1. Navigate to any artifact detail page with media
2. **Expected:** Flickity carousel displays at top of page (in view mode)
3. **Verify:**
   - Images display correctly
   - Navigation buttons work
   - Page dots show current position
   - Derivatives load from Cloudinary fetch URLs

### Test 2: Media Picker
1. Edit an artifact
2. Click "Add Media"
3. Select "Select Existing"
4. **Expected:** Media library loads with grid of existing media
5. **Verify:**
   - Search works
   - Filter tabs work (All, Images, Videos, Audio)
   - Multi-select works
   - "Add Selected" adds media to artifact

### Test 3: Backward Compatibility
1. Check old artifacts still display correctly
2. **Expected:** Existing media displays unchanged
3. **Verify:**
   - Artifact cards show thumbnails
   - Detail pages show media
   - No broken images or 404s

### Test 4: New Artifact Creation
1. Create a new artifact and upload media
2. **Expected:** Media uploads normally
3. **Verify in database:**
   ```sql
   SELECT * FROM user_media WHERE created_at > NOW() - INTERVAL '5 minutes';
   SELECT * FROM artifact_media WHERE created_at > NOW() - INTERVAL '5 minutes';
   ```
4. **Expected:** New records in both tables with matching artifact

### Test 5: Dual-Write Verification
1. Check that both systems are updated:
   ```sql
   SELECT
     a.id,
     a.title,
     array_length(a.media_urls, 1) as media_urls_count,
     COUNT(am.id) as artifact_media_count
   FROM artifacts a
   LEFT JOIN artifact_media am ON a.id = am.artifact_id
   WHERE a.created_at > NOW() - INTERVAL '1 day'
   GROUP BY a.id, a.title, a.media_urls;
   ```
2. **Expected:** media_urls_count = artifact_media_count for new artifacts

---

## 🔄 Rollback Plan (If Needed)

If issues arise, the migration can be safely rolled back:

### Complete Rollback
```sql
-- Drop new tables (cascades to foreign keys)
DROP TABLE IF EXISTS artifact_media CASCADE;
DROP TABLE IF EXISTS user_media CASCADE;

-- Drop helper functions
DROP FUNCTION IF EXISTS extract_filename_from_url(TEXT);
DROP FUNCTION IF EXISTS detect_media_type(TEXT);
DROP FUNCTION IF EXISTS detect_mime_type(TEXT);
DROP FUNCTION IF EXISTS extract_storage_path(TEXT);
DROP FUNCTION IF EXISTS update_user_media_updated_at();
DROP FUNCTION IF EXISTS update_artifact_media_updated_at();
```

**Impact:**
- Gallery won't display (app falls back to legacy behavior)
- Media picker won't work
- Existing artifacts continue working normally
- No data loss (artifacts.media_urls unchanged)

### Partial Rollback
```sql
-- Keep tables but clear data
TRUNCATE artifact_media CASCADE;
TRUNCATE user_media CASCADE;
```

**Impact:**
- Tables exist but empty
- Can re-run backfill migration
- Faster than complete rollback

---

## 📊 Migration Metrics

After migration, collect these metrics:

```sql
-- Migration summary
SELECT
  'user_media' as table_name,
  COUNT(*) as total_records,
  COUNT(DISTINCT user_id) as unique_users,
  pg_size_pretty(pg_total_relation_size('user_media')) as table_size
FROM user_media
UNION ALL
SELECT
  'artifact_media' as table_name,
  COUNT(*) as total_records,
  COUNT(DISTINCT artifact_id) as unique_artifacts,
  pg_size_pretty(pg_total_relation_size('artifact_media')) as table_size
FROM artifact_media;

-- Media type breakdown
SELECT
  media_type,
  COUNT(*) as count,
  pg_size_pretty(SUM(file_size_bytes)) as total_size
FROM user_media
GROUP BY media_type;

-- Role distribution
SELECT
  role,
  COUNT(*) as count
FROM artifact_media
GROUP BY role;
```

---

## 🐛 Troubleshooting

### Issue: Backfill Migration Hangs
**Cause:** Large number of artifacts/media
**Solution:** Run in smaller batches or increase timeout

### Issue: Duplicate Key Violations
**Cause:** Re-running backfill on already migrated data
**Solution:** Migrations are idempotent, check for `IF NOT EXISTS` clauses

### Issue: RLS Policy Errors
**Cause:** Missing or incorrect policies
**Solution:** Re-run table creation migrations (012 and 013)

### Issue: Gallery Not Displaying
**Cause:** No gallery media records
**Solution:** Check artifact_media table for role='gallery' records

### Issue: Media Picker Shows No Media
**Cause:** No user_media records
**Solution:** Re-run backfill migration (014)

---

## 📞 Support

**Migration Issues:**
- Check migration logs in Supabase Dashboard
- Verify all migrations completed successfully
- Run verification queries above

**Application Issues:**
- Check browser console for errors
- Verify API routes are accessible
- Test with a fresh browser session

---

## ✅ Success Criteria

Migration is successful when:
- ✅ All 4 migrations complete without errors
- ✅ user_media table has records (if existing artifacts have media)
- ✅ artifact_media table has records (if existing artifacts have media)
- ✅ Gallery displays on artifact detail pages
- ✅ Media picker loads existing media
- ✅ New artifacts can be created with media
- ✅ Existing artifacts display unchanged
- ✅ No console errors or warnings

---

**Next Steps After Migration:**
1. Monitor application performance
2. Collect user feedback on gallery UX
3. Consider deprecating legacy media_urls array (future phase)
4. Implement additional features (inline media blocks, cover images)
