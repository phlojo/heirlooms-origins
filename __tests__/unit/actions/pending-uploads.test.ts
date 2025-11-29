import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { fixtures } from "@/__tests__/fixtures"
import * as supabaseModule from "@/lib/supabase/server"

// Mock next/cache
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}))

// Create mock implementations at module level
const mockDeleteCloudinaryMedia = vi.fn().mockResolvedValue({ success: true })
const mockExtractPublicIdFromUrl = vi.fn().mockResolvedValue("test-public-id")
const mockDeleteFromSupabaseStorage = vi.fn().mockResolvedValue({ success: true })
const mockExtractSupabaseStoragePath = vi.fn().mockResolvedValue("user-id/temp/file.jpg")
const mockIsSupabaseStorageUrl = vi.fn().mockReturnValue(false)

// Mock cloudinary
vi.mock("@/lib/actions/cloudinary", () => ({
  deleteCloudinaryMedia: mockDeleteCloudinaryMedia,
  extractPublicIdFromUrl: mockExtractPublicIdFromUrl,
}))

// Mock supabase-storage
vi.mock("@/lib/actions/supabase-storage", () => ({
  deleteFromSupabaseStorage: mockDeleteFromSupabaseStorage,
  extractSupabaseStoragePath: mockExtractSupabaseStoragePath,
}))

// Mock media module
vi.mock("@/lib/media", () => ({
  isSupabaseStorageUrl: mockIsSupabaseStorageUrl,
  isCloudinaryUrl: vi.fn().mockReturnValue(true),
}))

