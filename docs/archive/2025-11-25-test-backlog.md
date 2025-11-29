# Heirlooms Test Backlog

**Generated:** 2025-01-24  
**Test Stack:** Vitest + React Testing Library + Playwright  
**Current Coverage:** ~35% (42 media tests + artifacts actions + API tests)

This backlog is organized into prioritized phases based on the testing strategy in `TESTING.md` and AI analysis scenarios in `docs/guides/ai-testing-checklist.md`.

---

## Current Test Coverage

### ✅ Existing Tests (18 files)

**Unit Tests:**
- `__tests__/unit/utils/media.test.ts` - 42 tests (media URL detection, processing, formatting)
- `__tests__/unit/utils/artifact-filters.test.ts` - Filter parsing and URL building
- `__tests__/unit/actions/artifacts.test.ts` - 701 lines covering create/update/delete artifact actions
- `__tests__/unit/schemas.test.ts` - Zod schema validation

**Component Tests:**
- `__tests__/components/ui/artifact-card.test.tsx` - ArtifactCard rendering
- `__tests__/components/ui/collection-card.test.tsx` - CollectionCard rendering

**Integration Tests:**
- `__tests__/integration/api/transcribe.test.ts` - Audio transcription API (comprehensive)
- `__tests__/integration/api/analyze-images.test.ts` - Image captioning API
- `__tests__/integration/api/cleanup-expired-uploads.test.ts` - Cleanup cron job
- `__tests__/integration/workflows/artifact-workflows.test.ts` - End-to-end artifact workflows
- `__tests__/integration/workflows/collection-workflows.test.ts` - End-to-end collection workflows

**E2E Tests:**
- `__tests__/e2e/artifact-save.spec.ts` - Artifact save flow, unsaved changes warning

---

## Phase A: Core Flows (High Priority)

**Goal:** Test the primary user journeys that are critical to app functionality.

### A1: Authentication & Authorization

**File:** `__tests__/e2e/auth-flow.spec.ts`  
**Type:** E2E (Playwright)  
**Covers:**
- User sign up with email/password (uses Supabase auth)
- User login with email/password
- Email confirmation flow (check for confirmation email requirement)
- Logout and session cleanup
- Protected route access (redirect to /login when unauthenticated)
- `/auth/callback` handling after email confirmation

### A2: Collection CRUD Operations

**File:** `__tests__/e2e/collection-crud.spec.ts`  
**Type:** E2E (Playwright)  
**Covers:**
- Create new collection from `/collections/new`
- Edit collection title, description, visibility (public/private)
- Delete collection (with and without artifacts)
- View collection detail page at `/collections/[slug]`
- Navigate between collections using prev/next if implemented

### A3: Artifact Creation Flow

**File:** `__tests__/e2e/artifact-creation.spec.ts`  
**Type:** E2E (Playwright)  
**Covers:**
- Create artifact from `/artifacts/new` with image upload
- Create artifact with multiple media types (image + video + audio)
- Auto-select thumbnail from uploaded media
- Manual thumbnail selection
- Assign artifact to collection
- Select artifact type from dropdown
- Verify slug generation and redirect to detail page

### A4: Artifact Update Flow

**File:** `__tests__/e2e/artifact-update.spec.ts`  
**Type:** E2E (Playwright)  
**Covers:**
- Edit artifact title, description, year, origin
- Add/remove media from existing artifact
- Change thumbnail selection
- Move artifact to different collection
- Change artifact type
- Save and verify updated slug redirect (already tested in `artifact-save.spec.ts`)

### A5: Navigation & Routing

**File:** `__tests__/components/navigation/bottom-nav.test.tsx`  
**Type:** Component Test  
**Covers:**
- Bottom nav renders on mobile viewport
- Active route highlighting
- Navigation to /artifacts, /collections, /profile
- Safe area inset handling (iOS notch)

**File:** `__tests__/e2e/navigation.spec.ts`  
**Type:** E2E (Playwright)  
**Covers:**
- Navigate between main pages (home, artifacts, collections, stories, profile)
- Browser back/forward navigation
- Direct URL access to artifact/collection detail pages
- 404 handling for non-existent slugs

---

## Phase B: AI Analysis Features (Medium Priority)

**Goal:** Test the AI-powered analysis features per `ai-testing-checklist.md`.

### B1: Audio Transcription

**File:** `__tests__/integration/api/audio-analysis.test.ts`  
**Type:** Integration (API Test)  
**Covers:**
- Audio-only artifact → transcript generated via `/api/analyze/audio`
- Transcript saved to `artifacts.transcript` field
- Status badge changes: `idle` → `processing` → `done`
- Missing audio URL → 400 error
- Toast notifications for success/error
- Transcript cleanup (optional formatting step)

