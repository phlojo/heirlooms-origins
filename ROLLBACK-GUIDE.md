# Rollback Guide: Phase 1 Media Derivatives

**Purpose:** Emergency rollback procedure if Phase 1 implementation causes issues in production.

**Last Updated:** 2025-11-25

---

## 🚨 When to Rollback

Use this guide if you experience:
- Errors when creating new artifacts
- Images not displaying after migration
- Database errors related to `media_derivatives`
- Performance degradation
- Unexpected Cloudinary quota usage

**Note:** The implementation is designed to be safe, but this rollback exists as a precaution.

---

## 📋 Quick Rollback (Emergency)

If you need to rollback immediately:

### **Option 1: Database Rollback Only (Keep New Code)**

**Scenario:** Migration ran but causing issues, code is already deployed.

**Impact:** New artifacts won't have derivatives (will use fallback), but everything will work.

```sql
-- In Supabase SQL Editor:
DROP INDEX IF EXISTS idx_artifacts_media_derivatives;
ALTER TABLE artifacts DROP COLUMN IF EXISTS media_derivatives;
```

**Result:**
- ✅ All artifacts work normally (fallback to dynamic transformations)
- ✅ No errors
- ✅ Back to pre-Phase-1 behavior

---

### **Option 2: Full Rollback (Code + Database)**

**Scenario:** Need to completely revert to previous version.

**Steps:**

#### 1. Revert Code Changes
```bash
# If you haven't committed yet
git checkout .
git clean -fd

# If you committed but haven't pushed
git reset --hard HEAD~1

# If you pushed and deployed
git revert <commit-hash>
git push
# Redeploy via Vercel/hosting
```

#### 2. Run Database Rollback
```bash
# In Supabase SQL Editor, run:
# scripts/012_rollback_media_derivatives.sql
```

#### 3. Verify Rollback
```bash
# Start dev server
pnpm dev

# Test:
# - View artifacts list
# - View artifact detail
# - Create new artifact
# - Upload media
```

---

## 🔍 Detailed Rollback Procedures

### **Procedure A: Database Migration Rollback**

**When:** Migration completed but causing issues.

**Steps:**

1. **Backup First (Safety)**
   ```sql
   -- In Supabase SQL Editor:
   -- Export the media_derivatives data (just in case)
   COPY (
     SELECT id, media_derivatives
     FROM artifacts
     WHERE media_derivatives IS NOT NULL
   ) TO '/tmp/media_derivatives_backup.csv' WITH CSV HEADER;
   ```

2. **Run Rollback Script**
   ```sql
   -- Run: scripts/012_rollback_media_derivatives.sql
   DROP INDEX IF EXISTS idx_artifacts_media_derivatives;
   ALTER TABLE artifacts DROP COLUMN IF EXISTS media_derivatives;
   ```

3. **Verify Column Removed**
   ```sql
   SELECT column_name
   FROM information_schema.columns
   WHERE table_name = 'artifacts'
   AND column_name = 'media_derivatives';
   -- Should return 0 rows
   ```

4. **Test Artifact Display**
   - Visit artifacts list page
   - View artifact detail page
   - Verify images display correctly

**Expected Outcome:**
- ✅ No more `media_derivatives` column
- ✅ Code falls back to dynamic transformations
- ✅ All artifacts display normally

---

### **Procedure B: Code Rollback**

**When:** New code is causing errors.

**Files to Revert:**

1. **Database Migration**
   - DELETE: `scripts/012_add_media_derivatives.sql`
   - RUN: `scripts/012_rollback_media_derivatives.sql`

2. **Server Actions**
   - DELETE: `lib/actions/media-derivatives.ts`
   - REVERT: `lib/actions/artifacts.ts` to previous version

3. **Schemas**
   - REVERT: `lib/schemas.ts` to previous version (remove `media_derivatives` field)

4. **Utilities**
   - REVERT: `lib/cloudinary.ts` to previous version (remove `mediaDerivatives` parameter)

5. **Components**
   - REVERT: `components/artifact-card.tsx`
   - REVERT: `components/artifact-card-compact.tsx`
   - REVERT: `components/artifact-card-full.tsx`
   - REVERT: `components/artifact-detail-view.tsx`

6. **Documentation**
   - DELETE: `PHASE-1-IMPLEMENTATION-SUMMARY.md`
   - DELETE: `ROLLBACK-GUIDE.md` (this file)

**Git Commands:**
```bash
# View commit that introduced Phase 1
git log --oneline | grep -i "phase 1\|media derivatives"

# Revert specific commit (replace COMMIT_HASH)
git revert COMMIT_HASH

# Or revert multiple files manually
git checkout HEAD~1 -- lib/schemas.ts
git checkout HEAD~1 -- lib/actions/artifacts.ts
git checkout HEAD~1 -- lib/cloudinary.ts
# ... etc

# Commit the revert
git add .
git commit -m "revert: rollback Phase 1 media derivatives implementation"
git push
```

---

### **Procedure C: Partial Rollback (Keep Schema, Disable Feature)**

**When:** Want to keep database schema but disable the feature temporarily.

**Steps:**