describe("Pending Uploads Server Actions", () => {
  let mockSupabase: any

  beforeEach(() => {
    vi.clearAllMocks()

    // Reset mocks to defaults
    mockDeleteCloudinaryMedia.mockResolvedValue({ success: true })
    mockExtractPublicIdFromUrl.mockResolvedValue("test-public-id")
    mockDeleteFromSupabaseStorage.mockResolvedValue({ success: true })
    mockExtractSupabaseStoragePath.mockResolvedValue("user-id/temp/file.jpg")
    mockIsSupabaseStorageUrl.mockReturnValue(false)

    // Create a chainable mock for Supabase queries
    const createChainableMock = () => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockResolvedValue({ error: null }),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })

    // Setup default mock Supabase client
    mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: fixtures.users.validUser.id,
              email: fixtures.users.validUser.email,
            },
          },
          error: null,
        }),
      },
      from: vi.fn().mockImplementation(() => createChainableMock()),
    }

    vi.spyOn(supabaseModule, "createClient").mockResolvedValue(mockSupabase)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe("trackPendingUpload", () => {
    // Dynamically import to ensure mocks are applied
    const getTrackPendingUpload = async () => {
      const module = await import("@/lib/actions/pending-uploads")
      return module.trackPendingUpload
    }

    describe("authentication", () => {
      it("should return error when user is not authenticated", async () => {
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: null },
          error: null,
        })

        const trackPendingUpload = await getTrackPendingUpload()
        const result = await trackPendingUpload(
          "https://res.cloudinary.com/demo/image/upload/v1234/test.jpg",
          "image"
        )

        expect(result.error).toBe("Unauthorized")
      })
    })

    describe("Cloudinary URLs", () => {
      it("should track a Cloudinary image upload", async () => {
        const insertMock = vi.fn().mockResolvedValue({ error: null })

        mockSupabase.from.mockImplementation(() => ({
          insert: insertMock,
        }))

        const trackPendingUpload = await getTrackPendingUpload()
        const result = await trackPendingUpload(
          "https://res.cloudinary.com/demo/image/upload/v1234/test.jpg",
          "image"
        )

        expect(result.success).toBe(true)
        expect(insertMock).toHaveBeenCalled()
      })

      it("should track a Cloudinary video upload", async () => {
        const insertMock = vi.fn().mockResolvedValue({ error: null })

        mockSupabase.from.mockImplementation(() => ({
          insert: insertMock,
        }))

        const trackPendingUpload = await getTrackPendingUpload()
        const result = await trackPendingUpload(
          "https://res.cloudinary.com/demo/video/upload/v1234/test.mp4",
          "video"
        )

        expect(result.success).toBe(true)
        expect(insertMock).toHaveBeenCalled()
      })

      it("should return error when public ID extraction fails", async () => {
        mockExtractPublicIdFromUrl.mockResolvedValue(null)

        const trackPendingUpload = await getTrackPendingUpload()
        const result = await trackPendingUpload(
          "https://invalid-url.com/file.jpg",
          "image"
        )

        expect(result.error).toBe("Could not extract public ID from URL")
      })
    })

    describe("Supabase Storage URLs", () => {
      it("should track a Supabase Storage upload", async () => {
        mockIsSupabaseStorageUrl.mockReturnValue(true)

        const insertMock = vi.fn().mockResolvedValue({ error: null })
        mockSupabase.from.mockImplementation(() => ({
          insert: insertMock,
        }))

        const trackPendingUpload = await getTrackPendingUpload()
        const result = await trackPendingUpload(
          "https://myproject.supabase.co/storage/v1/object/public/artifacts/user-id/temp/test.jpg",
          "image"
        )

        expect(result.success).toBe(true)
        expect(insertMock).toHaveBeenCalled()
      })

      it("should return error when Supabase path extraction fails", async () => {
        mockIsSupabaseStorageUrl.mockReturnValue(true)
        mockExtractSupabaseStoragePath.mockResolvedValue(null)

        const trackPendingUpload = await getTrackPendingUpload()
        const result = await trackPendingUpload(
          "https://invalid-supabase-url.com/file.jpg",
          "image"
        )

        expect(result.error).toBe("Could not extract path from Supabase URL")
      })
    })

    describe("database errors", () => {
      it("should return error when database insert fails", async () => {
        mockSupabase.from.mockImplementation(() => ({
          insert: vi.fn().mockResolvedValue({
            error: { message: "Database insert failed" },
          }),
        }))

        const trackPendingUpload = await getTrackPendingUpload()
        const result = await trackPendingUpload(
          "https://res.cloudinary.com/demo/image/upload/v1234/test.jpg",
          "image"
        )

        expect(result.error).toBe("Database insert failed")
      })
    })

    describe("expiration", () => {
      it("should set expiration to 24 hours from now", async () => {
        let insertedData: any = null
        const insertMock = vi.fn().mockImplementation((data) => {
          insertedData = data
          return Promise.resolve({ error: null })
        })

        mockSupabase.from.mockImplementation(() => ({
          insert: insertMock,
        }))

        const trackPendingUpload = await getTrackPendingUpload()
        const beforeTime = Date.now()
        await trackPendingUpload(
          "https://res.cloudinary.com/demo/image/upload/v1234/test.jpg",
          "image"
        )
        const afterTime = Date.now()

        expect(insertMock).toHaveBeenCalled()
        expect(insertedData?.expires_at).toBeDefined()
        const expiresAt = new Date(insertedData.expires_at).getTime()
        const expectedMin = beforeTime + 24 * 60 * 60 * 1000
        const expectedMax = afterTime + 24 * 60 * 60 * 1000
        expect(expiresAt).toBeGreaterThanOrEqual(expectedMin - 1000) // 1 second tolerance
        expect(expiresAt).toBeLessThanOrEqual(expectedMax + 1000)
      })
    })
  })

  describe("markUploadsAsSaved", () => {
    const getMarkUploadsAsSaved = async () => {
      const module = await import("@/lib/actions/pending-uploads")
      return module.markUploadsAsSaved
    }

    describe("authentication", () => {
      it("should return error when user is not authenticated", async () => {
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: null },
          error: null,
        })

        const markUploadsAsSaved = await getMarkUploadsAsSaved()
        const result = await markUploadsAsSaved(["https://example.com/test.jpg"])

        expect(result.error).toBe("Unauthorized")
      })
    })

    describe("successful operations", () => {
      it("should remove URLs from pending uploads", async () => {
        const deleteMock = vi.fn().mockReturnThis()
        const inMock = vi.fn().mockReturnThis()
        const eqMock = vi.fn().mockResolvedValue({ error: null })

        mockSupabase.from.mockImplementation(() => ({
          delete: deleteMock,
        }))

        deleteMock.mockReturnValue({ in: inMock })
        inMock.mockReturnValue({ eq: eqMock })

        const urls = [
          "https://res.cloudinary.com/demo/image/upload/v1234/test1.jpg",
          "https://res.cloudinary.com/demo/image/upload/v1234/test2.jpg",
        ]

        const markUploadsAsSaved = await getMarkUploadsAsSaved()
        const result = await markUploadsAsSaved(urls)

        expect(result.success).toBe(true)
        expect(deleteMock).toHaveBeenCalled()
        expect(inMock).toHaveBeenCalledWith("cloudinary_url", urls)
      })

      it("should handle empty URL array", async () => {
        const deleteMock = vi.fn().mockReturnThis()
        const inMock = vi.fn().mockReturnThis()
        const eqMock = vi.fn().mockResolvedValue({ error: null })

        mockSupabase.from.mockImplementation(() => ({
          delete: deleteMock,
        }))

        deleteMock.mockReturnValue({ in: inMock })
        inMock.mockReturnValue({ eq: eqMock })

        const markUploadsAsSaved = await getMarkUploadsAsSaved()
        const result = await markUploadsAsSaved([])

        expect(result.success).toBe(true)
      })
    })

    describe("database errors", () => {
      it("should return error when database delete fails", async () => {
        const deleteMock = vi.fn().mockReturnThis()
        const inMock = vi.fn().mockReturnThis()
        const eqMock = vi.fn().mockResolvedValue({
          error: { message: "Database delete failed" },
        })

        mockSupabase.from.mockImplementation(() => ({
          delete: deleteMock,
        }))

        deleteMock.mockReturnValue({ in: inMock })
        inMock.mockReturnValue({ eq: eqMock })

        const markUploadsAsSaved = await getMarkUploadsAsSaved()
        const result = await markUploadsAsSaved(["https://example.com/test.jpg"])

        expect(result.error).toBe("Database delete failed")
      })
    })
  })

  describe("cleanupPendingUploads", () => {
    const getCleanupPendingUploads = async () => {
      const module = await import("@/lib/actions/pending-uploads")
      return module.cleanupPendingUploads
    }

    describe("authentication", () => {
      it("should return error when user is not authenticated", async () => {
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: null },
          error: null,
        })

        const cleanupPendingUploads = await getCleanupPendingUploads()
        const result = await cleanupPendingUploads()

        expect(result.error).toBe("Unauthorized")
      })
    })

    describe("no uploads to clean", () => {
      it("should return success with 0 deleted when no pending uploads", async () => {
        const selectMock = vi.fn().mockReturnThis()
        const eqMock = vi.fn().mockResolvedValue({ data: [], error: null })

        mockSupabase.from.mockImplementation(() => ({
          select: selectMock,
        }))

        selectMock.mockReturnValue({ eq: eqMock })

        const cleanupPendingUploads = await getCleanupPendingUploads()
        const result = await cleanupPendingUploads()

        expect(result.success).toBe(true)
        expect(result.deletedCount).toBe(0)
      })
    })

    describe("cleanup operations", () => {
      it("should delete Cloudinary files and remove from database", async () => {
        const mockUploads = [
          {
            id: "upload-1",
            cloudinary_url: "https://res.cloudinary.com/demo/image/upload/v1234/test1.jpg",
            cloudinary_public_id: "test1",
            resource_type: "image",
          },
        ]

        // Mock for the initial fetch
        const selectMock = vi.fn().mockReturnThis()
        const eqForSelectMock = vi.fn().mockResolvedValue({ data: mockUploads, error: null })

        // Mock for the delete operation
        const deleteMock = vi.fn().mockReturnThis()
        const inMock = vi.fn().mockResolvedValue({ error: null })

        // Mock for user_media delete
        const userMediaDeleteMock = vi.fn().mockReturnThis()
        const userMediaInMock = vi.fn().mockReturnThis()
        const userMediaEqMock = vi.fn().mockResolvedValue({ error: null })

        let tableCallCount = 0
        mockSupabase.from.mockImplementation((table: string) => {
          tableCallCount++
          if (table === "pending_uploads") {
            if (tableCallCount === 1) {
              // Initial fetch
              return {
                select: selectMock,
              }
            } else {
              // Delete pending uploads
              return {
                delete: deleteMock,
              }
            }
          }
          if (table === "user_media") {
            return { delete: userMediaDeleteMock }
          }
          return { select: vi.fn().mockResolvedValue({ data: [], error: null }) }
        })

        selectMock.mockReturnValue({ eq: eqForSelectMock })
        deleteMock.mockReturnValue({ in: inMock })
        userMediaDeleteMock.mockReturnValue({ in: userMediaInMock })
        userMediaInMock.mockReturnValue({ eq: userMediaEqMock })

        const cleanupPendingUploads = await getCleanupPendingUploads()
        const result = await cleanupPendingUploads()

        expect(result.success).toBe(true)
        expect(result.deletedCount).toBe(1)
      })
    })

    describe("database errors", () => {
      it("should return error when fetch fails", async () => {
        mockSupabase.from.mockImplementation(() => ({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: null,
              error: { message: "Fetch failed" },
            }),
          }),
        }))

        const cleanupPendingUploads = await getCleanupPendingUploads()
        const result = await cleanupPendingUploads()

        expect(result.error).toBe("Fetch failed")
      })
    })

    describe("partial failures", () => {
      it("should track failed deletions and continue with successful ones", async () => {
        mockDeleteCloudinaryMedia
          .mockResolvedValueOnce({ error: "Delete failed" })
          .mockResolvedValueOnce({ success: true })

        const mockUploads = [
          {
            id: "upload-1",
            cloudinary_url: "https://res.cloudinary.com/demo/image/upload/v1234/fail.jpg",
            cloudinary_public_id: "fail",
            resource_type: "image",
          },
          {
            id: "upload-2",
            cloudinary_url: "https://res.cloudinary.com/demo/image/upload/v1234/success.jpg",
            cloudinary_public_id: "success",
            resource_type: "image",
          },
        ]

        // Mock for the initial fetch
        const selectMock = vi.fn().mockReturnThis()
        const eqForSelectMock = vi.fn().mockResolvedValue({ data: mockUploads, error: null })

        // Mock for delete operations
        const deleteMock = vi.fn().mockReturnThis()
        const inMock = vi.fn().mockResolvedValue({ error: null })

        // Mock for user_media
        const userMediaDeleteMock = vi.fn().mockReturnThis()
        const userMediaInMock = vi.fn().mockReturnThis()
        const userMediaEqMock = vi.fn().mockResolvedValue({ error: null })

        let tableCallCount = 0
        mockSupabase.from.mockImplementation((table: string) => {
          tableCallCount++
          if (table === "pending_uploads") {
            if (tableCallCount === 1) {
              return { select: selectMock }
            } else {
              return { delete: deleteMock }
            }
          }
          if (table === "user_media") {
            return { delete: userMediaDeleteMock }
          }
          return { select: vi.fn().mockResolvedValue({ data: [], error: null }) }
        })

        selectMock.mockReturnValue({ eq: eqForSelectMock })
        deleteMock.mockReturnValue({ in: inMock })
        userMediaDeleteMock.mockReturnValue({ in: userMediaInMock })
        userMediaInMock.mockReturnValue({ eq: userMediaEqMock })

        const cleanupPendingUploads = await getCleanupPendingUploads()
        const result = await cleanupPendingUploads()

        expect(result.success).toBe(true)
        expect(result.deletedCount).toBe(1)
        expect(result.failedCount).toBe(1)
      })
    })
  })

  describe("cleanupExpiredUploads (DEPRECATED)", () => {
    const getCleanupExpiredUploads = async () => {
      const module = await import("@/lib/actions/pending-uploads")
      return module.cleanupExpiredUploads
    }

    it("should return deprecation warning and not delete any files", async () => {
      const mockUploads = [
        {
          id: "upload-1",
          cloudinary_url: "https://res.cloudinary.com/demo/image/upload/v1234/old.jpg",
          cloudinary_public_id: "old",
          expires_at: new Date(Date.now() - 1000).toISOString(),
        },
      ]

      mockSupabase.from.mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          lt: vi.fn().mockResolvedValue({ data: mockUploads, error: null }),
        }),
      }))

      const cleanupExpiredUploads = await getCleanupExpiredUploads()
      const result = await cleanupExpiredUploads()

      expect(result.success).toBe(true)
      expect(result.deletedCount).toBe(0)
      expect(result.message).toContain("DEPRECATED")
    })

    it("should handle database fetch errors", async () => {
      mockSupabase.from.mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          lt: vi.fn().mockResolvedValue({
            data: null,
            error: { message: "Fetch error" },
          }),
        }),
      }))

      const cleanupExpiredUploads = await getCleanupExpiredUploads()
      const result = await cleanupExpiredUploads()

      expect(result.error).toBe("Fetch error")
    })
  })

  describe("auditPendingUploads", () => {
    const getAuditPendingUploads = async () => {
      const module = await import("@/lib/actions/pending-uploads")
      return module.auditPendingUploads
    }

    it("should return audit report with summary", async () => {
      const mockUploads = [
        {
          id: "upload-1",
          cloudinary_url: "https://res.cloudinary.com/demo/image/upload/v1234/expired.jpg",
          cloudinary_public_id: "expired",
          user_id: fixtures.users.validUser.id,
          created_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
          expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Expired
          resource_type: "image",
        },
      ]

      const mockArtifacts = [
        {
          id: "artifact-1",
          slug: "my-artifact",
          media_urls: ["https://res.cloudinary.com/demo/image/upload/v1234/saved.jpg"],
        },
      ]

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "pending_uploads") {
          return {
            select: vi.fn().mockResolvedValue({ data: mockUploads, error: null }),
          }
        }
        if (table === "artifacts") {
          return {
            select: vi.fn().mockResolvedValue({ data: mockArtifacts, error: null }),
          }
        }
        return { select: vi.fn().mockResolvedValue({ data: [], error: null }) }
      })

      const auditPendingUploads = await getAuditPendingUploads()
      const result = await auditPendingUploads()

      expect(result.timestamp).toBeDefined()
      expect(result.summary).toBeDefined()
      expect(result.summary.totalPendingUploads).toBe(1)
      expect(result.details).toBeDefined()
      expect(result.details.safeToDelete).toBeDefined()
      expect(result.details.dangerous).toBeDefined()
      expect(result.details.alreadyDeleted).toBeDefined()
    })

    it("should identify dangerous uploads (in pending but used in artifacts)", async () => {
      const sharedUrl = "https://res.cloudinary.com/demo/image/upload/v1234/shared.jpg"

      const mockUploads = [
        {
          id: "upload-1",
          cloudinary_url: sharedUrl,
          cloudinary_public_id: "shared",
          user_id: fixtures.users.validUser.id,
          created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          resource_type: "image",
        },
      ]

      const mockArtifacts = [
        {
          id: "artifact-1",
          slug: "uses-shared-media",
          media_urls: [sharedUrl], // Same URL is in an artifact
        },
      ]

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "pending_uploads") {
          return {
            select: vi.fn().mockResolvedValue({ data: mockUploads, error: null }),
          }
        }
        if (table === "artifacts") {
          return {
            select: vi.fn().mockResolvedValue({ data: mockArtifacts, error: null }),
          }
        }
        return { select: vi.fn().mockResolvedValue({ data: [], error: null }) }
      })

      const auditPendingUploads = await getAuditPendingUploads()
      const result = await auditPendingUploads()

      expect(result.summary.dangerous).toBe(1)
      expect(result.details.dangerous.length).toBe(1)
      expect(result.details.dangerous[0].foundInArtifacts).toContain("uses-shared-media")
    })

    it("should throw error when pending uploads fetch fails", async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "pending_uploads") {
          return {
            select: vi.fn().mockResolvedValue({
              data: null,
              error: { message: "Pending uploads fetch failed" },
            }),
          }
        }
        return { select: vi.fn().mockResolvedValue({ data: [], error: null }) }
      })

      const auditPendingUploads = await getAuditPendingUploads()
      await expect(auditPendingUploads()).rejects.toThrow("Pending uploads fetch failed")
    })

    it("should throw error when artifacts fetch fails", async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "pending_uploads") {
          return {
            select: vi.fn().mockResolvedValue({ data: [], error: null }),
          }
        }
        if (table === "artifacts") {
          return {
            select: vi.fn().mockResolvedValue({
              data: null,
              error: { message: "Artifacts fetch failed" },
            }),
          }
        }
        return { select: vi.fn().mockResolvedValue({ data: [], error: null }) }
      })

      const auditPendingUploads = await getAuditPendingUploads()
      await expect(auditPendingUploads()).rejects.toThrow("Artifacts fetch failed")
    })
  })
})