**Notes:** Some coverage exists in `transcribe.test.ts`, but analysis flow needs dedicated tests.

### B2: Image Captioning

**File:** `__tests__/integration/api/image-captioning.test.ts`  
**Type:** Integration (API Test)  
**Covers:**
- Images-only artifact → captions generated via `/api/analyze/images`
- Max 5 images processed per artifact
- Captions saved to `artifacts.image_captions` (JSON mapping URL → caption)
- Broken image URL → graceful skip with error message
- Status badge changes and toast notifications

**Notes:** Some coverage exists in `analyze-images.test.ts`, expand to match checklist scenarios.

### B3: AI Description Generation

**File:** `__tests__/integration/api/summary-generation.test.ts`  
**Type:** Integration (API Test)  
**Covers:**
- Generate description from transcript + image captions via `/api/analyze/summary`
- Markdown formatting (highlights, people, places, etc.)
- Missing inputs (no transcript/captions) → 400 error with helpful message
- Regenerate description (idempotent behavior)
- Status and toast notifications

### B4: "Run All" Orchestrator

**File:** `__tests__/integration/api/run-all-analysis.test.ts`  
**Type:** Integration (API Test)  
**Covers:**
- Both audio + images → all steps run sequentially via `/api/analyze/run-all`
- Retry logic (each step retries once on failure with 500-1500ms delay)
- 45-second timeout per step
- Final status: `done` if all succeed, `error` if any fail
- All three content sections populated (transcript, captions, description)

### B5: Analysis UI Components

**File:** `__tests__/components/ai-analysis-panel.test.tsx`  
**Type:** Component Test  
**Covers:**
- AnalysisPanel component rendering based on `analysis_status`
- Status badge display (idle, processing, done, error)
- Collapsible transcript section
- Image captions list (numbered, max 5)
- AI description markdown rendering
- "Transcribe Audio", "Caption Photos", "Generate Description" buttons
- "Run All" button visibility and behavior
- "Regenerate" button for description

---

## Phase C: Filtering, Types, Gallery (Medium Priority)

**Goal:** Test artifact filtering, type management, and gallery views.

### C1: Artifact Filtering

**File:** `__tests__/e2e/artifact-filtering.spec.ts`  
**Type:** E2E (Playwright)  
**Covers:**
- Sort artifacts by "newest", "oldest", "title" on `/artifacts` page
- Filter by artifact type (multi-select)
- Clear all filters
- URL param persistence (`?sort=newest&types=car,watch`)
- Filter state preserved across page reload

**File:** `__tests__/unit/utils/artifact-filters.test.ts` ✅  
**Status:** Already exists, verify comprehensive coverage.

### C2: Artifact Type Management

**File:** `__tests__/unit/actions/artifact-types.test.ts`  
**Type:** Unit Test  
**Covers:**
- `getArtifactTypes()` - fetch active types only
- `getArtifactTypesWithCounts()` - include artifact counts per type
- `getArtifactTypeById()` and `getArtifactTypeBySlug()`
- `deactivateArtifactType()` - admin only
- `reactivateArtifactType()` - admin only
- `getAllArtifactTypesAdmin()` - admin access check

### C3: Gallery vs List View

**File:** `__tests__/components/artifacts-tabs.test.tsx`  
**Type:** Component Test  
**Covers:**
- ArtifactsTabs component rendering
- Tab switching between "Mine" and "All"
- View preference toggle (standard vs compact)
- Filter controls (sort dropdown, type checkboxes)
- Empty states ("No artifacts yet")

**File:** `__tests__/components/collections-tabs.test.tsx`  
**Type:** Component Test  
**Covers:**
- CollectionsTabs component rendering
- Gallery vs list view toggle
- Empty states for collections

### C4: View Preference Persistence

**File:** `__tests__/unit/actions/profile.test.ts`  
**Type:** Unit Test  
**Covers:**
- `updateViewPreference()` - save gallery/list preference
- `getViewPreference()` - retrieve user preference
- `updateArtifactsViewPreference()` - save standard/compact preference
- `getArtifactsViewPreference()` - retrieve preference
- Server-side cookies for preferences

---

## Phase D: Regression Net + CI (Lower Priority)

**Goal:** Catch edge cases and set up continuous integration.

### D1: Media Upload & Pending Uploads

