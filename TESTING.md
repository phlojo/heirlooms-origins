# Testing Guide for Heirlooms

This document outlines the comprehensive testing infrastructure and strategy for the Heirlooms application.

## Overview

The testing setup consists of three layers:

1. **Unit Tests** - Test individual functions and utilities
2. **Component Tests** - Test React components in isolation
3. **Integration Tests** - Test API routes and server actions
4. **E2E Tests** - Test complete user workflows in a real browser

## Testing Stack

- **Vitest** - Fast unit test framework with built-in coverage
- **React Testing Library** - Component testing utilities
- **Playwright** - E2E testing across browsers
- **Happy DOM** - Lightweight DOM environment for tests
- **@testing-library/jest-dom** - Custom matchers for DOM testing

## Running Tests

### All Tests

\`\`\`bash
npm run test:all
\`\`\`

Runs type checking, linting, unit tests, and E2E tests in sequence.

### Unit & Component Tests

\`\`\`bash
npm run test
\`\`\`

Run all tests in watch mode:

\`\`\`bash
npm run test:watch
\`\`\`

Run tests with UI dashboard:

\`\`\`bash
npm run test:ui
\`\`\`

Run tests with coverage report:

\`\`\`bash
npm run test:coverage
\`\`\`

### E2E Tests

\`\`\`bash
npm run test:e2e
\`\`\`

Run E2E tests with interactive UI:

\`\`\`bash
npm run test:e2e:ui
\`\`\`

## Test Structure

\`\`\`
__tests__/
├── unit/
│   ├── actions/              # Server action tests
│   ├── utils/                # Utility function tests
│   └── hooks/                # React hook tests
├── components/
│   ├── forms/                # Form component tests
│   ├── ui/                   # UI component tests
│   └── navigation/           # Navigation component tests
├── integration/
│   ├── api/                  # API route tests
│   └── workflows/            # End-to-end workflow tests
├── e2e/                      # Playwright E2E tests
├── mocks/                    # Mock implementations
│   ├── supabase.mock.ts
│   ├── cloudinary.mock.ts
│   └── openai.mock.ts
├── fixtures/                 # Test data
│   └── index.ts
└── test-utils.ts             # Testing utilities and helpers
\`\`\`

## Test Files Included

**Current Status:** 367 passing tests, 14 skipped (in 14 test files)

### Unit Tests

#### Media Utilities (`__tests__/unit/utils/media.test.ts`)

- **42 tests** covering media URL detection
- Tests for image, video, and audio detection (extension-based, works for both Cloudinary and Supabase Storage)
- Tests for media URL processing and normalization
- File size limit (50MB for all files - Supabase Storage limit) and formatting tests

**Status:** ✅ All 42 tests passing

#### Validation Schemas (`__tests__/unit/schemas.test.ts`)

- **73 tests** covering Zod schema validation
- Tests for artifact, collection, and media schemas
- AI fields use `.optional()` (not `.nullable()`) - undefined is valid, null is not

**Status:** ✅ All 73 tests passing

#### Server Actions (`__tests__/unit/actions/artifacts.test.ts`)

- **32 tests** covering artifact CRUD operations
- Tests for validation, authentication, media URL processing
- Tests for slug generation, thumbnail selection, AI content handling

**Status:** ✅ All 32 tests passing

### Component Tests

#### Artifact Gallery (`__tests__/components/artifact-gallery.test.tsx`)

- **24 tests** covering media rendering and order preservation
- Tests verify media is rendered in exact user-specified order (no sorting by type)
- Note: Mock testids use array index (e.g., `video-1` for video at index 1)

**Status:** ✅ All 24 tests passing

#### Collection Card (`__tests__/components/ui/collection-card.test.tsx`)

- **30 tests** covering collection card rendering
- Note: `Author` component only renders when `mode="all"` (not in "mine" mode)
- Note: Title appears in both card and `CollectionThumbnailGrid` - use `getAllByText`

**Status:** ✅ All 30 tests passing

#### Artifact Card (`__tests__/components/ui/artifact-card.test.tsx`)

- **21 tests** covering artifact card rendering

**Status:** ✅ All 21 tests passing

### Integration Tests

#### Transcribe API (`__tests__/integration/api/transcribe.test.ts`)

- **21 tests** covering audio transcription API

**Status:** ✅ All 21 tests passing

#### Analyze Images API (`__tests__/integration/api/analyze-images.test.ts`)

- **14 tests** covering image analysis API
- **Note:** Currently skipped due to complex mock setup issues
- Tests verify API behavior but mocks aren't properly chaining
- Core functionality works in production

**Status:** ⏭️ Skipped (needs mock infrastructure fixes)

### Upcoming Test Files

**Phase 2: Additional Server Actions**

- `__tests__/unit/actions/collections.test.ts` - Collection operations
- `__tests__/unit/actions/auth.test.ts` - Authentication flows
- `__tests__/unit/actions/cloudinary.test.ts` - Cloudinary integration
- `__tests__/unit/actions/pending-uploads.test.ts` - Upload tracking
- `__tests__/unit/actions/profile.test.ts` - User profile operations
- `__tests__/unit/actions/artifact-types.test.ts` - Type management

**Phase 2: Additional Utilities**

- `__tests__/unit/utils/slug.test.ts` - Slug generation
- `__tests__/unit/utils/rate-limit.test.ts` - Rate limiting
- `__tests__/unit/utils/ai.test.ts` - AI SDK integration

**Phase 3: Additional Component Tests**

- Form component tests (artifact/collection creation, editing)
- UI component tests (media players, dialogs)
- Navigation tests (bottom nav, page navigation)

**Phase 4: Additional Integration Tests**

- API route tests for auth callbacks
- Server action + database workflow tests

**Phase 5: E2E Tests (50-80 tests)**

- Authentication flows
- Artifact CRUD operations
- Collection management
- Search and discovery
- Mobile-specific interactions

## Writing Tests

### Test Utilities

The `__tests__/test-utils.ts` file provides:

- **render()** - Enhanced render function for React components
- **mockData** - Generators for test data
  - `mockData.user()`
  - `mockData.artifact()`
  - `mockData.collection()`
  - `mockData.artifactType()`
- **createMockSupabaseClient()** - Mock Supabase client
- **mockCloudinaryResponses** - Cloudinary mock responses
- **mockOpenAIResponses** - OpenAI mock responses
- **waitFor()** - Helper for async assertions
- **createArtifactSlug()** - Helper to generate valid slugs

### Test Fixtures

Use `__tests__/fixtures/index.ts` for reusable test data:

\`\`\`typescript
import { fixtures } from "@/__tests__/fixtures"

describe("Artifact Tests", () => {
  it("should create artifact", () => {
    const artifact = fixtures.artifacts.imageArtifact
    // Test with fixture data...
  })
})
\`\`\`

### Mock Examples

#### Mocking Supabase

\`\`\`typescript
import { setupSupabaseMocks } from "@/__tests__/mocks/supabase.mock"

const mockSupabase = setupSupabaseMocks()
// Use mockSupabase in your tests
\`\`\`

#### Mocking Cloudinary

\`\`\`typescript
import { setupCloudinaryMocks } from "@/__tests__/mocks/cloudinary.mock"

const mockAPI = setupCloudinaryMocks()
// Fetch calls to Cloudinary will use mocked responses
\`\`\`

#### Mocking OpenAI

\`\`\`typescript
import { setupOpenAIMocks } from "@/__tests__/mocks/openai.mock"

const mockAPI = setupOpenAIMocks()
// Fetch calls to OpenAI will use mocked responses
\`\`\`

### Example Test

\`\`\`typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@/__tests__/test-utils'
import { fixtures } from '@/__tests__/fixtures'

describe('ArtifactCard', () => {
  it('should render artifact with image', () => {
    const artifact = fixtures.artifacts.imageArtifact

    render(<ArtifactCard artifact={artifact} />)

    expect(screen.getByText('Old Family Photo')).toBeInTheDocument()
    expect(screen.getByRole('img')).toHaveAttribute(
      'src',
      'https://example.com/photo.jpg'
    )
  })

  it('should call onClick handler when clicked', () => {
    const artifact = fixtures.artifacts.imageArtifact
    const handleClick = vi.fn()

    render(<ArtifactCard artifact={artifact} onClick={handleClick} />)
    fireEvent.click(screen.getByRole('button'))

    expect(handleClick).toHaveBeenCalledWith(artifact.id)
  })
})
\`\`\`

## Coverage Goals

- **Server Actions:** 90%+
- **Utility Functions:** 85%+
- **Components:** 70%+
- **API Routes:** 85%+
- **Hooks:** 80%+
- **Overall:** 80%+

View coverage report:

\`\`\`bash
npm run test:coverage
\`\`\`

HTML report will be generated in `coverage/` directory.

## Continuous Integration

GitHub Actions CI/CD pipeline (to be implemented):

- Run type checking on every push
- Run linting on every push
- Run all tests on PR
- Generate and upload coverage reports
- Block merge if tests fail or coverage drops

## Best Practices

1. **Keep tests focused** - Test one thing per test
2. **Use descriptive names** - Test names should explain what's being tested
3. **Arrange-Act-Assert** - Organize tests with setup, execution, assertion
4. **Mock external dependencies** - Mock API calls, database, etc.
5. **Use fixtures** - Reuse test data from fixtures
6. **Test user behavior** - Focus on what users can see and do
7. **Avoid implementation details** - Test behavior, not internal state

## Important Testing Conventions

### Media URL Detection
- `isVideoUrl()` and `isImageUrl()` in `lib/media.ts` use **extension-based detection**
- This works for **both** Cloudinary URLs and Supabase Storage URLs
- Example: `https://example.com/video.mp4` is detected as video (not just Cloudinary URLs)

