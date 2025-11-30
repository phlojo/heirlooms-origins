import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { fixtures } from "@/__tests__/fixtures"
import {
  createUserMedia,
  updateUserMedia,
  getUserMediaLibrary,
  deleteUserMedia,
  createArtifactMediaLink,
  updateArtifactMediaLink,
  removeArtifactMediaLink,
  getArtifactMediaByRole,
  getArtifactGalleryMedia,
  reorderArtifactMedia,
  getMediaUsage,
  createUserMediaFromUrl,
  createArtifactMediaLinks,
} from "@/lib/actions/media"
import * as supabaseModule from "@/lib/supabase/server"

// Mock next/cache
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}))

// Mock cloudinary functions
vi.mock("@/lib/cloudinary", () => ({
  getSmallThumbnailUrl: vi.fn((url: string) => `${url}?small`),
  getThumbnailUrl: vi.fn((url: string) => `${url}?thumb`),
  getMediumUrl: vi.fn((url: string) => `${url}?medium`),
  getLargeUrl: vi.fn((url: string) => `${url}?large`),
}))

describe("Media Server Actions", () => {
  let mockSupabase: any

  // Helper to create chainable mock for Supabase queries
  const createChainableMock = (overrides: any = {}) => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    contains: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    ...overrides,
  })

  beforeEach(() => {
    vi.clearAllMocks()

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

  // ============================================================================
  // User Media CRUD Operations
  // ============================================================================

  describe("createUserMedia", () => {
    describe("validation", () => {
      it("should reject invalid user_id", async () => {
        const input = {
          user_id: "not-a-uuid",
          storage_path: "path/to/file.jpg",
          public_url: "https://example.com/file.jpg",
          filename: "file.jpg",
          mime_type: "image/jpeg",
          file_size_bytes: 1024,
          media_type: "image" as const,
          upload_source: "gallery" as const,
        }

        const result = await createUserMedia(input)

        expect(result.error).toBe("Invalid input")
      })

      it("should reject invalid public_url", async () => {
        const input = {
          user_id: fixtures.users.validUser.id,
          storage_path: "path/to/file.jpg",
          public_url: "not-a-url",
          filename: "file.jpg",
          mime_type: "image/jpeg",
          file_size_bytes: 1024,
          media_type: "image" as const,
          upload_source: "gallery" as const,
        }

        const result = await createUserMedia(input)

        expect(result.error).toBe("Invalid input")
      })

      it("should reject empty filename", async () => {
        const input = {
          user_id: fixtures.users.validUser.id,
          storage_path: "path/to/file.jpg",
          public_url: "https://example.com/file.jpg",
          filename: "",
          mime_type: "image/jpeg",
          file_size_bytes: 1024,
          media_type: "image" as const,
          upload_source: "gallery" as const,
        }

        const result = await createUserMedia(input)

        expect(result.error).toBe("Invalid input")
      })

      it("should reject negative file_size_bytes", async () => {
        const input = {
          user_id: fixtures.users.validUser.id,
          storage_path: "path/to/file.jpg",
          public_url: "https://example.com/file.jpg",
          filename: "file.jpg",
          mime_type: "image/jpeg",
          file_size_bytes: -100,
          media_type: "image" as const,
          upload_source: "gallery" as const,
        }

        const result = await createUserMedia(input)

        expect(result.error).toBe("Invalid input")
      })

      it("should reject invalid media_type", async () => {
        const input = {
          user_id: fixtures.users.validUser.id,
          storage_path: "path/to/file.jpg",
          public_url: "https://example.com/file.jpg",
          filename: "file.jpg",
          mime_type: "image/jpeg",
          file_size_bytes: 1024,
          media_type: "document" as any,
          upload_source: "gallery" as const,
        }

        const result = await createUserMedia(input)

        expect(result.error).toBe("Invalid input")
      })
    })

    describe("authentication", () => {
      it("should return error when user is not authenticated", async () => {
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: null },
          error: null,
        })

        const input = {
          user_id: fixtures.users.validUser.id,
          storage_path: "path/to/file.jpg",
          public_url: "https://example.com/file.jpg",
          filename: "file.jpg",
          mime_type: "image/jpeg",
          file_size_bytes: 1024,
          media_type: "image" as const,
          upload_source: "gallery" as const,
        }

        const result = await createUserMedia(input)

        expect(result.error).toBe("Unauthorized")
      })

      it("should reject creation for another user", async () => {
        const input = {
          user_id: fixtures.users.anotherUser.id, // Different from authenticated user
          storage_path: "path/to/file.jpg",
          public_url: "https://example.com/file.jpg",
          filename: "file.jpg",
          mime_type: "image/jpeg",
          file_size_bytes: 1024,
          media_type: "image" as const,
          upload_source: "gallery" as const,
        }

        const result = await createUserMedia(input)

        expect(result.error).toBe("Unauthorized - cannot create media for another user")
      })
    })

    describe("success cases", () => {
      it("should create user media with valid input", async () => {
        const input = {
          user_id: fixtures.users.validUser.id,
          storage_path: fixtures.userMedia.imageMedia.storage_path,
          public_url: fixtures.userMedia.imageMedia.public_url,
          filename: fixtures.userMedia.imageMedia.filename,
          mime_type: fixtures.userMedia.imageMedia.mime_type,
          file_size_bytes: fixtures.userMedia.imageMedia.file_size_bytes,
          media_type: fixtures.userMedia.imageMedia.media_type,
          upload_source: fixtures.userMedia.imageMedia.upload_source,
          width: fixtures.userMedia.imageMedia.width,
          height: fixtures.userMedia.imageMedia.height,
        }

        mockSupabase.from.mockImplementation(() => ({
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: fixtures.userMedia.imageMedia,
                error: null,
              }),
            }),
          }),
        }))

        const result = await createUserMedia(input)

        expect(result.error).toBeUndefined()
        expect(result.data).toEqual(fixtures.userMedia.imageMedia)
      })

      it("should handle database errors gracefully", async () => {
        const input = {
          user_id: fixtures.users.validUser.id,
          storage_path: "path/to/file.jpg",
          public_url: "https://example.com/file.jpg",
          filename: "file.jpg",
          mime_type: "image/jpeg",
          file_size_bytes: 1024,
          media_type: "image" as const,
          upload_source: "gallery" as const,
        }

        mockSupabase.from.mockImplementation(() => ({
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { message: "Database constraint violation" },
              }),
            }),
          }),
        }))

        const result = await createUserMedia(input)

        expect(result.error).toBe("Failed to create media record")
      })
    })
  })

  describe("updateUserMedia", () => {
    describe("validation", () => {
      it("should reject invalid media id", async () => {
        const input = {
          id: "not-a-uuid",
          is_processed: true,
        }

        const result = await updateUserMedia(input)

        expect(result.error).toBe("Invalid input")
      })
    })

    describe("authentication", () => {
      // Note: Validation happens before auth check, so if input is valid,
      // the auth check comes second. Testing this requires valid input AND
      // the mock must still return chainable methods for the update path.
      it("should return error when user is not authenticated with valid input", async () => {
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: null },
          error: null,
        })

        // Set up mock that passes validation (valid UUID) but hits auth check
        mockSupabase.from.mockImplementation(() => ({
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: null,
                }),
              }),
            }),
          }),
        }))

        const input = {
          id: fixtures.userMedia.imageMedia.id,
          is_processed: true,
        }

        const result = await updateUserMedia(input)

        expect(result.error).toBe("Unauthorized")
      })
    })

    describe("success cases", () => {
      it("should update media processing status", async () => {
        const updatedMedia = { ...fixtures.userMedia.imageMedia, is_processed: true }

        mockSupabase.from.mockImplementation(() => ({
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: updatedMedia,
                  error: null,
                }),
              }),
            }),
          }),
        }))

        const result = await updateUserMedia({
          id: fixtures.userMedia.imageMedia.id,
          is_processed: true,
        })

        expect(result.error).toBeUndefined()
        expect(result.data?.is_processed).toBe(true)
      })

      it("should update media dimensions", async () => {
        const updatedMedia = { ...fixtures.userMedia.imageMedia, width: 3840, height: 2160 }

        mockSupabase.from.mockImplementation(() => ({
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: updatedMedia,
                  error: null,
                }),
              }),
            }),
          }),
        }))

        const result = await updateUserMedia({
          id: fixtures.userMedia.imageMedia.id,
          width: 3840,
          height: 2160,
        })

        expect(result.error).toBeUndefined()
        expect(result.data?.width).toBe(3840)
        expect(result.data?.height).toBe(2160)
      })
    })
  })

  describe("getUserMediaLibrary", () => {
    describe("authentication", () => {
      it("should return error when user is not authenticated", async () => {
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: null },
          error: null,
        })

        const result = await getUserMediaLibrary()

        expect(result.error).toBe("Unauthorized")
      })
    })

    describe("success cases", () => {
      it("should return all user media with derivative URLs", async () => {
        const mediaList = [fixtures.userMedia.imageMedia, fixtures.userMedia.videoMedia]

        mockSupabase.from.mockImplementation(() => ({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: mediaList,
                error: null,
                count: 2,
              }),
            }),
          }),
        }))

        const result = await getUserMediaLibrary()

        expect(result.error).toBeUndefined()
        expect(result.data).toHaveLength(2)
        expect(result.count).toBe(2)
        // Check derivative URLs are added
        expect(result.data?.[0]).toHaveProperty("smallThumbnailUrl")
        expect(result.data?.[0]).toHaveProperty("thumbnailUrl")
        expect(result.data?.[0]).toHaveProperty("mediumUrl")
        expect(result.data?.[0]).toHaveProperty("largeUrl")
        expect(result.data?.[0]).toHaveProperty("fullResUrl")
      })

      it("should filter by media_type", async () => {
        const imageMedia = [fixtures.userMedia.imageMedia]

        // Create a properly chainable mock that handles the media_type filter
        // The query chain is: from().select().eq(user_id).order().eq(media_type) -> result
        mockSupabase.from.mockImplementation(() => {
          const chainable: any = {}
          chainable.select = vi.fn().mockReturnValue(chainable)
          chainable.eq = vi.fn().mockReturnValue(chainable)
          chainable.order = vi.fn().mockReturnValue(chainable) // Return chainable so .eq can be called
          // When the final await happens, it resolves to the data
          chainable.then = (resolve: (v: any) => any) =>
            resolve({ data: imageMedia, error: null, count: 1 })
          return chainable
        })

        const result = await getUserMediaLibrary({ media_type: "image" })

        expect(result.error).toBeUndefined()
        expect(result.data).toHaveLength(1)
        expect(result.data?.[0].media_type).toBe("image")
      })

      it("should support pagination with limit and offset", async () => {
        // Create a properly chainable mock that handles limit and range
        mockSupabase.from.mockImplementation(() => {
          const chainable: any = {}
          chainable.select = vi.fn().mockReturnValue(chainable)
          chainable.eq = vi.fn().mockReturnValue(chainable)
          chainable.order = vi.fn().mockReturnValue(chainable)
          chainable.limit = vi.fn().mockReturnValue(chainable)
          chainable.range = vi.fn().mockResolvedValue({
            data: [fixtures.userMedia.videoMedia],
            error: null,
            count: 3,
          })
          return chainable
        })

        const result = await getUserMediaLibrary({ limit: 1, offset: 1 })

        expect(result.error).toBeUndefined()
        expect(result.data).toHaveLength(1)
        expect(result.count).toBe(3)
      })
    })
  })

  describe("deleteUserMedia", () => {
    describe("authentication", () => {
      it("should return error when user is not authenticated", async () => {
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: null },
          error: null,
        })

        const result = await deleteUserMedia(fixtures.userMedia.imageMedia.id)

        expect(result.error).toBe("Unauthorized")
      })
    })

    describe("success cases", () => {
      it("should delete user media successfully", async () => {
        mockSupabase.from.mockImplementation(() => ({
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              error: null,
            }),
          }),
        }))

        const result = await deleteUserMedia(fixtures.userMedia.imageMedia.id)

        expect(result.error).toBeUndefined()
      })

      it("should handle database errors gracefully", async () => {
        mockSupabase.from.mockImplementation(() => ({
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              error: { message: "Foreign key constraint violation" },
            }),
          }),
        }))

        const result = await deleteUserMedia(fixtures.userMedia.imageMedia.id)

        expect(result.error).toBe("Failed to delete media")
      })
    })
  })

  // ============================================================================
  // Artifact Media Link Operations
  // ============================================================================

  describe("createArtifactMediaLink", () => {
    describe("validation", () => {
      it("should reject invalid artifact_id", async () => {
        const input = {
          artifact_id: "not-a-uuid",
          media_id: fixtures.userMedia.imageMedia.id,
          role: "gallery" as const,
        }

        const result = await createArtifactMediaLink(input as any)

        expect(result.error).toBe("Invalid input")
      })

      it("should reject invalid media_id", async () => {
        const input = {
          artifact_id: fixtures.artifacts.imageArtifact.id,
          media_id: "not-a-uuid",
          role: "gallery" as const,
        }

        const result = await createArtifactMediaLink(input as any)

        expect(result.error).toBe("Invalid input")
      })

      it("should reject invalid role", async () => {
        const input = {
          artifact_id: fixtures.artifacts.imageArtifact.id,
          media_id: fixtures.userMedia.imageMedia.id,
          role: "invalid" as any,
        }

        const result = await createArtifactMediaLink(input as any)

        expect(result.error).toBe("Invalid input")
      })
    })

    describe("authentication", () => {
      it("should return error when user is not authenticated with valid input", async () => {
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: null },
          error: null,
        })

        const input = {
          artifact_id: fixtures.artifacts.imageArtifact.id,
          media_id: fixtures.userMedia.imageMedia.id,
          role: "gallery" as const,
        }

        const result = await createArtifactMediaLink(input as any)

        expect(result.error).toBe("Unauthorized")
      })
    })

    describe("authorization", () => {
      it("should reject link creation for artifact owned by another user", async () => {
        const anotherUsersArtifact = {
          ...fixtures.artifacts.imageArtifact,
          user_id: fixtures.users.anotherUser.id,
        }

        mockSupabase.from.mockImplementation((table: string) => {
          if (table === "artifacts") {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: anotherUsersArtifact,
                    error: null,
                  }),
                }),
              }),
            }
          }
          return createChainableMock()
        })

        const input = {
          artifact_id: anotherUsersArtifact.id,
          media_id: fixtures.userMedia.imageMedia.id,
          role: "gallery" as const,
        }

        const result = await createArtifactMediaLink(input as any)

        expect(result.error).toBe("Unauthorized - artifact not found or access denied")
      })

      it("should reject link creation when media not found", async () => {
        mockSupabase.from.mockImplementation((table: string) => {
          if (table === "artifacts") {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: fixtures.artifacts.imageArtifact,
                    error: null,
                  }),
                }),
              }),
            }
          }
          if (table === "user_media") {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: null,
                    error: null,
                  }),
                }),
              }),
            }
          }
          return createChainableMock()
        })

        const input = {
          artifact_id: fixtures.artifacts.imageArtifact.id,
          media_id: fixtures.userMedia.imageMedia.id,
          role: "gallery" as const,
        }

        const result = await createArtifactMediaLink(input as any)

        expect(result.error).toBe("Media not found")
      })
    })

    describe("success cases", () => {
      it("should create artifact media link with default role", async () => {
        mockSupabase.from.mockImplementation((table: string) => {
          if (table === "artifacts") {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: fixtures.artifacts.imageArtifact,
                    error: null,
                  }),
                }),
              }),
              update: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: null }),
              }),
            }
          }
          if (table === "user_media") {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: fixtures.userMedia.imageMedia,
                    error: null,
                  }),
                }),
              }),
            }
          }
          if (table === "artifact_media") {
            const chainable: any = {}
            chainable.select = vi.fn().mockReturnValue(chainable)
            chainable.eq = vi.fn().mockReturnValue(chainable)
            chainable.order = vi.fn().mockReturnValue(chainable)
            chainable.limit = vi.fn().mockReturnValue(chainable)
            chainable.single = vi.fn().mockResolvedValue({
              data: null, // No existing items
              error: null,
            })
            chainable.insert = vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: fixtures.artifactMedia.galleryLink,
                  error: null,
                }),
              }),
            })
            return chainable
          }
          return createChainableMock()
        })

        const input = {
          artifact_id: fixtures.artifacts.imageArtifact.id,
          media_id: fixtures.userMedia.imageMedia.id,
          role: "gallery" as const,
        }

        const result = await createArtifactMediaLink(input as any)

        expect(result.error).toBeUndefined()
        expect(result.data).toBeDefined()
      })
    })
  })

  describe("removeArtifactMediaLink", () => {
    describe("authentication", () => {
      it("should return error when user is not authenticated", async () => {
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: null },
          error: null,
        })

        const result = await removeArtifactMediaLink(fixtures.artifactMedia.galleryLink.id)

        expect(result.error).toBe("Unauthorized")
      })
    })

    describe("success cases", () => {
      it("should remove artifact media link successfully", async () => {
        let queryCount = 0
        mockSupabase.from.mockImplementation(() => {
          queryCount++
          if (queryCount === 1) {
            // Get link details
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { artifact_id: fixtures.artifacts.imageArtifact.id },
                    error: null,
                  }),
                }),
              }),
            }
          }
          // Delete link
          return {
            delete: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          }
        })

        const result = await removeArtifactMediaLink(fixtures.artifactMedia.galleryLink.id)

        expect(result.error).toBeUndefined()
      })

      it("should return error when link not found", async () => {
        mockSupabase.from.mockImplementation(() => ({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
            }),
          }),
        }))

        const result = await removeArtifactMediaLink("am999999-9999-4999-a999-999999999999")

        expect(result.error).toBe("Link not found")
      })
    })
  })

  // ============================================================================
  // Query Operations
  // ============================================================================

  describe("getArtifactMediaByRole", () => {
    it("should return gallery media with derivative URLs", async () => {
      const mockGalleryData = [
        {
          ...fixtures.artifactMedia.galleryLink,
          media: fixtures.userMedia.imageMedia,
        },
      ]

      mockSupabase.from.mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: mockGalleryData,
                error: null,
              }),
            }),
          }),
        }),
      }))

      const result = await getArtifactMediaByRole(fixtures.artifacts.imageArtifact.id, "gallery")

      expect(result.error).toBeUndefined()
      expect(result.data).toHaveLength(1)
      expect(result.data?.[0].media).toHaveProperty("smallThumbnailUrl")
      expect(result.data?.[0].media).toHaveProperty("thumbnailUrl")
      expect(result.data?.[0].media).toHaveProperty("fullResUrl")
    })

    it("should filter out items where media join failed", async () => {
      const mockGalleryData = [
        {
          ...fixtures.artifactMedia.galleryLink,
          media: fixtures.userMedia.imageMedia,
        },
        {
          ...fixtures.artifactMedia.galleryLink,
          id: "orphan-link",
          media: null, // Failed join - media was deleted
        },
      ]

      mockSupabase.from.mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: mockGalleryData,
                error: null,
              }),
            }),
          }),
        }),
      }))

      const result = await getArtifactMediaByRole(fixtures.artifacts.imageArtifact.id, "gallery")

      expect(result.error).toBeUndefined()
      expect(result.data).toHaveLength(1) // Only the one with valid media
    })

    it("should handle database errors", async () => {
      mockSupabase.from.mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: null,
                error: { message: "Database error" },
              }),
            }),
          }),
        }),
      }))

      const result = await getArtifactMediaByRole(fixtures.artifacts.imageArtifact.id, "gallery")

      expect(result.error).toBe("Failed to fetch artifact media")
    })
  })

  describe("getArtifactGalleryMedia", () => {
    it("should delegate to getArtifactMediaByRole with 'gallery' role", async () => {
      const mockGalleryData = [
        {
          ...fixtures.artifactMedia.galleryLink,
          media: fixtures.userMedia.imageMedia,
        },
      ]

      mockSupabase.from.mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: mockGalleryData,
                error: null,
              }),
            }),
          }),
        }),
      }))

      const result = await getArtifactGalleryMedia(fixtures.artifacts.imageArtifact.id)

      expect(result.error).toBeUndefined()
      expect(result.data).toHaveLength(1)
    })
  })

  describe("reorderArtifactMedia", () => {
    describe("validation", () => {
      it("should reject invalid artifact_id", async () => {
        const input = {
          artifact_id: "not-a-uuid",
          role: "gallery" as const,
          // Use a valid UUID from fixtures for media_id to isolate artifact_id validation
          reorders: [{ media_id: fixtures.userMedia.imageMedia.id, new_sort_order: 0 }],
        }

        const result = await reorderArtifactMedia(input)

        expect(result.error).toBe("Invalid input")
      })

      it("should reject invalid role", async () => {
        const input = {
          artifact_id: fixtures.artifacts.imageArtifact.id,
          role: "invalid" as any,
          reorders: [{ media_id: fixtures.userMedia.imageMedia.id, new_sort_order: 0 }],
        }

        const result = await reorderArtifactMedia(input)

        expect(result.error).toBe("Invalid input")
      })

      it("should reject invalid media_id in reorders", async () => {
        const input = {
          artifact_id: fixtures.artifacts.imageArtifact.id,
          role: "gallery" as const,
          reorders: [{ media_id: "not-a-uuid", new_sort_order: 0 }],
        }

        const result = await reorderArtifactMedia(input)

        expect(result.error).toBe("Invalid input")
      })
    })

    describe("authentication", () => {
      it("should return error when user is not authenticated with valid input", async () => {
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: null },
          error: null,
        })

        // Set up mock for the artifact lookup that happens after auth check
        mockSupabase.from.mockImplementation(() => ({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
            }),
          }),
        }))

        const input = {
          artifact_id: fixtures.artifacts.imageArtifact.id,
          role: "gallery" as const,
          reorders: [{ media_id: fixtures.userMedia.imageMedia.id, new_sort_order: 0 }],
        }

        const result = await reorderArtifactMedia(input)

        expect(result.error).toBe("Unauthorized")
      })
    })

    describe("authorization", () => {
      it("should reject reorder for artifact owned by another user", async () => {
        const anotherUsersArtifact = {
          ...fixtures.artifacts.imageArtifact,
          user_id: fixtures.users.anotherUser.id,
        }

        mockSupabase.from.mockImplementation(() => ({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: anotherUsersArtifact,
                error: null,
              }),
            }),
          }),
        }))

        const input = {
          artifact_id: anotherUsersArtifact.id,
          role: "gallery" as const,
          reorders: [{ media_id: fixtures.userMedia.imageMedia.id, new_sort_order: 0 }],
        }

        const result = await reorderArtifactMedia(input)

        expect(result.error).toBe("Unauthorized")
      })
    })

    describe("success cases", () => {
      it("should reorder media using two-phase update", async () => {
        let updateCount = 0
        mockSupabase.from.mockImplementation((table: string) => {
          if (table === "artifacts") {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: fixtures.artifacts.imageArtifact,
                    error: null,
                  }),
                }),
              }),
            }
          }
          if (table === "artifact_media") {
            return {
              update: vi.fn().mockImplementation(() => {
                updateCount++
                return {
                  eq: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                      eq: vi.fn().mockResolvedValue({ error: null }),
                    }),
                  }),
                }
              }),
            }
          }
          return createChainableMock()
        })

        const input = {
          artifact_id: fixtures.artifacts.imageArtifact.id,
          role: "gallery" as const,
          reorders: [
            { media_id: fixtures.userMedia.imageMedia.id, new_sort_order: 1 },
            { media_id: fixtures.userMedia.videoMedia.id, new_sort_order: 0 },
          ],
        }

        const result = await reorderArtifactMedia(input)

        expect(result.error).toBeUndefined()
        // Two-phase update: 2 items * 2 phases = 4 updates
        expect(updateCount).toBe(4)
      })
    })
  })

  describe("getMediaUsage", () => {
    describe("authentication", () => {
      it("should return error when user is not authenticated", async () => {
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: null },
          error: null,
        })

        const result = await getMediaUsage(fixtures.userMedia.imageMedia.id)

        expect(result.error).toBe("Unauthorized")
      })
    })

    describe("success cases", () => {
      it("should return list of artifacts using the media", async () => {
        const mockUsage = [
          {
            artifact_id: fixtures.artifacts.imageArtifact.id,
            role: "gallery",
            is_primary: true,
            artifact: { title: fixtures.artifacts.imageArtifact.title },
          },
          {
            artifact_id: fixtures.artifacts.multiMediaArtifact.id,
            role: "gallery",
            is_primary: false,
            artifact: { title: fixtures.artifacts.multiMediaArtifact.title },
          },
        ]

        mockSupabase.from.mockImplementation(() => ({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: mockUsage,
              error: null,
            }),
          }),
        }))

        const result = await getMediaUsage(fixtures.userMedia.imageMedia.id)

        expect(result.error).toBeUndefined()
        expect(result.data).toHaveLength(2)
        expect(result.data?.[0].artifact_title).toBe(fixtures.artifacts.imageArtifact.title)
        expect(result.data?.[0].is_primary).toBe(true)
      })

      it("should return empty array when media is not used anywhere", async () => {
        mockSupabase.from.mockImplementation(() => ({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }))

        const result = await getMediaUsage("m9999999-9999-4999-a999-999999999999")

        expect(result.error).toBeUndefined()
        expect(result.data).toHaveLength(0)
      })
    })
  })

  // ============================================================================
  // Helper Functions
  // ============================================================================

  describe("createUserMediaFromUrl", () => {
    it("should extract filename and determine media type from URL", async () => {
      let insertedData: any = null
      mockSupabase.from.mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        }),
        insert: vi.fn().mockImplementation((data) => {
          insertedData = data
          return {
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { ...data, id: "new-media-id" },
                error: null,
              }),
            }),
          }
        }),
      }))

      const result = await createUserMediaFromUrl(
        fixtures.supabaseStorage.validUrl,
        fixtures.users.validUser.id
      )

      expect(result.error).toBeUndefined()
      expect(insertedData).toMatchObject({
        user_id: fixtures.users.validUser.id,
        filename: "image.jpg",
        media_type: "image",
        mime_type: "image/jpeg",
      })
    })

    it("should detect video URLs correctly", async () => {
      let insertedData: any = null
      mockSupabase.from.mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        }),
        insert: vi.fn().mockImplementation((data) => {
          insertedData = data
          return {
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { ...data, id: "new-media-id" },
                error: null,
              }),
            }),
          }
        }),
      }))

      await createUserMediaFromUrl(
        "https://example.com/storage/video.mp4",
        fixtures.users.validUser.id
      )

      expect(insertedData).toMatchObject({
        media_type: "video",
        mime_type: "video/mp4",
      })
    })

    it("should detect audio URLs correctly", async () => {
      let insertedData: any = null
      mockSupabase.from.mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        }),
        insert: vi.fn().mockImplementation((data) => {
          insertedData = data
          return {
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { ...data, id: "new-media-id" },
                error: null,
              }),
            }),
          }
        }),
      }))

      await createUserMediaFromUrl(
        "https://example.com/storage/audio.mp3",
        fixtures.users.validUser.id
      )

      expect(insertedData).toMatchObject({
        media_type: "audio",
        mime_type: "audio/mpeg",
      })
    })

    it("should return existing media if URL already exists", async () => {
      const existingMedia = fixtures.userMedia.imageMedia

      mockSupabase.from.mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: existingMedia,
                error: null,
              }),
            }),
          }),
        }),
      }))

      const result = await createUserMediaFromUrl(
        existingMedia.public_url,
        fixtures.users.validUser.id
      )

      expect(result.error).toBeUndefined()
      expect(result.data).toEqual(existingMedia)
    })
  })

  describe("createArtifactMediaLinks", () => {
    it("should create links for multiple media URLs", async () => {
      const mediaUrls = [
        fixtures.userMedia.imageMedia.public_url,
        fixtures.userMedia.videoMedia.public_url,
      ]

      let insertCount = 0
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "user_media") {
          const chainable: any = {}
          chainable.select = vi.fn().mockReturnValue(chainable)
          chainable.eq = vi.fn().mockReturnValue(chainable)
          chainable.single = vi.fn().mockResolvedValue({
            data: null, // Not found, needs creation
            error: null,
          })
          chainable.insert = vi.fn().mockImplementation((data) => ({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: `new-media-${insertCount++}`, ...data },
                error: null,
              }),
            }),
          }))
          return chainable
        }
        if (table === "artifact_media") {
          const chainable: any = {}
          chainable.select = vi.fn().mockReturnValue(chainable)
          chainable.eq = vi.fn().mockReturnValue(chainable)
          chainable.order = vi.fn().mockReturnValue(chainable)
          chainable.limit = vi.fn().mockReturnValue(chainable)
          chainable.single = vi.fn().mockResolvedValue({
            data: null, // No existing link
            error: null,
          })
          chainable.insert = vi.fn().mockReturnValue({
            error: null,
          })
          return chainable
        }
        return createChainableMock()
      })

      const result = await createArtifactMediaLinks(
        fixtures.artifacts.imageArtifact.id,
        mediaUrls,
        fixtures.users.validUser.id
      )

      expect(result.error).toBeUndefined()
      expect(result.createdCount).toBe(2)
    })

    it("should skip existing links", async () => {
      const mediaUrls = [fixtures.userMedia.imageMedia.public_url]

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "user_media") {
          const chainable: any = {}
          chainable.select = vi.fn().mockReturnValue(chainable)
          chainable.eq = vi.fn().mockReturnValue(chainable)
          chainable.single = vi.fn().mockResolvedValue({
            data: fixtures.userMedia.imageMedia,
            error: null,
          })
          return chainable
        }
        if (table === "artifact_media") {
          const chainable: any = {}
          chainable.select = vi.fn().mockReturnValue(chainable)
          chainable.eq = vi.fn().mockReturnValue(chainable)
          chainable.order = vi.fn().mockReturnValue(chainable)
          chainable.limit = vi.fn().mockReturnValue(chainable)
          chainable.single = vi.fn().mockResolvedValue({
            data: fixtures.artifactMedia.galleryLink, // Link already exists
            error: null,
          })
          return chainable
        }
        return createChainableMock()
      })

      const result = await createArtifactMediaLinks(
        fixtures.artifacts.imageArtifact.id,
        mediaUrls,
        fixtures.users.validUser.id
      )

      expect(result.error).toBeUndefined()
      expect(result.createdCount).toBe(0) // No new links created
    })
  })
})
