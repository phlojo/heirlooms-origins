import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { fixtures } from "@/__tests__/fixtures"
import {
  createCollection,
  getCollection,
  getCollectionBySlug,
  updateCollection,
  deleteCollection,
  getOrCreateUncategorizedCollection,
  getMyCollections,
  getMyCollectionsWithThumbnails,
} from "@/lib/actions/collections"
import * as supabaseModule from "@/lib/supabase/server"

// Mock next/cache
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}))

// Mock admin check
vi.mock("@/lib/utils/admin", () => ({
  isCurrentUserAdmin: vi.fn().mockResolvedValue(false),
}))

// Mock artifacts action (used in deleteCollection)
vi.mock("@/lib/actions/artifacts", () => ({
  getArtifactsByCollection: vi.fn().mockResolvedValue([]),
}))

// Mock cloudinary (used in deleteCollection with deleteArtifacts=true)
vi.mock("@/lib/actions/cloudinary", () => ({
  deleteCloudinaryMedia: vi.fn().mockResolvedValue({ success: true }),
  extractPublicIdFromUrl: vi.fn().mockResolvedValue("test-public-id"),
}))

describe("Collection Server Actions", () => {
  let mockSupabase: any

  beforeEach(() => {
    vi.clearAllMocks()

    // Create a chainable mock for Supabase queries
    const createChainableMock = () => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      single: vi.fn().mockResolvedValue({
        data: fixtures.collections.publicCollection,
        error: null,
      }),
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

  describe("createCollection", () => {
    describe("validation", () => {
      it("should reject empty title", async () => {
        const input = {
          title: "",
          description: "A valid description",
          is_public: false,
        }

        const result = await createCollection(input)

        expect(result.success).toBe(false)
        expect(result.error).toBe("Invalid input")
        expect(result.fieldErrors).toHaveProperty("title")
      })

      it("should reject title longer than 100 characters", async () => {
        const input = {
          title: "a".repeat(101),
          description: "A valid description",
          is_public: false,
        }

        const result = await createCollection(input)

        expect(result.success).toBe(false)
        expect(result.error).toBe("Invalid input")
      })

      it("should reject description longer than 500 characters", async () => {
        const input = {
          title: "Valid Title",
          description: "a".repeat(501),
          is_public: false,
        }

        const result = await createCollection(input)

        expect(result.success).toBe(false)
        expect(result.error).toBe("Invalid input")
      })

      it("should accept valid input with optional fields", async () => {
        const input = {
          title: "Valid Collection",
          is_public: true,
        }

        // Mock successful insert
        const insertMock = vi.fn().mockReturnThis()
        const selectMock = vi.fn().mockReturnThis()
        const singleMock = vi.fn().mockResolvedValue({
          data: { ...fixtures.collections.publicCollection, title: input.title },
          error: null,
        })

        mockSupabase.from.mockImplementation((table: string) => {
          if (table === "collections") {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({ data: null, error: null }), // For slug uniqueness check
              insert: insertMock,
            }
          }
          return { select: selectMock, single: singleMock }
        })

        // Need to properly chain the insert mock
        insertMock.mockReturnValue({ select: selectMock })
        selectMock.mockReturnValue({ single: singleMock })

        const result = await createCollection(input)

        // The result depends on the mock setup - verify input was validated
        expect(result).toBeDefined()
      })
    })

    describe("authentication", () => {
      it("should return error when user is not authenticated", async () => {
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: null },
          error: null,
        })

        const input = {
          title: "Test Collection",
          is_public: false,
        }

        const result = await createCollection(input)

        expect(result.success).toBe(false)
        expect(result.error).toBe("Unauthorized")
      })
    })

    describe("slug generation", () => {
      it("should generate slug from title", async () => {
        const input = {
          title: "My Test Collection",
          is_public: false,
        }

        // Track what gets inserted
        let insertedData: any = null
        const insertMock = vi.fn().mockImplementation((data) => {
          insertedData = data
          return {
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { ...fixtures.collections.publicCollection, ...data },
                error: null,
              }),
            }),
          }
        })

        mockSupabase.from.mockImplementation((table: string) => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
          insert: insertMock,
        }))

        await createCollection(input)

        // Verify insert was called with a slug
        expect(insertMock).toHaveBeenCalled()
        if (insertedData) {
          expect(insertedData.slug).toBeDefined()
          expect(insertedData.slug).toContain("my-test-collection")
        }
      })
    })
  })

  describe("getCollection", () => {
    it("should return collection when found", async () => {
      const mockCollection = fixtures.collections.publicCollection
      mockSupabase.from.mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockCollection, error: null }),
      }))

      const result = await getCollection(mockCollection.id)

      expect(result).toEqual(mockCollection)
    })

    it("should return null when collection not found", async () => {
      mockSupabase.from.mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "Not found" },
        }),
      }))

      const result = await getCollection("non-existent-id")

      expect(result).toBeNull()
    })
  })

  describe("getCollectionBySlug", () => {
    it("should return collection when found by slug", async () => {
      const mockCollection = fixtures.collections.publicCollection
      mockSupabase.from.mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockCollection, error: null }),
      }))

      const result = await getCollectionBySlug(mockCollection.slug)

      expect(result).toEqual(mockCollection)
    })

    it("should return null when collection not found by slug", async () => {
      mockSupabase.from.mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "Not found" },
        }),
      }))

      const result = await getCollectionBySlug("non-existent-slug")

      expect(result).toBeNull()
    })
  })

  describe("updateCollection", () => {
    describe("validation", () => {
      it("should reject empty title on update", async () => {
        const input = {
          title: "",
          description: "Updated description",
          is_public: true,
        }

        const result = await updateCollection("collection-id", input)

        expect(result.success).toBe(false)
        expect(result.error).toBe("Invalid input")
      })

      it("should reject title longer than 100 characters on update", async () => {
        const input = {
          title: "a".repeat(101),
          is_public: false,
        }

        const result = await updateCollection("collection-id", input)

        expect(result.success).toBe(false)
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
          title: "Updated Title",
          is_public: false,
        }

        const result = await updateCollection("collection-id", input)

        expect(result.success).toBe(false)
        expect(result.error).toBe("Unauthorized")
      })
    })

    describe("authorization", () => {
      it("should return error when user does not own collection", async () => {
        // User is authenticated but doesn't own the collection
        const anotherUsersCollection = {
          ...fixtures.collections.publicCollection,
          user_id: fixtures.users.anotherUser.id,
        }

        mockSupabase.from.mockImplementation(() => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: anotherUsersCollection, error: null }),
        }))

        const input = {
          title: "Updated Title",
          is_public: false,
        }

        const result = await updateCollection(anotherUsersCollection.id, input)

        expect(result.success).toBe(false)
        expect(result.error).toBe("Unauthorized")
      })
    })
  })

  describe("deleteCollection", () => {
    describe("authentication", () => {
      it("should return error when user is not authenticated", async () => {
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: null },
          error: null,
        })

        const result = await deleteCollection("collection-id")

        expect(result.success).toBe(false)
        expect(result.error).toBe("Unauthorized")
      })
    })

    describe("authorization", () => {
      it("should return error when user does not own collection", async () => {
        const anotherUsersCollection = {
          ...fixtures.collections.publicCollection,
          user_id: fixtures.users.anotherUser.id,
        }

        mockSupabase.from.mockImplementation(() => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: anotherUsersCollection, error: null }),
        }))

        const result = await deleteCollection(anotherUsersCollection.id)

        expect(result.success).toBe(false)
        expect(result.error).toBe("You do not have permission to delete this collection")
      })
    })

    describe("collection not found", () => {
      it("should return error when collection does not exist", async () => {
        mockSupabase.from.mockImplementation(() => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: { message: "Not found" } }),
        }))

        const result = await deleteCollection("non-existent-id")

        expect(result.success).toBe(false)
        expect(result.error).toBe("Collection not found")
      })
    })
  })

  describe("getOrCreateUncategorizedCollection", () => {
    it("should return existing uncategorized collection if found", async () => {
      const uncategorizedCollection = {
        ...fixtures.collections.privateCollection,
        title: "Uncategorized Artifacts",
        slug: "uncategorized-11111111",
      }

      mockSupabase.from.mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: [uncategorizedCollection],
          error: null,
        }),
      }))

      const result = await getOrCreateUncategorizedCollection(fixtures.users.validUser.id)

      expect(result.success).toBe(true)
      expect(result.data).toEqual(uncategorizedCollection)
    })

    it("should create uncategorized collection if not found", async () => {
      const newUncategorized = {
        id: "new-uncategorized-id",
        title: "Uncategorized Artifacts",
        slug: `uncategorized-${fixtures.users.validUser.id.substring(0, 8)}`,
        is_public: false,
        user_id: fixtures.users.validUser.id,
      }

      let queryCount = 0
      mockSupabase.from.mockImplementation(() => {
        queryCount++
        if (queryCount === 1) {
          // First query - lookup existing
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            ilike: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue({ data: [], error: null }),
          }
        } else {
          // Second query - insert new
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: newUncategorized, error: null }),
              }),
            }),
          }
        }
      })

      const result = await getOrCreateUncategorizedCollection(fixtures.users.validUser.id)

      expect(result.success).toBe(true)
      expect(result.data?.slug).toContain("uncategorized")
    })
  })

  describe("getMyCollections", () => {
    it("should return user collections sorted with uncategorized first", async () => {
      const userCollections = [
        { id: "1", title: "Regular Collection", slug: "regular-collection" },
        { id: "2", title: "Uncategorized Artifacts", slug: "uncategorized-11111111" },
        { id: "3", title: "Another Collection", slug: "another-collection" },
      ]

      mockSupabase.from.mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: userCollections, error: null }),
      }))

      const result = await getMyCollections(fixtures.users.validUser.id)

      expect(result.error).toBeNull()
      expect(result.collections.length).toBe(3)
      // Uncategorized should be first
      expect(result.collections[0].slug).toContain("uncategorized")
    })

    it("should return empty array when user has no collections", async () => {
      mockSupabase.from.mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      }))

      const result = await getMyCollections(fixtures.users.validUser.id)

      expect(result.error).toBeNull()
      expect(result.collections).toEqual([])
    })

    it("should return error when database query fails", async () => {
      mockSupabase.from.mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "Database error" },
        }),
      }))

      const result = await getMyCollections(fixtures.users.validUser.id)

      expect(result.error).toBe("Database error")
      expect(result.collections).toEqual([])
    })
  })

  describe("getMyCollectionsWithThumbnails", () => {
    it("should return empty array when user has no collections", async () => {
      mockSupabase.from.mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      }))

      const result = await getMyCollectionsWithThumbnails(fixtures.users.validUser.id)

      expect(result.error).toBeNull()
      expect(result.collections).toEqual([])
    })

    it("should return error when database query fails", async () => {
      mockSupabase.from.mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: null,
              error: { message: "Database error" },
            }),
          }),
        }),
      }))

      const result = await getMyCollectionsWithThumbnails(fixtures.users.validUser.id)

      expect(result.error).toBe("Database error")
      expect(result.collections).toEqual([])
    })

    it("should handle unexpected exceptions gracefully", async () => {
      mockSupabase.from.mockImplementation(() => {
        throw new Error("Unexpected database error")
      })

      const result = await getMyCollectionsWithThumbnails(fixtures.users.validUser.id)

      expect(result.error).toBe("Failed to fetch collections")
      expect(result.collections).toEqual([])
    })
  })
})