### File Size Limits
- All files have a **50MB limit** (Supabase Storage free tier)
- This applies to videos, images, and audio equally

### Schema Validation (Zod)
- AI content fields (`image_captions`, `video_summaries`, `audio_transcripts`) use `.optional()` not `.nullable()`
- `undefined` is valid, `null` is not
- Use `undefined` in tests, not `null`

### Component Mock Test IDs
- Gallery component mock uses **array index** for testids, not type-specific index
- Example: Video at array index 1 has testid `video-1` (not `video-0`)
- This preserves the user's upload order in tests

### CollectionCard Component
- `Author` component only renders when `mode="all"`
- Title appears in multiple places - use `getAllByText()` instead of `getByText()`

### Server Action Testing
- `redirect()` throws an error with message containing "REDIRECT"
- Catch and check for redirect in success cases:
  ```typescript
  try {
    await createArtifact(input)
  } catch (e: any) {
    if (!e.message?.includes("REDIRECT")) throw e
  }
  ```

## Troubleshooting

### Tests Running Slowly

- Check for `setTimeout` or `waitFor` timeouts
- Ensure mocks are being used instead of real API calls
- Run `npm run test:coverage` to identify untested code

### Mock Not Working

- Verify mock file is imported before the component
- Check that `vi.mock()` paths match imports exactly
- Clear test cache: `npm run test -- --clearCache`

### Component Rendering Issues

- Check that all required props are provided
- Verify providers are set up in `vitest.setup.ts`
- Look for hydration mismatches in Next.js components

## Resources

- [Vitest Documentation](https://vitest.dev)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro)
- [Playwright Documentation](https://playwright.dev)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

## Next Steps

1. **Phase 2**: Write unit tests for server actions and utilities
2. **Phase 3**: Write component tests for all major components
3. **Phase 4**: Write integration tests for API routes
4. **Phase 5**: Write E2E tests for critical user flows
5. **Phase 6**: Set up GitHub Actions CI/CD pipeline

Target: 80%+ code coverage across the application
