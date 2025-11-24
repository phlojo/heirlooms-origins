# Architecture Decisions

This document records key architectural decisions for the Heirlooms project. Each decision includes context, options considered, and rationale.

---

## Table of Contents

1. [URL Routing & Shareable Links](#url-routing--shareable-links)
2. [Media System Architecture](#media-system-architecture)
3. [Authentication Strategy](#authentication-strategy)
4. [Testing Approach](#testing-approach)

---

## URL Routing & Shareable Links

**Date:** 2025-01-23
**Status:** Approved
**Context:** Artifacts and collections need shareable URLs that remain stable even when titles (and slugs) change.

### The Problem

Current slug-based URLs face a stability challenge:
- Artifact URL: `/artifacts/my-grandmothers-watch`
- User updates title: "My Grandmother's Watch" → "Grandmother's Vintage Timepiece"
- Slug changes: `my-grandmothers-watch` → `grandmothers-vintage-timepiece`
- **Old shared links break** 💔

This is particularly problematic for a family heirloom app where links may be shared across years.

### Decision: Hybrid ID + Slug Pattern

**Chosen approach:** Use UUID + slug in URLs (like Stack Overflow, Medium, Reddit)

\`\`\`
/artifacts/{uuid}/{slug}
/collections/{uuid}/{slug}
\`\`\`

**Example:**
\`\`\`
/artifacts/a1234567-89ab-cdef-0123-456789abcdef/grandmothers-watch
\`\`\`

### Options Considered

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| **Immutable slugs** | Simple, links never break | Slug diverges from title (confusing, bad SEO) | ❌ Rejected |
| **UUID-only** | Truly immutable | Ugly, not shareable, no SEO benefit | ❌ Rejected |
| **Hybrid: ID + Slug** ✅ | Links never break, SEO-friendly, human-readable | Longer URLs | ✅ **Chosen** |
| **Slug history + redirects** | Best UX, clean URLs | Most complex, requires redirect table | ❌ Too complex |
| **Namespaced slugs** | User-scoped | Longer URLs, still has slug-change problem | ❌ Doesn't solve core issue |

### Implementation Details

**Routing:**
- Route pattern: `/artifacts/[id]/[slug]` (slug is optional)
- ID is authoritative - lookup by UUID
- If slug is missing or wrong: 301 redirect to canonical URL with current slug
- Slug can be omitted entirely: `/artifacts/{uuid}` works

**Benefits:**
- **Link stability:** Old links never break (ID is permanent)
- **SEO:** Current slug always matches title
- **Shareability:** Human-readable URLs build trust
- **Future-proof:** Supports public discovery + private sharing

**URL shortening (optional future enhancement):**
- Consider shortening UUID to 8-12 characters using base62 encoding
- Example: `/artifacts/aB3xK9qR/grandmothers-watch` (shorter, still unique)

### Rollout Plan

**Phase 1: Implementation**
1. Update artifact/collection routes to accept `[id]/[slug?]` pattern
2. Modify server actions to generate canonical URLs
3. Add redirect logic for slug mismatches
4. Update all internal links to new format

**Phase 2: Migration**
1. Keep old `/artifacts/{slug}` routes as fallback (301 redirect to new format)
2. Database lookup: try UUID first, then slug (legacy support)
3. Gradual migration: update links in emails, shares, etc.
4. Deprecation notice after 6 months

**Phase 3: Cleanup**
1. Remove legacy slug-only route support
2. All URLs use ID + slug pattern

### Related Decisions

- Media URLs use Cloudinary public IDs (permanent)
- Collections follow same ID + slug pattern
- User profiles may use `@username` or `/u/{username}` (TBD)

---

## Media System Architecture

**Date:** 2025-01 (Multiple iterations)
**Status:** Implemented
**See:** `MEDIA_SYSTEM_AUDIT.md` for detailed audit

### Key Principles

1. **Media order is sacred** - Preserve user's insertion order
2. **URL is the stable identifier** - Never use array indices
3. **AI metadata is per-URL** - Use JSONB maps `{ url: caption }`
4. **Cleanup is defensive** - Prevent storage bloat
5. **Validation is user-friendly** - Show actual limits (500MB video, 50MB other)

### Implementation

- **Storage:** Cloudinary (images, videos, audio)
- **Order preservation:** `normalizeMediaUrls()` maintains insertion order
- **AI analysis:** OpenAI (GPT-4o vision, Whisper transcription)
- **Pending uploads:** 24hr expiration with audit system
- **Thumbnail selection:** `getPrimaryVisualMediaUrl()` (images > videos)

### Related Files

- `lib/media.ts` - Media detection and utilities
- `lib/cloudinary.ts` - Cloudinary integration
- `MEDIA_SYSTEM_AUDIT.md` - Comprehensive audit and best practices
- `MEDIA_AUDIT_SETUP.md` - Operational guide for cleanup

---

## Authentication Strategy

**Date:** 2025-01
**Status:** Implemented
**Provider:** Supabase Auth

### Current Implementation

- **Email/password** authentication
- **Google OAuth** (configured, branding pending verification)
- **Row-level security (RLS)** on all tables
- **Admin role** support for artifact type management

### Future Considerations

- Additional OAuth providers (GitHub, Apple)
- Magic link authentication
- Custom domain for Supabase auth (increased trust)

### Related Files

- `lib/supabase/` - Client and context
- `docs/guides/google-oauth-setup.md` - OAuth setup guide

---

## Testing Approach

**Date:** 2025-01
**Status:** Phases 1-3 Complete (169 tests, 66% pass rate)
**See:** `TESTING.md` for comprehensive guide

### Testing Layers

1. **Unit Tests** (Vitest) - Utilities, schemas, server actions
2. **Component Tests** (React Testing Library) - UI components
3. **Integration Tests** (Planned - Phase 4) - API routes, workflows
4. **E2E Tests** (Playwright - Phase 5) - Complete user flows
5. **CI/CD** (Phase 6) - GitHub Actions automation

### Coverage Goals

- Server Actions: 90%+
- Utilities: 85%+
- Components: 70%+
- Overall: 80%+

### Test Infrastructure

- **Vitest** for unit/component tests (fast, built-in coverage)
- **Playwright** for E2E (5 browser/device combinations)
- **Mocks** for Supabase, Cloudinary, OpenAI
- **Fixtures** with 20+ test objects (proper UUID format)

### Related Files

- `TESTING.md` - Comprehensive testing guide
- `__tests__/` - All test files and infrastructure
- `vitest.config.ts`, `playwright.config.ts` - Configuration

---

## Future Architectural Decisions

Topics to document as they're decided:

- User profile URL structure (`@username` vs `/u/{username}`)
- Gallery feature implementation (when ready)
- Gesture navigation strategy (vertical vs horizontal swipe)
- Collection privacy model enhancements
- Real-time collaboration features
- Mobile app architecture (if applicable)
- Data export/import format
- API versioning strategy (if public API is built)

---

## Contributing to This Document

When making significant architectural decisions:

1. Add a new section with clear heading
2. Include: Date, Status, Context, Problem, Decision, Options Considered
3. Document the "why" not just the "what"
4. Link to related files or documentation
5. Update the Table of Contents
6. Consider future implications and migration paths

---

**Last Updated:** 2025-01-23