**File:** `__tests__/unit/actions/pending-uploads.test.ts`  
**Type:** Unit Test  
**Covers:**
- `trackPendingUpload()` - track uploaded media before save
- `markUploadsAsSaved()` - mark media as saved after artifact creation
- `cleanupPendingUploads()` - delete pending uploads after 24 hours
- `cleanupExpiredUploads()` - cron job cleanup
- `auditPendingUploads()` - generate media audit report

**File:** `__tests__/integration/api/cleanup-expired-uploads.test.ts` ✅  
**Status:** Already exists, verify edge cases.

### D2: Cloudinary Integration

**File:** `__tests__/unit/actions/cloudinary.test.ts`  
**Type:** Unit Test  
**Covers:**
- `generateCloudinarySignature()` - signed upload params for images
- `generateCloudinaryAudioSignature()` - signed upload params for audio
- `deleteCloudinaryMedia()` - delete media from Cloudinary (cleanup)
- `extractPublicIdFromUrl()` - parse public_id from Cloudinary URL
- Signature validation (timestamp, public_id, folder structure)

### D3: Slug Generation & Collision Handling

**File:** `__tests__/unit/utils/slug.test.ts`  
**Type:** Unit Test  
**Covers:**
- `generateSlug()` - kebab-case conversion, special char removal
- `generateUniqueSlug()` - database check for uniqueness
- Slug collision handling (retry with random suffix)
- Max collision attempts (fail after 5 retries)
- Slug uniqueness constraints

### D4: Rate Limiting

**File:** `__tests__/unit/utils/rate-limit.test.ts`  
**Type:** Unit Test  
**Covers:**
- `rateLimit()` - IP-based rate limiting
- 429 response when limit exceeded
- `retryAfterMs` calculation
- Sliding window implementation
- Reset after time window

### D5: Schema Validation Edge Cases

**File:** `__tests__/unit/schemas.test.ts` ✅  
**Status:** Exists, expand to cover:
- `createArtifactSchema` - all field validations (title length, year range, etc.)
- `updateArtifactSchema` - partial updates, optional fields
- `createCollectionSchema` - title, description, visibility
- `updateCollectionSchema` - partial updates
- `mediaUrlSchema` - URL format validation
- Error message quality (user-friendly)

### D6: User Profile & Settings

**File:** `__tests__/unit/actions/profile.test.ts`  
**Type:** Unit Test  
**Covers:**
- `updateThemePreference()` - save light/dark theme
- `getThemePreference()` - retrieve theme
- `updateUserPassword()` - change password (requires current password)
- `setUserPassword()` - set initial password (for magic link users)
- `updateDisplayName()` - update user display name
- `getUserAuthProvider()` - check if user used password or OAuth
- `userHasPassword()` - check if password is set

### D7: Admin Utilities

**File:** `__tests__/unit/utils/admin.test.ts`  
**Type:** Unit Test  
**Covers:**
- `isCurrentUserAdmin()` - check current user admin status
- `isUserAdmin()` - check specific user admin status
- Admin-only route protection
- Admin role assignment (stored in `profiles.role`)

### D8: Error Boundaries & Edge Cases

**File:** `__tests__/components/error-boundary.test.tsx`  
**Type:** Component Test  
**Covers:**
- Error boundary component catches rendering errors
- Graceful error display to user
- Reset error boundary after error

**File:** `__tests__/e2e/error-scenarios.spec.ts`  
**Type:** E2E (Playwright)  
**Covers:**
- 404 page for non-existent artifact/collection slug
- 403 access denied for private collections (non-owner)
- Network error handling (offline, timeout)
- Invalid form submissions (client-side validation)

---

## Phase E: Polish & Performance (Lowest Priority)

**Goal:** Test performance, accessibility, and mobile-specific features.

### E1: Mobile Interactions

**File:** `__tests__/e2e/mobile-swipe.spec.ts`  
**Type:** E2E (Playwright, mobile viewport)  
**Covers:**
- Swipe navigation between artifacts (if implemented)
- Touch gestures for gallery navigation
- Bottom nav tap accuracy (iOS safe area handling)
- Mobile form interactions (zoom prevention on input focus)

**File:** `__tests__/unit/hooks/use-swipe-navigation.test.ts`  
**Type:** Unit Test (React hook)  
**Covers:**
- `useSwipeNavigation()` hook logic
- Swipe direction detection (left, right)
- Threshold for triggering navigation
- Touch event handling (touchstart, touchmove, touchend)

### E2: Toast Notifications

