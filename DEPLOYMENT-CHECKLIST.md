# Phase 1 Deployment Checklist

**Date:** 2025-11-25
**Feature:** Media Derivatives Architecture (Phase 1)
**Risk Level:** 🟢 Low (Backwards compatible, with rollback)

---

## 📋 Pre-Deployment Checklist

### Development Environment Testing
- [ ] TypeScript passes: `pnpm typecheck` ✅
- [ ] Dev server runs: `pnpm dev`
- [ ] Created test artifact with media
- [ ] Verified derivatives stored in database
- [ ] Checked console logs show "Using stored derivative"
- [ ] Verified old artifacts still work (fallback)
- [ ] No console errors in browser

### Code Review
- [ ] All files committed to git
- [ ] Reviewed all changes
- [ ] Documentation complete (PHASE-1-IMPLEMENTATION-SUMMARY.md)
- [ ] Rollback script ready (scripts/012_rollback_media_derivatives.sql)

### Database Preparation
- [ ] Have Supabase access
- [ ] SQL Editor ready
- [ ] Database backup exists (Supabase auto-backs up)
- [ ] Migration script copied: `scripts/012_add_media_derivatives.sql`

### Rollback Preparation
- [ ] Rollback script tested in dev
- [ ] ROLLBACK-GUIDE.md reviewed
- [ ] Emergency contacts notified (if applicable)

---

## 🚀 Deployment Steps

### ⏰ Timing
**Recommended:** During low-traffic hours (if possible)
**Duration:** 10-15 minutes total
**Monitoring:** 24 hours post-deployment

---

### STEP 1: Database Migration 🗃️

**CRITICAL:** Run migration BEFORE deploying code

#### 1.1 Open Supabase
```
1. Go to https://supabase.com
2. Navigate to your project
3. Click "SQL Editor" in sidebar
```

#### 1.2 Run Migration
```sql
-- Copy/paste from: scripts/012_add_media_derivatives.sql

ALTER TABLE artifacts
ADD COLUMN media_derivatives JSONB;

COMMENT ON COLUMN artifacts.media_derivatives IS 'Pre-generated derivative URLs for media. Format: { "original_url": { "thumb": "url", "medium": "url", "large": "url" } }. Enables predictable Cloudinary usage by storing derivatives instead of generating them dynamically.';

CREATE INDEX IF NOT EXISTS idx_artifacts_media_derivatives
ON artifacts USING GIN (media_derivatives);
```

#### 1.3 Verify Migration Success
```sql
-- Check column exists
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'artifacts'
AND column_name = 'media_derivatives';

-- Expected result:
-- column_name        | data_type | is_nullable
-- media_derivatives  | jsonb     | YES

-- Check existing artifacts (should have NULL)
SELECT id, title, media_derivatives
FROM artifacts
LIMIT 3;

-- Expected: media_derivatives should be null for all
```

**Checklist:**
- [ ] Migration executed without errors
- [ ] Column exists (verification query passed)
- [ ] Index created successfully
- [ ] Existing artifacts have NULL in new column

**If errors occur:** STOP and investigate. Do not proceed to code deployment.

---

### STEP 2: Verify App Still Works 🧪

**Important:** Test that existing app works before deploying new code.

#### 2.1 Test Production App (Before Code Deploy)
```
Visit your production site:
- [ ] View artifacts list
- [ ] View artifact detail page
- [ ] Click through 3-5 artifacts
- [ ] Verify all images display
- [ ] Check browser console (should be no errors)
```

**Expected:** Everything works normally (old code ignores new column)

---

### STEP 3: Deploy New Code 📦

#### 3.1 Commit Changes
```bash
# Review what will be committed
git status

# Add all Phase 1 files
git add .

# Commit with descriptive message
git commit -m "feat: implement media derivatives architecture (Phase 1)

- Add media_derivatives JSONB column to artifacts table
- Generate thumb/medium/large derivatives on artifact creation
- Update Cloudinary utilities with backwards compatibility
- Fallback to dynamic transformations for old artifacts
- Includes rollback script and comprehensive documentation

Implements MEDIA-ARCHITECTURE.md Phase 1
Closes #[issue-number] (if applicable)"

# Push to remote
git push origin main
```

#### 3.2 Deploy to Vercel (or your hosting)
```bash
# If using Vercel CLI:
vercel --prod

# Or: Push triggers automatic deployment
# Monitor deployment in Vercel dashboard
```

**Checklist:**
- [ ] Git push successful
- [ ] Deployment started
- [ ] Deployment completed without errors
- [ ] Deployment URL received

---

### STEP 4: Post-Deployment Verification ✅

#### 4.1 Test New Artifact Creation
```
1. Go to production site
2. Create NEW artifact with 2-3 images
3. Save artifact
4. Open browser DevTools Console
5. View the artifact detail page
```

**Expected Console Logs:**
```
[cloudinary] getThumbnailUrl: Using stored derivative
[cloudinary] getDetailUrl: Using stored derivative
```

**Checklist:**
- [ ] New artifact created successfully
- [ ] Images display correctly
- [ ] Console shows "Using stored derivative"
- [ ] No errors in console

