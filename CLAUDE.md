# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Heirlooms is a Next.js 16 application for preserving and sharing family artifacts and memories. It uses:
- **Frontend**: React 19.2, TypeScript 5.1, Tailwind CSS 4.1, Radix UI components
- **Backend**: Next.js App Router with Server Actions, PostgreSQL via Supabase
- **Storage**: Cloudinary for media (images, videos, audio)
- **AI**: OpenAI GPT-4o for image captioning/video summaries, Whisper for transcription
- **Auth**: Supabase Auth (email/password + Google OAuth)

## Essential Commands

### Development
\`\`\`bash
pnpm dev              # Start dev server (http://localhost:3000)
pnpm build            # Build for production
pnpm start            # Start production server
\`\`\`

### Code Quality
\`\`\`bash
pnpm typecheck        # TypeScript type checking (must pass before commits)
pnpm lint             # ESLint (auto-fixes in pre-commit hook)
pnpm format           # Prettier formatting
\`\`\`

### Testing
\`\`\`bash
pnpm test             # Run unit/component tests (Vitest) - USE THIS FOR NORMAL CHECKS
pnpm test:watch       # Watch mode
pnpm test:ui          # Interactive test UI
pnpm test:coverage    # Generate coverage report - ONLY RUN WHEN EXPLICITLY REQUESTED
pnpm test:e2e         # Run E2E tests (Playwright)
pnpm test:e2e:ui      # E2E tests in interactive mode
pnpm test:all         # Run typecheck + lint + unit + E2E tests - USE FOR FULL CI RUNS
\`\`\`

**Which test command to use:**
- `pnpm test` - Normal checks (fast, use this by default)
- `pnpm test:e2e` - E2E tests only
- `pnpm test:all` - Full CI runs (typecheck + lint + unit + E2E)
- `pnpm test:coverage` - **Only run when user explicitly asks** (slow, resource-intensive)

**Test file pattern**: `__tests__/**/*.{test,spec}.{ts,tsx}` (excluding `__tests__/e2e/`)

### Running Single Tests
\`\`\`bash
pnpm test media.test.ts                    # Run specific test file
pnpm test -t "should detect image URLs"    # Run tests matching pattern
\`\`\`

## Architecture Overview

### Server Actions Pattern
All data mutations use Next.js Server Actions in `lib/actions/`:
- `artifacts.ts` - Create, update, delete artifacts
- `collections.ts` - Collection CRUD operations
- `media.ts` - Unified media model (user_media + artifact_media) ✨ NEW
- `cloudinary.ts` - Media upload/deletion to Cloudinary
- `pending-uploads.ts` - Track temporary uploads (24hr expiration)
- `auth.ts` - Authentication flows
- `profile.ts` - User profile management
- `artifact-types.ts` - Admin-managed artifact type system

**Pattern**: Server Actions validate with Zod schemas (`lib/schemas.ts`), use `createClient()` from `lib/supabase/server.ts`, and call `revalidatePath()` after mutations.

### Media System (Phase 2 - Supabase Storage + Cloudinary Fetch)
**Architecture:** Originals in Supabase Storage, derivatives via Cloudinary fetch (80-90% cost reduction)

**Critical principles** (see `MEDIA-ARCHITECTURE.md` for full details):
1. **Media order is sacred** - User insertion order must be preserved
2. **URL is the stable identifier** - Never use array indices for media references
3. **AI metadata uses JSONB maps** - `{ url: caption }` format in `image_captions`, `video_summaries`, `audio_transcripts`
4. **Cleanup is defensive** - `pending_uploads` table tracks temporary media, cron job audits orphaned files
5. **Two-phase upload** - Files upload to temp, reorganize to artifact folder after save
6. **On-demand derivatives** - Cloudinary fetches from Supabase and caches transformations

**Storage routing** (feature flag: `NEXT_PUBLIC_USE_SUPABASE_STORAGE`):
- `true` → New uploads go to Supabase Storage (current default)
- `false` → Legacy mode, uploads go to Cloudinary

**Key utilities** (`lib/media.ts`):
- `isImageUrl(url)` / `isVideoUrl(url)` / `isAudioUrl(url)` - Canonical media type detection
- `isSupabaseStorageUrl(url)` / `isCloudinaryUrl(url)` - Storage backend detection
- `getStorageType(url)` - Returns 'supabase' | 'cloudinary' | 'unknown'
- `getPrimaryVisualMediaUrl(urls)` - Get thumbnail (first image > first video)
- `hasVisualMedia(urls)` - Check if artifact has displayable media

**Supabase Storage** (`lib/actions/supabase-storage.ts`):
- `uploadToSupabaseStorage(file, folder)` - Upload originals to Supabase
- `deleteFromSupabaseStorage(url)` - Delete from Supabase Storage
- `moveSupabaseFile(url, userId, artifactId)` - Reorganize from temp to artifact folder
- Files organized: `{userId}/{artifactId}/{timestamp}-{filename}`

**Cloudinary integration** (`lib/cloudinary.ts`):
- `getThumbnailUrl(url)` / `getMediumUrl(url)` / `getLargeUrl(url)` - Generate derivative URLs
- For Supabase URLs: Returns Cloudinary fetch URL (on-demand transformation)
- For Cloudinary URLs: Returns stored derivative or dynamic transformation
- `deleteCloudinaryMedia(publicId)` - Delete Cloudinary media (legacy)

### Artifact Gallery (Unified Media Model)
**Status**: ✅ Implemented (Phase 2 complete, 2025-11-27)

The artifact gallery is a horizontal carousel of media displayed at the top of artifact pages. It uses a unified media model with role-based linking.

**Database Schema**:
- `user_media` - Canonical storage for all user uploads (filename, type, URL, metadata)
- `artifact_media` - Junction table linking artifacts to media with roles
  - Roles: `gallery` (carousel), `inline_block` (future), `cover` (thumbnail)
  - `sort_order` - Integer for ordering within role
  - `caption_override` - Optional per-use caption

**Dual-write pattern**: Maintains both new tables AND legacy `artifacts.media_urls` array for backward compatibility.

**View Mode** (`components/artifact-media-gallery.tsx`):
- Uses **Flickity** carousel library
- Touch/swipe navigation with custom prev/next buttons
- Lazy loading (2 ahead), adaptive height
- Image fit toggle (tap to switch cover/contain)
- Auto-pause videos on slide change
- Page dots for position indicator

**Edit Mode** (`components/artifact-gallery-editor.tsx`):
- Uses **@dnd-kit** for React-first drag-and-drop
- Horizontal sortable list with `horizontalListSortingStrategy`
- Optimistic updates (instant UI feedback, no refetch on reorder)
- Auto-save with two-phase database update
- MediaPicker integration for selecting from library
- Touch/keyboard/mouse support via sensors

**Server Actions** (`lib/actions/media.ts`):
- `createUserMedia()` - Create user_media record
- `getUserMediaLibrary()` - Get user's media library with filtering
- `createArtifactMediaLink()` - Link media to artifact with role
- `getArtifactGalleryMedia()` - Get gallery media with derivatives
- `reorderArtifactMedia()` - Reorder within role (two-phase update)
- `removeArtifactMediaLink()` - Remove media from artifact
- `getMediaUsage()` - Find where media is used

**Key Implementation Details**:
- Container height: 192px with hidden scrollbar
- Card spacing: 4px gap, 12px padding, 64x64 thumbnails
- Optimistic updates: Update UI immediately, save in background, revert on error
- Two-phase reorder: Prevents unique constraint violations
- See `docs/guides/artifact-gallery-editor.md` for complete guide

### URL Routing (Hybrid ID + Slug)
**Decision**: Use UUID + slug pattern for stable, shareable URLs.

\`\`\`
/artifacts/[uuid]/[slug]    # Slug is optional
/collections/[uuid]/[slug]  # Slug updates with title changes
\`\`\`

**Benefits**: Old links never break (UUID is authoritative), slugs stay SEO-friendly and match current titles. See `ARCHITECTURE.md` for full rationale.

**Implementation**: Routes look up by UUID, redirect to canonical URL if slug is wrong/missing. Slugs generated by `generateUniqueSlug()` in `lib/utils/slug.ts`.

### Database Schema (Supabase/PostgreSQL)
Key tables:
- `artifacts` - Media items with title, description, media_urls (array), AI metadata (JSONB)
- `collections` - Groups of artifacts, has privacy settings (is_public)
- `artifact_types` - Dynamic type system (cars, watches, general, custom)
- `user_media` - Canonical storage for all user uploads (unified media model) ✨ NEW
- `artifact_media` - Junction table linking artifacts to media with roles ✨ NEW
- `pending_uploads` - Temporary media tracking (expires after 24hr)
- `profiles` - User profiles (extends Supabase auth.users)

**Row-Level Security (RLS)**: All tables have RLS policies. Users can only read/write their own data unless collection is public.

### Validation & Schemas
All inputs validated with Zod schemas in `lib/schemas.ts`:
- `createArtifactSchema` / `updateArtifactSchema`
- `createCollectionSchema` / `collectionSchema`

**File size limits**:
- Videos: 500MB
- Other media: 50MB
- Enforced in `lib/utils/file-size.ts`

### AI Analysis
**Endpoints** (`app/api/analyze/`):
- `/api/analyze/images` - Batch image captioning (GPT-4o vision)
- `/api/analyze/image-single` - Single image caption
- `/api/analyze/video-single` - Video frame extraction + GPT-4o summary
- `/api/analyze/audio-single` - Whisper transcription
- `/api/analyze/run-all` - Analyze all media in artifact

**Pattern**: AI metadata stored as JSONB maps keyed by media URL. Use `lib/ai.ts` for OpenAI SDK integration.

### Testing Infrastructure
**Current status**: Phases 1-3 complete (169 tests, 66% coverage)

**Test structure**:
\`\`\`
__tests__/
├── unit/           # Utilities, schemas, server actions
│   ├── utils/      # 42 tests for media.ts
│   └── actions/    # Server action tests
├── components/     # React Testing Library component tests
├── integration/    # API route tests (Phase 4)
├── e2e/           # Playwright E2E tests (Phase 5)
├── mocks/         # Supabase, Cloudinary, OpenAI mocks
└── fixtures/      # Test data (20+ objects with proper UUIDs)
\`\`\`

**Test utilities** (`__tests__/test-utils.ts`):
- `render()` - Enhanced React Testing Library render
- `mockData.artifact()` / `mockData.collection()` - Generate test data
- `createMockSupabaseClient()` - Mock Supabase client
- Mock implementations for external services (Cloudinary, OpenAI)

**Coverage goals**: Server Actions 90%+, Utilities 85%+, Components 70%+, Overall 80%+

See `TESTING.md` for comprehensive testing guide.

## Common Development Tasks

### Adding a New Server Action
1. Add function to appropriate file in `lib/actions/`
2. Mark with `"use server"` directive
3. Validate input with Zod schema from `lib/schemas.ts`
4. Use `await createClient()` from `lib/supabase/server`
5. Check `user` authentication before mutations
6. Call `revalidatePath()` or `redirect()` after changes
7. Write unit tests in `__tests__/unit/actions/`

### Working with Media URLs
- **Always** use `isImageUrl()`, `isVideoUrl()`, `isAudioUrl()` from `lib/media.ts`
- **Never** mutate `media_urls` array order - preserve user's insertion order
- **Never** reference media by index - use URL as identifier
- Use `getPrimaryVisualMediaUrl()` for thumbnails
- Track pending uploads with `markUploadsAsPending()` / `markUploadsAsSaved()`

### Adding/Modifying Components
- Use Radix UI primitives from `components/ui/` (Shadcn components)
- Follow mobile-first design (responsive with Tailwind)
- Add component tests in `__tests__/components/`
- Use `useSupabase()` hook from `components/supabase-provider.tsx` for client-side Supabase access

### TypeScript: Database Types vs Component Props
**Critical**: PostgreSQL `NULL` becomes JavaScript `null`, NOT `undefined`.

When defining component prop types for database-sourced data:
```typescript
// ❌ WRONG - Will fail when database returns null
interface Props {
  year_acquired?: number      // Only accepts undefined
  cover_image?: string        // Only accepts undefined
}

