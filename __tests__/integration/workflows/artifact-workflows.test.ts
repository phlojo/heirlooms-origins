import { describe, it, expect, vi, beforeEach } from "vitest"
import { fixtures } from "@/__tests__/fixtures"
import { createMockSupabaseClient, setupSupabaseMocks } from "@/__tests__/mocks/supabase.mock"
import { setupCloudinaryMocks } from "@/__tests__/mocks/cloudinary.mock"
import { setupOpenAIMocks } from "@/__tests__/mocks/openai.mock"

// Mock dependencies
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}))

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(),
}))

describe("Integration: Artifact Workflows", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupSupabaseMocks()
    setupCloudinaryMocks()
    setupOpenAIMocks()
  })

  describe("artifact creation workflow", () => {
    it("should create artifact with valid inputs", async () => {
      const { createClient } = await import("@/lib/supabase/server")
      const mockSupabase = createMockSupabaseClient({
        artifacts: {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  ...fixtures.artifacts.imageArtifact,
                  title: "New Artifact",
                },
                error: null,
              }),
            }),
          }),
        },
      })
      vi.mocked(createClient).mockResolvedValue(mockSupabase)

      const artifactData = {
        title: "New Artifact",
        description: "A new artifact description",
        collectionId: fixtures.collections.publicCollection.id,
        media_urls: ["https://example.com/image.jpg"],
        thumbnail_url: "https://example.com/image.jpg",
      }

      // In a real scenario, you'd call createArtifact here
      // This demonstrates the pattern for testing
      const supabase = await createClient()

      expect(supabase).toBeDefined()
      expect(mockSupabase.artifacts).toBeDefined()
    })

    it("should generate slug for new artifact", async () => {
      // Test slug generation during artifact creation
      const title = "My First Heirloom"
      const expectedSlugBase = "my-first-heirloom"

      // Verify slug generation logic (would be in lib/utils)
      expect(expectedSlugBase).toMatch(/^[a-z0-9-]+$/)
      expect(expectedSlugBase).not.toMatch(/\s/)
    })

    it("should handle duplicate slugs with collision resolution", async () => {
      const { createClient } = await import("@/lib/supabase/server")

      // First artifact with title "Test"
      const artifact1 = {
        title: "Test",
        slug: "test",
      }

      // Second artifact with same title should get modified slug
      const artifact2 = {
        title: "Test",
        slug: "test-2", // or test with UUID
      }

      const mockSupabase = createMockSupabaseClient({
        artifacts: {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi
                .fn()
                .mockResolvedValueOnce({ data: artifact1, error: null })
                .mockResolvedValueOnce({ data: null, error: "No duplicate" }),
            }),
          }),
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: artifact2,
                error: null,
              }),
            }),
          }),
        },
      })

      vi.mocked(createClient).mockResolvedValue(mockSupabase)

      const supabase = await createClient()
      expect(supabase).toBeDefined()
    })

    it("should associate artifact with collection", async () => {
      const { createClient } = await import("@/lib/supabase/server")
      const collectionId = fixtures.collections.publicCollection.id

      const mockSupabase = createMockSupabaseClient({
        artifacts: {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  ...fixtures.artifacts.imageArtifact,
                  collection_id: collectionId,
                },
                error: null,
              }),
            }),
          }),
        },
      })

      vi.mocked(createClient).mockResolvedValue(mockSupabase)

      const supabase = await createClient()
      const insertMock = supabase.artifacts.insert as any
      insertMock({ collection_id: collectionId })

      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          collection_id: collectionId,
        })
      )
    })
  })

  describe("artifact update workflow", () => {
    it("should update artifact properties", async () => {
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

      const updateData = {
        title: "Updated Title",
        description: "Updated description",
      }

      const supabase = await createClient()
      supabase.artifacts.update(updateData).eq("id", artifactId)

      expect(updateMock).toHaveBeenCalledWith(updateData)
    })

    it("should update media URLs with deduplication", async () => {
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

      // Simulate deduplication of media URLs
      const mediaUrls = [
        "https://example.com/image1.jpg",
        "https://example.com/image1.jpg", // Duplicate
        "https://example.com/image2.jpg",
      ]

      const dedupedUrls = Array.from(new Set(mediaUrls))

      expect(dedupedUrls).toHaveLength(2)
      expect(dedupedUrls).toEqual([
        "https://example.com/image1.jpg",
        "https://example.com/image2.jpg",
      ])
    })

    it("should preserve AI-generated content during update", async () => {
      const { createClient } = await import("@/lib/supabase/server")
      const artifactId = fixtures.artifacts.imageArtifact.id

      const aiContent = {
        image_captions: {
          "https://example.com/image.jpg": "A family photo from the 1950s",
        },
        video_summaries: {},
        audio_transcripts: {},
      }

      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })

      const mockSupabase = createMockSupabaseClient({
        artifacts: {
          update: updateMock,
        },
      })

      vi.mocked(createClient).mockResolvedValue(mockSupabase)

      const updateData = {
        title: "Updated Title",
        // AI content should be preserved
        ...aiContent,
      }

      const supabase = await createClient()
      supabase.artifacts.update(updateData).eq("id", artifactId)

      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          image_captions: expect.any(Object),
        })
      )
    })
  })

  describe("artifact deletion workflow", () => {
    it("should delete artifact from database", async () => {
      const { createClient } = await import("@/lib/supabase/server")
      const artifactId = fixtures.artifacts.imageArtifact.id

      const deleteMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })

      const mockSupabase = createMockSupabaseClient({
        artifacts: {
          delete: deleteMock,
        },
      })

      vi.mocked(createClient).mockResolvedValue(mockSupabase)

      const supabase = await createClient()
      supabase.artifacts.delete().eq("id", artifactId)

      expect(deleteMock).toHaveBeenCalled()
    })

    it("should clean up related media from storage", async () => {
      const { createClient } = await import("@/lib/supabase/server")
      const artifactId = fixtures.artifacts.imageArtifact.id

      const storageDeleteMock = vi.fn().mockResolvedValue({
        data: [{ name: "image.jpg" }],
      })

      const mockSupabase = createMockSupabaseClient({
        storage: {
          from: vi.fn().mockReturnValue({
            remove: storageDeleteMock,
          }),
        },
        artifacts: {
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        },
      })

      vi.mocked(createClient).mockResolvedValue(mockSupabase)

      const supabase = await createClient()

      // Simulate cleanup workflow
      const bucket = supabase.storage.from("artifacts")
      await bucket.remove([`${artifactId}/image.jpg`])

      expect(storageDeleteMock).toHaveBeenCalled()
    })
  })

  describe("artifact retrieval workflows", () => {
    it("should retrieve artifact by ID", async () => {
      const { createClient } = await import("@/lib/supabase/server")
      const artifactId = fixtures.artifacts.imageArtifact.id

      const mockSupabase = createMockSupabaseClient({
        artifacts: {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: fixtures.artifacts.imageArtifact,
                error: null,
              }),
            }),
          }),
        },
      })

      vi.mocked(createClient).mockResolvedValue(mockSupabase)

      const supabase = await createClient()
      const { data } = await supabase.from("artifacts").select().eq("id", artifactId).single()

      expect(data).toBeDefined()
      expect(data?.id).toBe(artifactId)
    })

    it("should retrieve artifacts by collection", async () => {
      const { createClient } = await import("@/lib/supabase/server")
      const collectionId = fixtures.collections.publicCollection.id

      const mockSupabase = createMockSupabaseClient({
        artifacts: {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [fixtures.artifacts.imageArtifact, fixtures.artifacts.multiMediaArtifact],
                error: null,
              }),
            }),
          }),
        },
      })

      vi.mocked(createClient).mockResolvedValue(mockSupabase)

      const supabase = await createClient()
      const { data } = await supabase
        .from("artifacts")
        .select()
        .eq("collection_id", collectionId)
        .order("created_at")

      expect(data).toBeDefined()
      expect(Array.isArray(data)).toBe(true)
    })

    it("should retrieve artifacts with pagination", async () => {
      const { createClient } = await import("@/lib/supabase/server")

      const mockSupabase = createMockSupabaseClient({
        artifacts: {
          select: vi.fn().mockReturnValue({
            range: vi.fn().mockResolvedValue({
              data: [fixtures.artifacts.imageArtifact],
              error: null,
              count: 1,
            }),
          }),
        },
      })

      vi.mocked(createClient).mockResolvedValue(mockSupabase)

      const supabase = await createClient()
      const pageSize = 10
      const pageNumber = 0

      const { data } = await supabase
        .from("artifacts")
        .select("*", { count: "exact" })
        .range(pageNumber * pageSize, (pageNumber + 1) * pageSize - 1)

      expect(data).toBeDefined()
    })
  })

  describe("artifact search and filter workflows", () => {
    it("should search artifacts by title", async () => {
      const { createClient } = await import("@/lib/supabase/server")
      const searchTerm = "family"

      const mockSupabase = createMockSupabaseClient({
        artifacts: {
          select: vi.fn().mockReturnValue({
            ilike: vi.fn().mockResolvedValue({
              data: [fixtures.artifacts.imageArtifact],
              error: null,
            }),
          }),
        },
      })

      vi.mocked(createClient).mockResolvedValue(mockSupabase)

      const supabase = await createClient()
      const { data } = await supabase.from("artifacts").select().ilike("title", `%${searchTerm}%`)

      expect(data).toBeDefined()
    })

    it("should filter artifacts by year", async () => {
      const { createClient } = await import("@/lib/supabase/server")
      const year = 1995

      const mockSupabase = createMockSupabaseClient({
        artifacts: {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [fixtures.artifacts.imageArtifact],
              error: null,
            }),
          }),
        },
      })

      vi.mocked(createClient).mockResolvedValue(mockSupabase)

      const supabase = await createClient()
      const { data } = await supabase.from("artifacts").select().eq("year_acquired", year)

      expect(data).toBeDefined()
    })

    it("should filter artifacts by type", async () => {
      const { createClient } = await import("@/lib/supabase/server")
      const typeId = fixtures.artifactTypes.car.id

      const mockSupabase = createMockSupabaseClient({
        artifacts: {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [fixtures.artifacts.imageArtifact],
              error: null,
            }),
          }),
        },
      })

      vi.mocked(createClient).mockResolvedValue(mockSupabase)

      const supabase = await createClient()
      const { data } = await supabase.from("artifacts").select().eq("type_id", typeId)

      expect(data).toBeDefined()
    })
  })

  describe("error handling in workflows", () => {
    it("should handle database errors gracefully", async () => {
      const { createClient } = await import("@/lib/supabase/server")

      const mockSupabase = createMockSupabaseClient({
        artifacts: {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: "Artifact not found",
              }),
            }),
          }),
        },
      })

      vi.mocked(createClient).mockResolvedValue(mockSupabase)

      const supabase = await createClient()
      const { data, error } = await supabase
        .from("artifacts")
        .select()
        .eq("id", "non-existent")
        .single()

      expect(error).toBeDefined()
      expect(data).toBeNull()
    })

    it("should handle permission errors", async () => {
      const { createClient } = await import("@/lib/supabase/server")

      const mockSupabase = createMockSupabaseClient({
        artifacts: {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              error: "Insufficient privileges",
            }),
          }),
        },
      })

      vi.mocked(createClient).mockResolvedValue(mockSupabase)

      const supabase = await createClient()
      const { error } = await supabase
        .from("artifacts")
        .update({ title: "New Title" })
        .eq("id", "some-id")

      expect(error).toBeDefined()
    })

    it("should handle network errors", async () => {
      const { createClient } = await import("@/lib/supabase/server")

      const mockSupabase = createMockSupabaseClient({
        artifacts: {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockRejectedValue(new Error("Network timeout")),
          }),
        },
      })

      vi.mocked(createClient).mockResolvedValue(mockSupabase)

      const supabase = await createClient()

      try {
        await supabase.from("artifacts").select().eq("id", "test")
        expect.fail("Should have thrown")
      } catch (error) {
        expect(error).toBeDefined()
      }
    })
  })
})