#### 4.2 Verify Database Has Derivatives
```sql
-- In Supabase SQL Editor:
SELECT id, title, media_derivatives
FROM artifacts
ORDER BY created_at DESC
LIMIT 1;

-- Expected: media_derivatives should contain JSON like:
-- {
--   "https://res.cloudinary.com/.../image1.jpg": {
--     "thumb": "https://res.cloudinary.com/.../w_400,h_400,c_fill,q_auto,f_auto/.../image1.jpg",
--     "medium": "https://res.cloudinary.com/.../w_1024,c_limit,q_auto,f_auto/.../image1.jpg",
--     "large": "https://res.cloudinary.com/.../w_1600,c_limit,q_auto,f_auto/.../image1.jpg"
--   }
-- }
```

**Checklist:**
- [ ] New artifact has media_derivatives populated
- [ ] Derivatives contain thumb, medium, large URLs
- [ ] URLs are valid Cloudinary URLs

#### 4.3 Test Old Artifacts (Backwards Compatibility)
```
1. Find an artifact created BEFORE Phase 1
2. View in artifact list
3. View artifact detail page
4. Check console logs
```

**Expected Console Logs:**
```
[cloudinary] getThumbnailUrl: Generating dynamic transformation (fallback)
[cloudinary] getDetailUrl: Generating dynamic transformation (fallback)
```

**Checklist:**
- [ ] Old artifacts still display correctly
- [ ] Console shows "Generating dynamic transformation (fallback)"
- [ ] No errors or missing images
- [ ] Backwards compatibility confirmed

#### 4.4 Smoke Tests
```
Test core functionality:
- [ ] Artifacts list page loads
- [ ] Artifact detail page loads
- [ ] Collections page loads
- [ ] Create new artifact works
- [ ] Upload media works
- [ ] Edit artifact works
- [ ] Delete artifact works
- [ ] Images display on all pages
```

#### 4.5 Performance Check
```
Monitor Cloudinary dashboard:
1. Go to Cloudinary dashboard
2. Check transformations count
3. Compare to baseline before deployment
```

**Expected:**
- New artifacts should create exactly 3 transformations per image (thumb, medium, large)
- Old artifacts continue using dynamic transformations temporarily
- Overall transformation creation rate should stabilize or decrease

---

### STEP 5: Monitoring Period 📊

#### Hour 1: Active Monitoring
```
- [ ] Check error logs every 15 minutes
- [ ] Monitor Cloudinary quota usage
- [ ] Watch for user reports
- [ ] Test creating 2-3 more artifacts
```

#### Hour 2-24: Passive Monitoring
```
- [ ] Set up alerts for errors (if not already)
- [ ] Check logs every 2-4 hours
- [ ] Monitor Cloudinary dashboard
- [ ] Be ready to rollback if issues arise
```

#### Day 2-7: Normal Operations
```
- [ ] Daily log review
- [ ] Weekly Cloudinary usage report
- [ ] Verify new artifacts have derivatives
- [ ] Optional: Backfill old artifacts (future task)
```

---

## 🔧 Troubleshooting

### Issue: Column already exists
```
Error: column "media_derivatives" already exists
```
**Solution:** Migration already ran. Skip to code deployment.

### Issue: Cannot create new artifacts
```
Error: column "media_derivatives" does not exist
```
**Solution:** Migration didn't run. Go back to STEP 1.

### Issue: Images not displaying
```
Check:
1. Browser console for errors
2. Network tab for failed requests
3. Cloudinary URLs are valid
4. Fallback working for old artifacts
```
**Solution:** Usually a caching issue. Hard refresh (Ctrl+Shift+R).

### Issue: Derivatives not being generated
```
Check:
1. Database: Are media_derivatives NULL for new artifacts?
2. Logs: Any errors in artifact creation?
3. Code: Is generateDerivativesMap() being called?
```
**Solution:** Check server logs for errors in createArtifact().

### Issue: Need to rollback
```
See: ROLLBACK-GUIDE.md
Quick rollback: Run scripts/012_rollback_media_derivatives.sql
```

---

## 📈 Success Metrics

After 24 hours, verify:

- [ ] No increase in error rate
- [ ] New artifacts have derivatives (check 10 random samples)
- [ ] Old artifacts still work (check 10 random samples)
- [ ] Cloudinary quota usage predictable
- [ ] Page load times unchanged or improved
- [ ] No user complaints about images

---

## 📞 Emergency Contacts

**If critical issues arise:**

1. **Run Rollback:** See ROLLBACK-GUIDE.md
2. **Check Logs:** Vercel/hosting dashboard
3. **Database Check:** Supabase logs
4. **Cloudinary Status:** Cloudinary dashboard

**Emergency Rollback (Quick Reference):**
```sql
DROP INDEX IF EXISTS idx_artifacts_media_derivatives;
ALTER TABLE artifacts DROP COLUMN IF EXISTS media_derivatives;
```

---

## ✅ Deployment Complete

When all checks pass:
- [ ] Mark deployment as successful
- [ ] Update team/changelog
- [ ] Document any issues encountered
- [ ] Archive deployment checklist
- [ ] Schedule follow-up review (1 week)

---

**Deployment Date:** _______________
**Deployed By:** _______________
**Rollback Required:** Yes / No
**Issues Encountered:** _______________
**Notes:** _______________

---

**Related Docs:**
- `PHASE-1-IMPLEMENTATION-SUMMARY.md`
- `ROLLBACK-GUIDE.md`
- `MEDIA-ARCHITECTURE.md`