**File:** `__tests__/unit/hooks/use-toast.test.ts`  
**Type:** Unit Test (React hook)  
**Covers:**
- `useToast()` hook API
- `toast()`, `toast.success()`, `toast.error()` methods
- Toast queue management (max 3 toasts)
- Auto-dismiss after 5 seconds
- Manual dismiss

### E3: Performance & Lazy Loading

**File:** `__tests__/integration/performance/pagination.test.ts`  
**Type:** Integration Test  
**Covers:**
- `getAllPublicArtifactsPaginated()` - cursor-based pagination
- `getMyArtifactsPaginated()` - user-specific pagination
- `getAllPublicCollectionsPaginated()` - collection pagination
- Lazy loading of media (images loaded as user scrolls)
- Request deduplication (SWR caching)

### E4: Accessibility (a11y)

**File:** `__tests__/e2e/accessibility.spec.ts`  
**Type:** E2E (Playwright + axe)  
**Covers:**
- Run axe-core on major pages (home, artifacts, collections, profile)
- Keyboard navigation (tab order, focus management)
- Screen reader compatibility (ARIA labels, semantic HTML)
- Color contrast ratios (WCAG AA compliance)
- Form label associations

---

## Not Worth Testing (Explicitly Skipped)

These areas are either too low-value, too fragile, or better tested manually:

1. **Theme Toggle Animation** - Visual polish, not core functionality
2. **Favicon/Metadata** - Static configuration, rarely changes
3. **CSS Specifics** - Layout is tested via visual regression, not unit tests
4. **Third-party Library Internals** - Trust Supabase, Cloudinary, OpenAI SDKs
5. **Markdown Rendering** - Trust react-markdown, test input/output only
6. **Date Formatting** - Trust date-fns, no need for dedicated tests

---

## Test Execution Plan

### Local Development
\`\`\`bash
# Run all unit + component tests
npm run test

# Watch mode for TDD
npm run test:watch

# Run specific test file
npm run test -- artifact-filters.test.ts

# Coverage report
npm run test:coverage
\`\`\`

### E2E Tests
\`\`\`bash
# Run all E2E tests
npm run test:e2e

# Interactive mode with UI
npm run test:e2e:ui

# Debug mode (headed browser)
npm run test:e2e -- --headed

# Specific test file
npm run test:e2e -- artifact-save.spec.ts
\`\`\`

### CI/CD Pipeline (GitHub Actions)

**Recommendation:** Set up `.github/workflows/test.yml` with:
1. **On every push:** Run `npm run type-check` + `npm run lint`
2. **On PR to main:** Run `npm run test` + `npm run test:e2e`
3. **Coverage reporting:** Upload to Codecov or similar
4. **Block merge if:**
   - Tests fail
   - Coverage drops below 75%
   - Type errors or linting errors

---

## Coverage Goals

| Category | Target | Current |
|----------|--------|---------|
| **Server Actions** | 90%+ | ~30% (artifacts only) |
| **Utility Functions** | 85%+ | ~40% (media utils done) |
| **Components** | 70%+ | ~5% (2 cards done) |
| **API Routes** | 85%+ | ~25% (transcribe + images) |
| **Hooks** | 80%+ | 0% |
| **Overall** | 80%+ | ~35% |

---

## Priority Summary

**Start Here (Next Sprint):**
1. Phase A: Core Flows (auth, CRUD, navigation) → 5 E2E tests
2. Phase B: AI Analysis (match checklist.md scenarios) → 5 integration tests
3. Phase D1-D3: Media uploads, Cloudinary, slugs → 3 unit tests

**Later:**
4. Phase C: Filtering, types, gallery views → 4 tests
5. Phase D4-D8: Rate limits, profiles, admin, errors → 7 tests
6. Phase E: Mobile, a11y, performance → 5 tests

**Estimated Test Count:**
- Phase A: ~80 tests
- Phase B: ~60 tests
- Phase C: ~50 tests
- Phase D: ~90 tests
- Phase E: ~40 tests
- **Total: ~320 new tests** (plus 42 existing = 362 total)

---

## Notes

- **Fixtures:** Reuse and extend `__tests__/fixtures/index.ts` for all test data
- **Mocks:** Leverage `__tests__/mocks/*` for Supabase, Cloudinary, OpenAI
- **Test Utils:** Use `__tests__/test-utils.ts` for custom render, mockData generators
- **Atomic PRs:** Add tests in small, reviewable batches (1 phase at a time)
- **TDD Approach:** Write tests first for new features (e.g., stories feature)

---

**Last Updated:** 2025-01-24  
**Maintainer:** Development Team  
**Feedback:** Update this backlog as you complete tests or discover new test needs.