1. **Keep Database Column** (don't drop it)

2. **Modify `lib/actions/artifacts.ts`:**
   ```typescript
   // Comment out derivative generation:
   // const mediaDerivatives = validMediaUrls.length > 0 ? generateDerivativesMap(validMediaUrls) : null
   const mediaDerivatives = null  // ← Temporarily disabled
   ```

3. **Deploy Code**
   ```bash
   git add lib/actions/artifacts.ts
   git commit -m "fix: temporarily disable media derivatives generation"
   git push
   ```

**Result:**
- ✅ New artifacts won't generate derivatives
- ✅ Fallback to dynamic transformations
- ✅ Can re-enable later by uncommenting
- ✅ No data loss

---

## 🧪 Post-Rollback Verification

After rollback, verify these work:

### **1. Artifacts List Page**
```bash
# Visit: /artifacts or /collections/[id]
# Check:
- [ ] Thumbnails display
- [ ] No console errors
- [ ] No missing images
```

### **2. Artifact Detail Page**
```bash
# Visit: /artifacts/[slug]
# Check:
- [ ] Images display at full size
- [ ] Videos play correctly
- [ ] No console errors
```

### **3. Create New Artifact**
```bash
# Try creating a new artifact with media
# Check:
- [ ] Upload succeeds
- [ ] Artifact saves
- [ ] Media displays
- [ ] No errors in console
```

### **4. Database Check**
```sql
-- Verify column is gone (if full rollback)
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'artifacts'
AND column_name = 'media_derivatives';
-- Should return 0 rows

-- Verify artifacts still exist
SELECT COUNT(*) FROM artifacts;

-- Verify media_urls intact
SELECT id, title, media_urls
FROM artifacts
WHERE media_urls IS NOT NULL
LIMIT 5;
```

### **5. TypeScript Check**
```bash
pnpm typecheck
# Should pass with no errors
```

---

## 🔄 Re-applying After Rollback

If you rolled back and want to try again:

1. **Identify and Fix Root Cause**
   - Check error logs
   - Review what went wrong
   - Test thoroughly in dev

2. **Apply Migration Again**
   ```sql
   -- Run: scripts/012_add_media_derivatives.sql
   ALTER TABLE artifacts ADD COLUMN media_derivatives JSONB;
   CREATE INDEX IF NOT EXISTS idx_artifacts_media_derivatives
   ON artifacts USING GIN (media_derivatives);
   ```

3. **Deploy Code Again**
   ```bash
   git checkout <phase-1-branch>
   git merge main
   # Test thoroughly
   git push
   ```

---

## 📊 Rollback Impact Assessment

| Scenario | Data Loss? | Downtime? | User Impact? |
|----------|------------|-----------|--------------|
| **Database rollback only** | No (only derivatives lost) | None | None (fallback works) |
| **Code rollback only** | No | <1 min | None (column unused) |
| **Full rollback** | No (original media intact) | <2 min | None |
| **Partial rollback** | No | None | None |

**Key Point:** Rolling back NEVER affects your original media files or artifacts. Only the `media_derivatives` optimization is removed.

---

## 🆘 Emergency Contacts

If rollback doesn't resolve issues:

1. **Check Logs:**
   - Vercel/hosting logs
   - Supabase logs
   - Browser console
   - Server-side logs

2. **Common Issues:**
   - **"Column doesn't exist"**: Run migration again
   - **Images not displaying**: Clear browser cache, check media_urls
   - **TypeScript errors**: Run `pnpm typecheck` and fix type issues
   - **Cloudinary quota**: Check Cloudinary dashboard

3. **Support Channels:**
   - GitHub issues (if using a public repo)
   - Supabase support (for database issues)
   - Cloudinary support (for media issues)

---

## 📝 Rollback Checklist

Use this checklist when performing rollback:

```
Pre-Rollback:
- [ ] Document the issue (screenshots, error messages)
- [ ] Check if issue is truly related to Phase 1
- [ ] Backup media_derivatives data (if possible)
- [ ] Notify team/users of maintenance

Rollback:
- [ ] Run database rollback script
- [ ] Verify column removed (SQL query)
- [ ] Revert code changes (git)
- [ ] Redeploy application
- [ ] Clear CDN/cache if applicable

Post-Rollback:
- [ ] Test artifacts list page
- [ ] Test artifact detail page
- [ ] Test creating new artifact
- [ ] Check database integrity
- [ ] Monitor error logs for 24 hours
- [ ] Document root cause

Follow-up:
- [ ] Identify what went wrong
- [ ] Fix issue in dev environment
- [ ] Test thoroughly before re-deploying
```

---

## 🎓 Prevention Tips

To avoid needing rollback in the future:

1. **Always test in dev first**
2. **Run migration before deploying code**
3. **Deploy during low-traffic periods**
4. **Monitor logs immediately after deploy**
5. **Have this rollback guide ready**
6. **Keep backups of working code versions**

---

**Last Updated:** 2025-11-25
**Rollback Script Location:** `scripts/012_rollback_media_derivatives.sql`
**Related Docs:** `PHASE-1-IMPLEMENTATION-SUMMARY.md`, `MEDIA-ARCHITECTURE.md`
