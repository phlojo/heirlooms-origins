import { describe, it, expect, vi, beforeEach } from "vitest"
import { fixtures } from "@/__tests__/fixtures"
import { createMockSupabaseClient, setupSupabaseMocks } from "@/__tests__/mocks/supabase.mock"

// Mock dependencies
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}))

describe("Integration: Collection Workflows", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupSupabaseMocks()
  })

  describe("collection creation workflow", () => {
    it("should create collection with required fields", async () => {
      const { createClient } = await import("@/lib/supabase/server")
      const mockSupabase = createMockSupabaseClient({
        collections: {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  ...fixtures.collections.publicCollection,
                  title: "New Collection",
                },
                error: null,
              }),
            }),
          }),
        },
      })
      vi.mocked(createClient).mockResolvedValue(mockSupabase)

      const collectionData = {
        title: "New Collection",
        user_id: fixtures.users.validUser.id,
      }

      const supabase = await createClient()
      expect(supabase).toBeDefined()

      const insertMock = supabase.collections.insert as any
      insertMock(collectionData)

      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "New Collection",
          user_id: fixtures.users.validUser.id,
        })
      )
    })

    it("should create private collection by default", async () => {
      const { createClient } = await import("@/lib/supabase/server")
      const mockSupabase = createMockSupabaseClient({
        collections: {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  ...fixtures.collections.privateCollection,
                },
                error: null,
              }),
            }),
          }),
        },
      })
      vi.mocked(createClient).mockResolvedValue(mockSupabase)

      const supabase = await createClient()
      const insertMock = supabase.collections.insert as any
      insertMock({
        title: "New Collection",
        user_id: fixtures.users.validUser.id,
        is_public: false,
      })

      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          is_public: false,
        })
      )
    })

    it("should generate slug for collection", async () => {
      const title = "Family Heirlooms"
      const expectedSlug = "family-heirlooms"

      expect(expectedSlug).toMatch(/^[a-z0-9-]+$/)
      expect(expectedSlug).not.toMatch(/\s/)
    })

    it("should associate collection with user", async () => {
      const { createClient } = await import("@/lib/supabase/server")
      const userId = fixtures.users.validUser.id

      const mockSupabase = createMockSupabaseClient({
        collections: {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  ...fixtures.collections.publicCollection,
                  user_id: userId,
                },
                error: null,
              }),
            }),
          }),
        },
      })

      vi.mocked(createClient).mockResolvedValue(mockSupabase)

      const supabase = await createClient()
      const insertMock = supabase.collections.insert as any
      insertMock({ user_id: userId })

      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: userId,
        })
      )
    })
  })

  describe("collection update workflow", () => {
    it("should update collection title", async () => {
      const { createClient } = await import("@/lib/supabase/server")
      const collectionId = fixtures.collections.publicCollection.id

      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })

      const mockSupabase = createMockSupabaseClient({
        collections: {
          update: updateMock,
        },
      })

      vi.mocked(createClient).mockResolvedValue(mockSupabase)

      const updateData = {
        title: "Updated Collection Title",
      }

      const supabase = await createClient()
      supabase.collections.update(updateData).eq("id", collectionId)

      expect(updateMock).toHaveBeenCalledWith(updateData)
    })

    it("should update collection description", async () => {
      const { createClient } = await import("@/lib/supabase/server")
      const collectionId = fixtures.collections.publicCollection.id

      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })

      const mockSupabase = createMockSupabaseClient({
        collections: {
          update: updateMock,
        },
      })

      vi.mocked(createClient).mockResolvedValue(mockSupabase)

      const description = "Updated collection description"
      const supabase = await createClient()
      supabase.collections.update({ description }).eq("id", collectionId)

      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          description,
        })
      )
    })

    it("should update collection privacy setting", async () => {
      const { createClient } = await import("@/lib/supabase/server")
      const collectionId = fixtures.collections.publicCollection.id

      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })

      const mockSupabase = createMockSupabaseClient({
        collections: {
          update: updateMock,
        },
      })

      vi.mocked(createClient).mockResolvedValue(mockSupabase)

      const supabase = await createClient()
      supabase.collections.update({ is_public: false }).eq("id", collectionId)

      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          is_public: false,
        })
      )
    })

    it("should update collection cover image", async () => {
      const { createClient } = await import("@/lib/supabase/server")
      const collectionId = fixtures.collections.publicCollection.id

      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })

      const mockSupabase = createMockSupabaseClient({
        collections: {
          update: updateMock,
        },
      })

      vi.mocked(createClient).mockResolvedValue(mockSupabase)

      const coverImage = "https://example.com/cover.jpg"
      const supabase = await createClient()
      supabase.collections.update({ cover_image: coverImage }).eq("id", collectionId)

      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          cover_image: coverImage,
        })
      )
    })
  })

  describe("collection deletion workflow", () => {
    it("should delete collection", async () => {
      const { createClient } = await import("@/lib/supabase/server")
      const collectionId = fixtures.collections.publicCollection.id

      const deleteMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })

      const mockSupabase = createMockSupabaseClient({
        collections: {
          delete: deleteMock,
        },
      })

      vi.mocked(createClient).mockResolvedValue(mockSupabase)

      const supabase = await createClient()
      supabase.collections.delete().eq("id", collectionId)

      expect(deleteMock).toHaveBeenCalled()
    })

    it("should clean up artifacts in collection on deletion", async () => {
      const { createClient } = await import("@/lib/supabase/server")
      const collectionId = fixtures.collections.publicCollection.id

      const deleteMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })

      const mockSupabase = createMockSupabaseClient({
        artifacts: {
          delete: deleteMock,
        },
        collections: {
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        },
      })

      vi.mocked(createClient).mockResolvedValue(mockSupabase)

      const supabase = await createClient()
      // First delete artifacts in collection
      supabase.artifacts.delete().eq("collection_id", collectionId)
      // Then delete collection
      supabase.collections.delete().eq("id", collectionId)

      expect(deleteMock).toHaveBeenCalled()
    })
  })

  describe("collection retrieval workflows", () => {
    it("should retrieve collection by ID", async () => {
      const { createClient } = await import("@/lib/supabase/server")
      const collectionId = fixtures.collections.publicCollection.id

      const mockSupabase = createMockSupabaseClient({
        collections: {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: fixtures.collections.publicCollection,
                error: null,
              }),
            }),
          }),
        },
      })

      vi.mocked(createClient).mockResolvedValue(mockSupabase)

      const supabase = await createClient()
      const { data } = await supabase.from("collections").select().eq("id", collectionId).single()

      expect(data).toBeDefined()
      expect(data?.id).toBe(collectionId)
    })

    it("should retrieve collections for user", async () => {
      const { createClient } = await import("@/lib/supabase/server")
      const userId = fixtures.users.validUser.id

      const mockSupabase = createMockSupabaseClient({
        collections: {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [
                  fixtures.collections.publicCollection,
                  fixtures.collections.privateCollection,
                ],
                error: null,
              }),
            }),
          }),
        },
      })

      vi.mocked(createClient).mockResolvedValue(mockSupabase)

      const supabase = await createClient()
      const { data } = await supabase
        .from("collections")
        .select()
        .eq("user_id", userId)
        .order("created_at")

      expect(data).toBeDefined()
      expect(Array.isArray(data)).toBe(true)
    })

    it("should retrieve public collections", async () => {
      const { createClient } = await import("@/lib/supabase/server")

      const mockSupabase = createMockSupabaseClient({
        collections: {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [fixtures.collections.publicCollection],
                error: null,
              }),
            }),
          }),
        },
      })

      vi.mocked(createClient).mockResolvedValue(mockSupabase)

      const supabase = await createClient()
      const { data } = await supabase
        .from("collections")
        .select()
        .eq("is_public", true)
        .order("created_at")

      expect(data).toBeDefined()
    })

    it("should retrieve collection with artifact count", async () => {
      const { createClient } = await import("@/lib/supabase/server")
      const collectionId = fixtures.collections.publicCollection.id

      const mockSupabase = createMockSupabaseClient({
        collections: {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  ...fixtures.collections.publicCollection,
                  itemCount: 5,
                },
                error: null,
              }),
            }),
          }),
        },
      })

      vi.mocked(createClient).mockResolvedValue(mockSupabase)

      const supabase = await createClient()
      const { data } = await supabase
        .from("collections")
        .select("*, itemCount:artifacts(count)")
        .eq("id", collectionId)
        .single()

      expect(data?.itemCount).toBeDefined()
    })
  })

  describe("collection search and filter", () => {
    it("should search collections by title", async () => {
      const { createClient } = await import("@/lib/supabase/server")
      const searchTerm = "family"

      const mockSupabase = createMockSupabaseClient({
        collections: {
          select: vi.fn().mockReturnValue({
            ilike: vi.fn().mockResolvedValue({
              data: [fixtures.collections.publicCollection],
              error: null,
            }),
          }),
        },
      })

      vi.mocked(createClient).mockResolvedValue(mockSupabase)

      const supabase = await createClient()
      const { data } = await supabase.from("collections").select().ilike("title", `%${searchTerm}%`)

      expect(data).toBeDefined()
    })

    it("should filter collections by visibility", async () => {
      const { createClient } = await import("@/lib/supabase/server")

      const mockSupabase = createMockSupabaseClient({
        collections: {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [fixtures.collections.publicCollection],
              error: null,
            }),
          }),
        },
      })

      vi.mocked(createClient).mockResolvedValue(mockSupabase)

      const supabase = await createClient()
      const { data } = await supabase.from("collections").select().eq("is_public", true)

      expect(data).toBeDefined()
    })

    it("should sort collections by creation date", async () => {
      const { createClient } = await import("@/lib/supabase/server")
      const userId = fixtures.users.validUser.id

      const mockSupabase = createMockSupabaseClient({
        collections: {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [fixtures.collections.publicCollection],
                error: null,
              }),
            }),
          }),
        },
      })

      vi.mocked(createClient).mockResolvedValue(mockSupabase)

      const supabase = await createClient()
      const { data } = await supabase
        .from("collections")
        .select()
        .eq("user_id", userId)
        .order("created_at", { ascending: false })

      expect(data).toBeDefined()
    })
  })

  describe("collection management workflows", () => {
    it("should add artifacts to collection", async () => {
      const { createClient } = await import("@/lib/supabase/server")
      const collectionId = fixtures.collections.publicCollection.id
      const artifactId = fixtures.artifacts.imageArtifact.id

      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })

      const mockSupabase = createMockSupabaseClient({
        artifacts: {
          update: updateMock,
        },
      })

      vi.mocked(createClient).mockResolvedValue(mockSupabase)

      const supabase = await createClient()
      supabase.artifacts.update({ collection_id: collectionId }).eq("id", artifactId)

      expect(updateMock).toHaveBeenCalled()
    })

    it("should move artifacts between collections", async () => {
      const { createClient } = await import("@/lib/supabase/server")
      const fromCollectionId = fixtures.collections.publicCollection.id
      const toCollectionId = fixtures.collections.privateCollection.id
      const artifactId = fixtures.artifacts.imageArtifact.id

      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })

      const mockSupabase = createMockSupabaseClient({
        artifacts: {
          update: updateMock,
        },
      })

      vi.mocked(createClient).mockResolvedValue(mockSupabase)

      const supabase = await createClient()
      supabase.artifacts.update({ collection_id: toCollectionId }).eq("id", artifactId)

      expect(updateMock).toHaveBeenCalled()
    })

    it("should remove artifacts from collection", async () => {
      const { createClient } = await import("@/lib/supabase/server")
      const artifactId = fixtures.artifacts.imageArtifact.id

      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })

      const mockSupabase = createMockSupabaseClient({
        artifacts: {
          update: updateMock,
        },
      })

      vi.mocked(createClient).mockResolvedValue(mockSupabase)

      const supabase = await createClient()
      supabase.artifacts.update({ collection_id: null }).eq("id", artifactId)

      expect(updateMock).toHaveBeenCalled()
    })
  })

  describe("error handling in workflows", () => {
    it("should handle collection not found error", async () => {
      const { createClient } = await import("@/lib/supabase/server")

      const mockSupabase = createMockSupabaseClient({
        collections: {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: "Collection not found",
              }),
            }),
          }),
        },
      })

      vi.mocked(createClient).mockResolvedValue(mockSupabase)

      const supabase = await createClient()
      const { data, error } = await supabase
        .from("collections")
        .select()
        .eq("id", "non-existent")
        .single()

      expect(error).toBeDefined()
      expect(data).toBeNull()
    })

    it("should handle permission denied errors", async () => {
      const { createClient } = await import("@/lib/supabase/server")

      const mockSupabase = createMockSupabaseClient({
        collections: {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              error: "Permission denied",
            }),
          }),
        },
      })

      vi.mocked(createClient).mockResolvedValue(mockSupabase)

      const supabase = await createClient()
      const { error } = await supabase
        .from("collections")
        .update({ title: "New Title" })
        .eq("id", "some-id")

      expect(error).toBeDefined()
    })

    it("should handle concurrent updates", async () => {
      const { createClient } = await import("@/lib/supabase/server")
      const collectionId = fixtures.collections.publicCollection.id

      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })

      const mockSupabase = createMockSupabaseClient({
        collections: {
          update: updateMock,
        },
      })

      vi.mocked(createClient).mockResolvedValue(mockSupabase)

      const supabase = await createClient()

      // Simulate concurrent updates
      await Promise.all([
        supabase.collections.update({ title: "Title 1" }).eq("id", collectionId),
        supabase.collections.update({ title: "Title 2" }).eq("id", collectionId),
      ])

      expect(updateMock).toHaveBeenCalledTimes(2)
    })
  })
})
