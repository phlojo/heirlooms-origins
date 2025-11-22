import { describe, it, expect, vi, beforeEach } from "vitest"
import { GET } from "@/app/api/cleanup-expired-uploads/route"

// Mock dependencies
vi.mock("@/lib/actions/pending-uploads", () => ({
  auditPendingUploads: vi.fn(),
}))

vi.mock("@/lib/actions/cloudinary", () => ({
  deleteCloudinaryMedia: vi.fn(),
}))

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}))

describe("API: /api/cleanup-expired-uploads", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
  })

  const createMockAuditResult = (overrides = {}) => ({
    timestamp: new Date().toISOString(),
    summary: {
      totalPendingUploads: 5,
      expiredUploads: 3,
      safeToDelete: 2,
      dangerous: 0,
      alreadyDeleted: 1,
    },
    details: {
      safeToDelete: [
        {
          url: "https://example.com/old.jpg",
          publicId: "old-id",
          userId: "user-1",
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() - 1000).toISOString(),
          existsInCloudinary: true,
          reason: "Expired",
        },
      ],
      dangerous: [],
      alreadyDeleted: [
        {
          url: "https://example.com/deleted.jpg",
          publicId: "deleted-id",
          userId: "user-1",
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() - 1000).toISOString(),
          reason: "Already deleted from Cloudinary",
        },
      ],
    },
    ...overrides,
  })

  describe("GET request handling", () => {
    it("should allow cron requests in production with header", async () => {
      const { auditPendingUploads } = await import("@/lib/actions/pending-uploads")
      const { deleteCloudinaryMedia } = await import("@/lib/actions/cloudinary")
      const { createClient } = await import("@/lib/supabase/server")

      vi.mocked(auditPendingUploads).mockResolvedValue(createMockAuditResult())
      vi.mocked(deleteCloudinaryMedia).mockResolvedValue({ success: true })
      vi.mocked(createClient).mockResolvedValue({
        from: vi.fn().mockReturnValue({
          delete: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          }),
        }),
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }),
        },
      } as any)

      vi.stubEnv("NODE_ENV", "production")

      const request = new Request("http://localhost/api/cleanup-expired-uploads", {
        method: "GET",
        headers: { "x-vercel-cron": "true" },
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.audit).toBeDefined()
      expect(data.cleanup).toBeDefined()
    })

    it("should reject requests in production without cron header", async () => {
      vi.stubEnv("NODE_ENV", "production")

      const request = new Request("http://localhost/api/cleanup-expired-uploads", {
        method: "GET",
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe("Unauthorized")
    })

    it("should allow any request in development mode", async () => {
      const { auditPendingUploads } = await import("@/lib/actions/pending-uploads")
      const { deleteCloudinaryMedia } = await import("@/lib/actions/cloudinary")
      const { createClient } = await import("@/lib/supabase/server")

      vi.mocked(auditPendingUploads).mockResolvedValue(createMockAuditResult())
      vi.mocked(deleteCloudinaryMedia).mockResolvedValue({ success: true })
      vi.mocked(createClient).mockResolvedValue({
        from: vi.fn().mockReturnValue({
          delete: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          }),
        }),
      } as any)

      vi.stubEnv("NODE_ENV", "development")

      const request = new Request("http://localhost/api/cleanup-expired-uploads", {
        method: "GET",
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })
  })

  describe("cleanup execution", () => {
    it("should call auditPendingUploads function", async () => {
      const { auditPendingUploads } = await import("@/lib/actions/pending-uploads")
      const { deleteCloudinaryMedia } = await import("@/lib/actions/cloudinary")
      const { createClient } = await import("@/lib/supabase/server")

      vi.mocked(auditPendingUploads).mockResolvedValue(createMockAuditResult())
      vi.mocked(deleteCloudinaryMedia).mockResolvedValue({ success: true })
      vi.mocked(createClient).mockResolvedValue({
        from: vi.fn().mockReturnValue({
          delete: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          }),
        }),
      } as any)

      vi.stubEnv("NODE_ENV", "development")

      const request = new Request("http://localhost/api/cleanup-expired-uploads", {
        method: "GET",
      })

      await GET(request)

      expect(vi.mocked(auditPendingUploads)).toHaveBeenCalled()
    })

    it("should return audit summary in response", async () => {
      const { auditPendingUploads } = await import("@/lib/actions/pending-uploads")
      const { deleteCloudinaryMedia } = await import("@/lib/actions/cloudinary")
      const { createClient } = await import("@/lib/supabase/server")

      vi.mocked(auditPendingUploads).mockResolvedValue(createMockAuditResult())
      vi.mocked(deleteCloudinaryMedia).mockResolvedValue({ success: true })
      vi.mocked(createClient).mockResolvedValue({
        from: vi.fn().mockReturnValue({
          delete: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          }),
        }),
      } as any)

      vi.stubEnv("NODE_ENV", "development")

      const request = new Request("http://localhost/api/cleanup-expired-uploads", {
        method: "GET",
      })

      const response = await GET(request)
      const data = await response.json()

      expect(data.audit.totalPending).toBeGreaterThanOrEqual(0)
      expect(data.audit.expiredCount).toBeGreaterThanOrEqual(0)
    })

    it("should track cleanup statistics", async () => {
      const { auditPendingUploads } = await import("@/lib/actions/pending-uploads")
      const { deleteCloudinaryMedia } = await import("@/lib/actions/cloudinary")
      const { createClient } = await import("@/lib/supabase/server")

      vi.mocked(auditPendingUploads).mockResolvedValue(createMockAuditResult())
      vi.mocked(deleteCloudinaryMedia).mockResolvedValue({ success: true })
      vi.mocked(createClient).mockResolvedValue({
        from: vi.fn().mockReturnValue({
          delete: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          }),
        }),
      } as any)

      vi.stubEnv("NODE_ENV", "development")

      const request = new Request("http://localhost/api/cleanup-expired-uploads", {
        method: "GET",
      })

      const response = await GET(request)
      const data = await response.json()

      expect(data.cleanup.deletedFromCloudinary).toBeGreaterThanOrEqual(0)
      expect(data.cleanup.deletedFromDatabase).toBeGreaterThanOrEqual(0)
      expect(typeof data.cleanup.failedDeletions).toBe("number")
    })

    it("should handle cleanup with no expired files", async () => {
      const { auditPendingUploads } = await import("@/lib/actions/pending-uploads")
      const { deleteCloudinaryMedia } = await import("@/lib/actions/cloudinary")
      const { createClient } = await import("@/lib/supabase/server")

      vi.mocked(auditPendingUploads).mockResolvedValue(
        createMockAuditResult({
          summary: {
            totalPendingUploads: 0,
            expiredUploads: 0,
            safeToDelete: 0,
            dangerous: 0,
            alreadyDeleted: 0,
          },
          details: {
            safeToDelete: [],
            dangerous: [],
            alreadyDeleted: [],
          },
        }),
      )
      vi.mocked(createClient).mockResolvedValue({
        from: vi.fn().mockReturnValue({
          delete: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          }),
        }),
      } as any)

      vi.stubEnv("NODE_ENV", "development")

      const request = new Request("http://localhost/api/cleanup-expired-uploads", {
        method: "GET",
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.cleanup.deletedFromCloudinary).toBe(0)
    })
  })

  describe("error handling", () => {
    it("should return 500 if audit fails", async () => {
      const { auditPendingUploads } = await import("@/lib/actions/pending-uploads")

      vi.mocked(auditPendingUploads).mockRejectedValue(new Error("Audit failed"))

      vi.stubEnv("NODE_ENV", "development")

      const request = new Request("http://localhost/api/cleanup-expired-uploads", {
        method: "GET",
      })

      const response = await GET(request)

      expect(response.status).toBe(500)
    })

    it("should include error message in response", async () => {
      const { auditPendingUploads } = await import("@/lib/actions/pending-uploads")

      const errorMessage = "Supabase connection failed"
      vi.mocked(auditPendingUploads).mockRejectedValue(new Error(errorMessage))

      vi.stubEnv("NODE_ENV", "development")

      const request = new Request("http://localhost/api/cleanup-expired-uploads", {
        method: "GET",
      })

      const response = await GET(request)
      const data = await response.json()

      expect(data.error).toContain("Supabase connection failed")
    })
  })

  describe("cron header handling", () => {
    it("should check for x-vercel-cron header in production", async () => {
      vi.stubEnv("NODE_ENV", "production")

      const request = new Request("http://localhost/api/cleanup-expired-uploads", {
        method: "GET",
        headers: { "x-vercel-cron": "true" },
      })

      const response = await GET(request)

      expect(response.status).not.toBe(401)
    })

    it("should reject if x-vercel-cron header missing in production", async () => {
      vi.stubEnv("NODE_ENV", "production")

      const request = new Request("http://localhost/api/cleanup-expired-uploads", {
        method: "GET",
      })

      const response = await GET(request)

      expect(response.status).toBe(401)
    })
  })

  describe("response format", () => {
    it("should return JSON response", async () => {
      const { auditPendingUploads } = await import("@/lib/actions/pending-uploads")
      const { deleteCloudinaryMedia } = await import("@/lib/actions/cloudinary")
      const { createClient } = await import("@/lib/supabase/server")

      vi.mocked(auditPendingUploads).mockResolvedValue(createMockAuditResult())
      vi.mocked(deleteCloudinaryMedia).mockResolvedValue({ success: true })
      vi.mocked(createClient).mockResolvedValue({
        from: vi.fn().mockReturnValue({
          delete: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          }),
        }),
      } as any)

      vi.stubEnv("NODE_ENV", "development")

      const request = new Request("http://localhost/api/cleanup-expired-uploads", {
        method: "GET",
      })

      const response = await GET(request)

      expect(response.headers.get("content-type")).toContain("application/json")
    })

    it("should return success flag and statistics on success", async () => {
      const { auditPendingUploads } = await import("@/lib/actions/pending-uploads")
      const { deleteCloudinaryMedia } = await import("@/lib/actions/cloudinary")
      const { createClient } = await import("@/lib/supabase/server")

      vi.mocked(auditPendingUploads).mockResolvedValue(createMockAuditResult())
      vi.mocked(deleteCloudinaryMedia).mockResolvedValue({ success: true })
      vi.mocked(createClient).mockResolvedValue({
        from: vi.fn().mockReturnValue({
          delete: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          }),
        }),
      } as any)

      vi.stubEnv("NODE_ENV", "development")

      const request = new Request("http://localhost/api/cleanup-expired-uploads", {
        method: "GET",
      })

      const response = await GET(request)
      const data = await response.json()

      expect(data.success).toBe(true)
      expect(data.audit).toBeDefined()
      expect(data.cleanup).toBeDefined()
    })
  })
})
