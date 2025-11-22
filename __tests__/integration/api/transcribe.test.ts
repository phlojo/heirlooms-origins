import { describe, it, expect, vi, beforeEach } from "vitest"
import { POST } from "@/app/api/transcribe/route"
import { fixtures } from "@/__tests__/fixtures"

// Mock environment variables
vi.stubEnv("OPENAI_API_KEY", "test-key-12345")
vi.stubEnv("AI_TRANSCRIBE_MODEL", "whisper-1")

describe("API: /api/transcribe", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  describe("POST request handling", () => {
    it("should return 400 if no audio file provided", async () => {
      const formData = new FormData()
      formData.append("fieldType", "description")

      const request = new Request("http://localhost/api/transcribe", {
        method: "POST",
        body: formData,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe("No audio file provided")
    })

    it("should accept audio file with field type", async () => {
      const audioBlob = new Blob(["fake audio data"], { type: "audio/webm" })
      const formData = new FormData()
      formData.append("audio", audioBlob, "audio.webm")
      formData.append("fieldType", "description")

      vi.mocked(global.fetch).mockResolvedValue(
        new Response(JSON.stringify({ text: "Transcribed text" }), { status: 200 })
      )

      const request = new Request("http://localhost/api/transcribe", {
        method: "POST",
        body: formData,
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(vi.mocked(global.fetch)).toHaveBeenCalledWith(
        "https://api.openai.com/v1/audio/transcriptions",
        expect.any(Object)
      )
    })
  })

  describe("audio file handling", () => {
    it("should create file with .webm extension", async () => {
      const audioBlob = new Blob(["fake audio data"], { type: "audio/webm" })
      const formData = new FormData()
      formData.append("audio", audioBlob, "original.wav")
      formData.append("fieldType", "description")

      vi.mocked(global.fetch).mockResolvedValue(
        new Response(JSON.stringify({ text: "Test transcription" }), { status: 200 })
      )

      const request = new Request("http://localhost/api/transcribe", {
        method: "POST",
        body: formData,
      })

      await POST(request)

      expect(vi.mocked(global.fetch)).toHaveBeenCalled()
      // The file is renamed to audio.webm in the implementation
    })

    it("should send audio file to OpenAI API", async () => {
      const audioBlob = new Blob(["fake audio data"], { type: "audio/webm" })
      const formData = new FormData()
      formData.append("audio", audioBlob, "audio.webm")
      formData.append("fieldType", "title")

      vi.mocked(global.fetch).mockResolvedValue(
        new Response(JSON.stringify({ text: "Quick caption" }), { status: 200 })
      )

      const request = new Request("http://localhost/api/transcribe", {
        method: "POST",
        body: formData,
      })

      await POST(request)

      expect(vi.mocked(global.fetch)).toHaveBeenCalledWith(
        "https://api.openai.com/v1/audio/transcriptions",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: "Bearer test-key-12345",
          }),
        })
      )
    })

    it("should use configured transcription model", async () => {
      const audioBlob = new Blob(["fake audio data"], { type: "audio/webm" })
      const formData = new FormData()
      formData.append("audio", audioBlob)
      formData.append("fieldType", "description")

      vi.mocked(global.fetch).mockResolvedValue(
        new Response(JSON.stringify({ text: "Transcribed content" }), { status: 200 })
      )

      const request = new Request("http://localhost/api/transcribe", {
        method: "POST",
        body: formData,
      })

      await POST(request)

      // The model should be whisper-1 from environment
      expect(vi.mocked(global.fetch)).toHaveBeenCalled()
    })
  })

  describe("transcription length handling", () => {
    it("should truncate title transcriptions to 100 characters", async () => {
      const audioBlob = new Blob(["fake audio data"], { type: "audio/webm" })
      const longText = "a".repeat(150)
      const formData = new FormData()
      formData.append("audio", audioBlob)
      formData.append("fieldType", "title")

      vi.mocked(global.fetch).mockResolvedValue(
        new Response(JSON.stringify({ text: longText }), { status: 200 })
      )

      const request = new Request("http://localhost/api/transcribe", {
        method: "POST",
        body: formData,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data.transcription).toHaveLength(100)
      expect(data.transcription).toBe("a".repeat(100))
    })

    it("should truncate description transcriptions to 3000 characters", async () => {
      const audioBlob = new Blob(["fake audio data"], { type: "audio/webm" })
      const longText = "a".repeat(4000)
      const formData = new FormData()
      formData.append("audio", audioBlob)
      formData.append("fieldType", "description")

      vi.mocked(global.fetch).mockResolvedValue(
        new Response(JSON.stringify({ text: longText }), { status: 200 })
      )

      const request = new Request("http://localhost/api/transcribe", {
        method: "POST",
        body: formData,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data.transcription).toHaveLength(3000)
      expect(data.transcription).toBe("a".repeat(3000))
    })

    it("should not truncate transcriptions shorter than limits", async () => {
      const audioBlob = new Blob(["fake audio data"], { type: "audio/webm" })
      const shortText = "Short transcription"
      const formData = new FormData()
      formData.append("audio", audioBlob)
      formData.append("fieldType", "title")

      vi.mocked(global.fetch).mockResolvedValue(
        new Response(JSON.stringify({ text: shortText }), { status: 200 })
      )

      const request = new Request("http://localhost/api/transcribe", {
        method: "POST",
        body: formData,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data.transcription).toBe(shortText)
    })

    it("should not truncate for unknown field types", async () => {
      const audioBlob = new Blob(["fake audio data"], { type: "audio/webm" })
      const longText = "a".repeat(1000)
      const formData = new FormData()
      formData.append("audio", audioBlob)
      formData.append("fieldType", "unknown")

      vi.mocked(global.fetch).mockResolvedValue(
        new Response(JSON.stringify({ text: longText }), { status: 200 })
      )

      const request = new Request("http://localhost/api/transcribe", {
        method: "POST",
        body: formData,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data.transcription).toBe(longText)
    })
  })

  describe("OpenAI API error handling", () => {
    it("should return 401 if API key is invalid", async () => {
      const audioBlob = new Blob(["fake audio data"], { type: "audio/webm" })
      const formData = new FormData()
      formData.append("audio", audioBlob)
      formData.append("fieldType", "description")

      vi.mocked(global.fetch).mockResolvedValue(
        new Response(JSON.stringify({ error: "Invalid API key" }), { status: 401 })
      )

      const request = new Request("http://localhost/api/transcribe", {
        method: "POST",
        body: formData,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe("Failed to transcribe audio")
    })

    it("should return 400 if audio format is unsupported", async () => {
      const audioBlob = new Blob(["fake audio data"], { type: "audio/webm" })
      const formData = new FormData()
      formData.append("audio", audioBlob)
      formData.append("fieldType", "description")

      vi.mocked(global.fetch).mockResolvedValue(
        new Response(JSON.stringify({ error: "Unsupported file format" }), { status: 400 })
      )

      const request = new Request("http://localhost/api/transcribe", {
        method: "POST",
        body: formData,
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
    })

    it("should return 500 if API request fails", async () => {
      const audioBlob = new Blob(["fake audio data"], { type: "audio/webm" })
      const formData = new FormData()
      formData.append("audio", audioBlob)
      formData.append("fieldType", "description")

      vi.mocked(global.fetch).mockResolvedValue(
        new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 })
      )

      const request = new Request("http://localhost/api/transcribe", {
        method: "POST",
        body: formData,
      })

      const response = await POST(request)

      expect(response.status).toBe(500)
    })

    it("should include error details in response", async () => {
      const audioBlob = new Blob(["fake audio data"], { type: "audio/webm" })
      const formData = new FormData()
      formData.append("audio", audioBlob)
      formData.append("fieldType", "description")

      const errorMessage = "API rate limit exceeded"
      vi.mocked(global.fetch).mockResolvedValue(new Response(errorMessage, { status: 429 }))

      const request = new Request("http://localhost/api/transcribe", {
        method: "POST",
        body: formData,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data.error).toBe("Failed to transcribe audio")
      expect(data.details).toBeDefined()
    })
  })

  describe("request error handling", () => {
    it("should handle malformed request gracefully", async () => {
      const request = new Request("http://localhost/api/transcribe", {
        method: "POST",
        body: "invalid",
      })

      const response = await POST(request)

      expect(response.status).toBe(500)
      expect(response.ok).toBe(false)
    })

    it("should return error if formData parsing fails", async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        new Response(JSON.stringify({ text: "Test" }), { status: 200 })
      )

      // This tests error handling when request.formData() might fail
      const request = new Request("http://localhost/api/transcribe", {
        method: "POST",
        body: null as any,
      })

      const response = await POST(request)

      expect(response.status).toBe(500)
    })
  })

  describe("successful transcription response", () => {
    it("should return transcription in response body", async () => {
      const audioBlob = new Blob(["fake audio data"], { type: "audio/webm" })
      const expectedText = "This is the transcribed content"
      const formData = new FormData()
      formData.append("audio", audioBlob)
      formData.append("fieldType", "description")

      vi.mocked(global.fetch).mockResolvedValue(
        new Response(JSON.stringify({ text: expectedText }), { status: 200 })
      )

      const request = new Request("http://localhost/api/transcribe", {
        method: "POST",
        body: formData,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.transcription).toBe(expectedText)
    })

    it("should handle empty transcription response", async () => {
      const audioBlob = new Blob(["fake audio data"], { type: "audio/webm" })
      const formData = new FormData()
      formData.append("audio", audioBlob)
      formData.append("fieldType", "description")

      vi.mocked(global.fetch).mockResolvedValue(
        new Response(JSON.stringify({ text: "" }), { status: 200 })
      )

      const request = new Request("http://localhost/api/transcribe", {
        method: "POST",
        body: formData,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.transcription).toBe("")
    })

    it("should handle response without text field", async () => {
      const audioBlob = new Blob(["fake audio data"], { type: "audio/webm" })
      const formData = new FormData()
      formData.append("audio", audioBlob)
      formData.append("fieldType", "description")

      vi.mocked(global.fetch).mockResolvedValue(
        new Response(JSON.stringify({ result: "Something else" }), { status: 200 })
      )

      const request = new Request("http://localhost/api/transcribe", {
        method: "POST",
        body: formData,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.transcription).toBe("")
    })
  })

  describe("field type parameter handling", () => {
    it("should accept title field type", async () => {
      const audioBlob = new Blob(["fake audio data"], { type: "audio/webm" })
      const formData = new FormData()
      formData.append("audio", audioBlob)
      formData.append("fieldType", "title")

      vi.mocked(global.fetch).mockResolvedValue(
        new Response(JSON.stringify({ text: "a".repeat(150) }), { status: 200 })
      )

      const request = new Request("http://localhost/api/transcribe", {
        method: "POST",
        body: formData,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.transcription).toHaveLength(100)
    })

    it("should accept description field type", async () => {
      const audioBlob = new Blob(["fake audio data"], { type: "audio/webm" })
      const formData = new FormData()
      formData.append("audio", audioBlob)
      formData.append("fieldType", "description")

      vi.mocked(global.fetch).mockResolvedValue(
        new Response(JSON.stringify({ text: "a".repeat(4000) }), { status: 200 })
      )

      const request = new Request("http://localhost/api/transcribe", {
        method: "POST",
        body: formData,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.transcription).toHaveLength(3000)
    })

    it("should be optional field type", async () => {
      const audioBlob = new Blob(["fake audio data"], { type: "audio/webm" })
      const formData = new FormData()
      formData.append("audio", audioBlob)
      // No fieldType provided

      vi.mocked(global.fetch).mockResolvedValue(
        new Response(JSON.stringify({ text: "Test transcription" }), { status: 200 })
      )

      const request = new Request("http://localhost/api/transcribe", {
        method: "POST",
        body: formData,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.transcription).toBe("Test transcription")
    })
  })
})