// ✅ CORRECT - Accepts both null and undefined
interface Props {
  year_acquired?: number | null
  cover_image?: string | null
}
```

### Supabase Joins Return Arrays
When using Supabase PostgREST foreign key joins, the result is an **array**, not a single object:

```typescript
// Query with join
const { data } = await supabase
  .from("artifacts")
  .select("*, collection:collections(slug)")
  .single()

// ❌ WRONG - collection is an array
const slug = data.collection?.slug

// ✅ CORRECT - Access first element
const slug = data.collection?.[0]?.slug
```

To get a single object, use `!inner` join modifier (but still check for null).

### Mobile & iOS Safari Viewport Handling
**Critical for mobile experience** - The app uses modern viewport strategies to handle iOS Safari's dynamic UI:

**Viewport Units:**
- Use `100dvh` (dynamic viewport height) instead of `100vh` for min-height
- Custom `--vh` CSS variable available via `ViewportHeightManager` component
- Handles browser UI appearing/disappearing smoothly

**Safe-Area Strategy:**
- **DO NOT** apply `env(safe-area-inset-*)` to body - causes double-padding
- Each sticky/fixed component manages its own safe-area padding
- Use pre-defined CSS classes: `.artifact-sticky-nav`, `.collection-sticky-nav`
- BottomNav automatically handles safe-area-inset-bottom

**Sticky Navigation Classes:**
```css
.artifact-sticky-nav   /* For artifact detail sticky nav (top: 1rem on mobile, 5rem on desktop + safe-area) */
.collection-sticky-nav /* For collection nav, tabs (top: 0 on mobile, 4rem on desktop + safe-area) */
```

**Scroll Behavior:**
- `overscroll-behavior-y: none` on html/body prevents elastic bounce (eliminates flicker)
- `scroll-behavior: smooth` for smooth programmatic scrolls
- Avoid scroll event listeners at scroll boundaries to prevent re-render flicker

**See:** `docs/archive/2025-11-27-ios-safari-scroll-fixes.md` for complete implementation details

### Artifact Grid Layout (Masonry)
The artifact grid uses **Masonry.js** for optimal item arrangement with variable heights:
- **Component**: `components/masonry-grid.tsx` - Core layout engine
- **Card types**: `artifact-card.tsx` (standard), `artifact-card-compact.tsx` (compact), `artifact-card-full.tsx` (full)
- **Features**:
  - Flows top-down, column-by-column (no gaps)
  - Titles wrap up to 5 lines with variable card heights
  - Responsive: 2-6 cols (standard), 3-8 cols (compact) based on breakpoint
  - Reflows on window resize, image load, and content changes
- **See**: `docs/guides/artifact-grid-layout.md` and `docs/guides/card-design-updates.md`

### Modifying Database Schema
1. Update schema in Supabase dashboard
2. Regenerate types: `pnpm supabase gen types typescript` (if setup)
3. Update `lib/schemas.ts` Zod schemas to match
4. Update relevant server actions
5. Write migration tests

## Important Patterns & Conventions

### Supabase Client Usage
- **Server Components/Actions**: Use `createClient()` from `lib/supabase/server.ts`
- **Client Components**: Use `useSupabase()` hook from `components/supabase-provider.tsx`
- **Middleware**: Use `updateSession()` from `lib/supabase/middleware.ts`
- **Important**: Never use `createClient()` from `lib/supabase/client.ts` in Server Components

### Error Handling in Server Actions
\`\`\`typescript
const validatedFields = schema.safeParse(input)
if (!validatedFields.success) {
  return {
    error: "Invalid input",
    fieldErrors: validatedFields.error.flatten().fieldErrors
  }
}
\`\`\`

### Media Upload Flow
1. User selects files → Upload to Cloudinary via `uploadToCloudinary()`
2. Call `markUploadsAsPending()` with URLs
3. Save artifact/collection with media URLs
4. Call `markUploadsAsSaved()` to prevent expiration
5. Cron job `/api/cron/audit-media` identifies orphaned uploads (runs daily at 2 AM UTC)

### Slug Generation
\`\`\`typescript
import { generateUniqueSlug } from "@/lib/utils/slug"

const slug = await generateUniqueSlug(
  title,
  "artifacts",  // table name
  userId        // scope to user
)
\`\`\`

## Cron Jobs & Scheduled Tasks

### Active Cron Jobs (Vercel)
- **Media Audit**: `/api/cron/audit-media` - Daily at 2 AM UTC
  - Read-only audit of `pending_uploads` table
  - Identifies safe-to-delete vs dangerous (in-use) media
  - Requires `CRON_SECRET` env var for auth
  - See `docs/operations/cron-jobs.md` and `docs/guides/media-audit.md`

**Manual trigger**:
\`\`\`bash
curl "https://yourdomain.com/api/cron/audit-media?secret=YOUR_CRON_SECRET"
\`\`\`

## Known Issues & Bug Tracker
See `docs/operations/bug-tracker.md` for active bugs and workarounds.

## Documentation Structure
- `ARCHITECTURE.md` - Architectural decisions and rationale
- `TESTING.md` - Comprehensive testing guide
- `docs/guides/` - Feature guides
  - `navigation.md` - Artifact page routing
  - `artifact-types.md` - Type system and badges
  - `media-audit.md` - Media cleanup and monitoring
  - `artifact-grid-layout.md` - Masonry grid system and responsive columns
  - `card-design-updates.md` - Card grounding and variable-height titles
  - `google-oauth-*.md` - OAuth setup and branding
- `docs/operations/` - Operational runbooks (bug tracker, cron jobs)
- `docs/planning/` - Future features
- `docs/archive/` - Historical decisions and snapshots

## Critical Files to Understand
- `lib/media.ts` - Media detection and utilities (42 unit tests)
- `lib/actions/artifacts.ts` - Core artifact CRUD operations
- `lib/supabase/server.ts` / `client.ts` - Supabase client setup
- `lib/schemas.ts` - All Zod validation schemas
- `app/api/analyze/*` - AI analysis endpoints
- `__tests__/test-utils.ts` - Testing infrastructure
- `vitest.config.ts` / `playwright.config.ts` - Test configurations

## Testing Philosophy
- **Unit tests**: Test utilities, schemas, server actions in isolation
- **Component tests**: Test UI behavior with React Testing Library (focus on user interactions)
- **Integration tests**: Test API routes and server action + database workflows
- **E2E tests**: Test complete user flows in real browsers (5 browser/device combos)
- **Mocking**: Mock Supabase, Cloudinary, OpenAI in tests (see `__tests__/mocks/`)
- **Fixtures**: Use `fixtures.artifacts.imageArtifact` etc. from `__tests__/fixtures/`

**Run all checks before PR**: `pnpm test:all`

## Package Manager
**Always use pnpm**, not npm or yarn. The project uses pnpm workspaces and lock file.

## Environment Variables Required
\`\`\`env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Cloudinary
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# OpenAI
OPENAI_API_KEY=

# Cron security (optional)
CRON_SECRET=
\`\`\`

---

**Last Updated**: 2025-01-23
