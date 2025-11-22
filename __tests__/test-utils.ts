import React, { ReactElement } from "react"
import { render as rtlRender, RenderOptions } from "@testing-library/react"
import { vi } from "vitest"

/**
 * Custom render function that wraps components with necessary providers
 */
function render(ui: ReactElement, options?: Omit<RenderOptions, "wrapper">) {
  return rtlRender(ui, { ...options })
}

export * from "@testing-library/react"
export { render }

/**
 * Mock data generators for common test scenarios
 */
export const mockData = {
  user: () => ({
    id: "test-user-id",
    email: "test@example.com",
    displayName: "Test User",
    theme: "light",
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  }),

  artifact: () => ({
    id: "test-artifact-id",
    title: "Test Artifact",
    description: "A test artifact",
    collectionId: "test-collection-id",
    userId: "test-user-id",
    mediaUrls: ["https://example.com/image.jpg"],
    thumbnailUrl: "https://example.com/image.jpg",
    slug: "test-artifact-test-1234",
    yearAcquired: 2020,
    origin: "Test Origin",
    typeId: null,
    imageCaptions: {},
    videoSummaries: {},
    audioTranscripts: {},
    audioSummaries: {},
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  }),

  collection: () => ({
    id: "test-collection-id",
    title: "Test Collection",
    description: "A test collection",
    userId: "test-user-id",
    coverImage: null,
    isPublic: false,
    slug: "test-collection-test-1234",
    primaryTypeId: null,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  }),

  artifactType: () => ({
    id: "test-type-id",
    name: "Test Type",
    slug: "test-type",
    description: "A test artifact type",
    iconName: "Package",
    displayOrder: 0,
    isActive: true,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  }),
}

/**
 * Create a mock Supabase client for testing
 */
export const createMockSupabaseClient = (overrides = {}) => ({
  auth: {
    getUser: vi.fn().mockResolvedValue({
      data: { user: mockData.user() },
      error: null,
    }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
  },
  from: vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
    }),
    insert: vi.fn().mockResolvedValue({
      data: null,
      error: null,
    }),
    update: vi.fn().mockResolvedValue({
      data: null,
      error: null,
    }),
    delete: vi.fn().mockResolvedValue({
      data: null,
      error: null,
    }),
  }),
  storage: {
    from: vi.fn().mockReturnValue({
      upload: vi.fn().mockResolvedValue({
        data: { path: "test-path" },
        error: null,
      }),
      remove: vi.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
    }),
  },
  ...overrides,
})

/**
 * Mock CloudinaryAPI responses
 */
export const mockCloudinaryResponses = {
  signatureSuccess: {
    signature: "test-signature",
    timestamp: Date.now(),
    apiKey: "test-api-key",
  },
  uploadSuccess: {
    public_id: "test-public-id",
    version: 1234567890,
    signature: "test-signature",
    width: 800,
    height: 600,
    format: "jpg",
    resource_type: "image",
    created_at: "2024-01-01T00:00:00Z",
    tags: [],
    bytes: 102400,
    type: "upload",
    etag: "test-etag",
    placeholder: false,
    url: "https://res.cloudinary.com/test/image/upload/test-public-id.jpg",
    secure_url: "https://res.cloudinary.com/test/image/upload/test-public-id.jpg",
    folder: "test-folder",
    original_filename: "test-image",
  },
}

/**
 * Mock OpenAI API responses
 */
export const mockOpenAIResponses = {
  imageAnalysis: {
    choices: [
      {
        message: {
          content: "This is a test image containing various objects and elements.",
        },
      },
    ],
  },
  transcription: {
    text: "This is a test transcription of the audio content.",
  },
  textCompletion: {
    choices: [
      {
        message: {
          content: "This is a test completion response.",
        },
      },
    ],
  },
}

/**
 * Helper to wait for async operations
 */
export const waitFor = (condition: () => boolean, timeout = 1000) => {
  return new Promise((resolve, reject) => {
    const startTime = Date.now()
    const checkCondition = () => {
      if (condition()) {
        resolve(true)
      } else if (Date.now() - startTime > timeout) {
        reject(new Error("Timeout waiting for condition"))
      } else {
        setTimeout(checkCondition, 50)
      }
    }
    checkCondition()
  })
}

/**
 * Helper to create valid artifact slug
 */
export const createArtifactSlug = (title: string, timestamp?: number) => {
  const sanitized = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
  const time = timestamp || Date.now()
  return `${sanitized}-${time}`
}
