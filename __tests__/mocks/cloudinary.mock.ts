import { vi } from "vitest"

export const mockCloudinarySignature = {
  signature: "test-signature-abc123",
  timestamp: 1704067200,
  apiKey: "test-api-key",
  cloudName: "test-cloud",
  publicId: "users/test-user/artifacts/2024/01/test-image_1704067200",
}

export const mockCloudinaryUpload = {
  public_id: "users/test-user/artifacts/2024/01/test-image_1704067200",
  version: 1704067200,
  signature: "test-signature-abc123",
  width: 800,
  height: 600,
  format: "jpg",
  resource_type: "image",
  created_at: "2024-01-01T12:00:00Z",
  tags: [],
  bytes: 102400,
  type: "upload",
  etag: "test-etag",
  placeholder: false,
  url: "https://res.cloudinary.com/test/image/upload/v1704067200/users/test-user/artifacts/2024/01/test-image_1704067200.jpg",
  secure_url:
    "https://res.cloudinary.com/test/image/upload/v1704067200/users/test-user/artifacts/2024/01/test-image_1704067200.jpg",
  folder: "users/test-user/artifacts/2024/01",
  original_filename: "test-image",
}

export const mockCloudinaryVideoUpload = {
  ...mockCloudinaryUpload,
  format: "mp4",
  resource_type: "video",
  duration: 30.5,
  public_id: "users/test-user/artifacts/2024/01/test-video_1704067200",
  url: "https://res.cloudinary.com/test/video/upload/v1704067200/users/test-user/artifacts/2024/01/test-video_1704067200.mp4",
  secure_url:
    "https://res.cloudinary.com/test/video/upload/v1704067200/users/test-user/artifacts/2024/01/test-video_1704067200.mp4",
}

export const mockCloudinaryAudioUpload = {
  ...mockCloudinaryUpload,
  format: "mp3",
  resource_type: "video",
  duration: 120.5,
  public_id: "users/test-user/artifacts/audio/2024/01/test-audio_1704067200",
  url: "https://res.cloudinary.com/test/video/upload/v1704067200/users/test-user/artifacts/audio/2024/01/test-audio_1704067200.mp3",
  secure_url:
    "https://res.cloudinary.com/test/video/upload/v1704067200/users/test-user/artifacts/audio/2024/01/test-audio_1704067200.mp3",
}

export const mockCloudinaryDeleteSuccess = {
  result: "ok",
}

export const mockCloudinaryDeleteError = {
  error: {
    message: "Resource not found",
  },
}

/**
 * Mock Cloudinary API endpoints
 */
export const mockCloudinaryAPI = {
  generateSignature: vi.fn().mockResolvedValue(mockCloudinarySignature),
  uploadImage: vi.fn().mockResolvedValue(mockCloudinaryUpload),
  uploadVideo: vi.fn().mockResolvedValue(mockCloudinaryVideoUpload),
  uploadAudio: vi.fn().mockResolvedValue(mockCloudinaryAudioUpload),
  deleteMedia: vi.fn().mockResolvedValue(mockCloudinaryDeleteSuccess),
}

/**
 * Setup Cloudinary mock fetch responses
 */
export const setupCloudinaryMocks = () => {
  global.fetch = vi.fn((url: string, options: any) => {
    if (url.includes("/api/cloudinary-signature")) {
      return Promise.resolve(new Response(JSON.stringify(mockCloudinarySignature)))
    }
    if (url.includes("cloudinary.com") && options?.method === "POST") {
      return Promise.resolve(new Response(JSON.stringify(mockCloudinaryUpload)))
    }
    return Promise.reject(new Error("Unknown fetch URL"))
  })

  return mockCloudinaryAPI
}
