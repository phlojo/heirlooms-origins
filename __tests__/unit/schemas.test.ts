import { describe, it, expect } from "vitest"
import { createArtifactSchema, updateArtifactSchema } from "@/lib/schemas"
import { fixtures } from "@/__tests__/fixtures"

describe("Artifact Schemas", () => {
  describe("createArtifactSchema", () => {
    describe("title validation", () => {
      it("should accept valid title", () => {
        const input = {
          ...fixtures.forms.validCreateArtifactInput,
          title: "My Artifact",
        }

        const result = createArtifactSchema.safeParse(input)

        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data.title).toBe("My Artifact")
        }
      })

      it("should reject empty title", () => {
        const input = {
          ...fixtures.forms.validCreateArtifactInput,
          title: "",
        }

        const result = createArtifactSchema.safeParse(input)

        expect(result.success).toBe(false)
      })

      it("should reject title with only whitespace", () => {
        const input = {
          ...fixtures.forms.validCreateArtifactInput,
          title: "   ",
        }

        const result = createArtifactSchema.safeParse(input)

        expect(result.success).toBe(false)
      })

      it("should reject title longer than 200 characters", () => {
        const input = {
          ...fixtures.forms.validCreateArtifactInput,
          title: "a".repeat(201),
        }

        const result = createArtifactSchema.safeParse(input)

        expect(result.success).toBe(false)
      })

      it("should accept title at max length (200)", () => {
        const input = {
          ...fixtures.forms.validCreateArtifactInput,
          title: "a".repeat(200),
        }

        const result = createArtifactSchema.safeParse(input)

        expect(result.success).toBe(true)
      })

      it("should accept title with special characters", () => {
        const input = {
          ...fixtures.forms.validCreateArtifactInput,
          title: "My Artifact (1980's) & Things!",
        }

        const result = createArtifactSchema.safeParse(input)

        expect(result.success).toBe(true)
      })

      it("should accept title with unicode characters", () => {
        const input = {
          ...fixtures.forms.validCreateArtifactInput,
          title: "My Artifact café 日本 🎨",
        }

        const result = createArtifactSchema.safeParse(input)

        expect(result.success).toBe(true)
      })
    })

    describe("description validation", () => {
      it("should accept valid description", () => {
        const input = {
          ...fixtures.forms.validCreateArtifactInput,
          description: "This is a detailed description of my artifact.",
        }

        const result = createArtifactSchema.safeParse(input)

        expect(result.success).toBe(true)
      })

      it("should accept empty description", () => {
        const input = {
          ...fixtures.forms.validCreateArtifactInput,
          description: "",
        }

        const result = createArtifactSchema.safeParse(input)

        expect(result.success).toBe(true)
      })

      it("should accept null description", () => {
        const input = {
          ...fixtures.forms.validCreateArtifactInput,
          description: null,
        }

        const result = createArtifactSchema.safeParse(input)

        expect(result.success).toBe(true)
      })

      it("should accept description at max length (2000)", () => {
        const input = {
          ...fixtures.forms.validCreateArtifactInput,
          description: "a".repeat(2000),
        }

        const result = createArtifactSchema.safeParse(input)

        expect(result.success).toBe(true)
      })

      it("should reject description longer than 2000 characters", () => {
        const input = {
          ...fixtures.forms.validCreateArtifactInput,
          description: "a".repeat(2001),
        }

        const result = createArtifactSchema.safeParse(input)

        expect(result.success).toBe(false)
      })
    })

    describe("collectionId validation", () => {
      it("should accept valid UUID", () => {
        const input = {
          ...fixtures.forms.validCreateArtifactInput,
          collectionId: "550e8400-e29b-41d4-a716-446655440000",
        }

        const result = createArtifactSchema.safeParse(input)

        expect(result.success).toBe(true)
      })

      it("should reject empty collectionId", () => {
        const input = {
          ...fixtures.forms.validCreateArtifactInput,
          collectionId: "",
        }

        const result = createArtifactSchema.safeParse(input)

        expect(result.success).toBe(false)
      })

      it("should reject invalid UUID format", () => {
        const input = {
          ...fixtures.forms.validCreateArtifactInput,
          collectionId: "not-a-uuid",
        }

        const result = createArtifactSchema.safeParse(input)

        expect(result.success).toBe(false)
      })

      it("should reject null collectionId", () => {
        const input = {
          ...fixtures.forms.validCreateArtifactInput,
          collectionId: null,
        }

        const result = createArtifactSchema.safeParse(input)

        expect(result.success).toBe(false)
      })
    })

    describe("year_acquired validation", () => {
      it("should accept valid year", () => {
        const input = {
          ...fixtures.forms.validCreateArtifactInput,
          year_acquired: 1995,
        }

        const result = createArtifactSchema.safeParse(input)

        expect(result.success).toBe(true)
      })

      it("should accept null year_acquired", () => {
        const input = {
          ...fixtures.forms.validCreateArtifactInput,
          year_acquired: null,
        }

        const result = createArtifactSchema.safeParse(input)

        expect(result.success).toBe(true)
      })

      it("should reject year before 1000", () => {
        const input = {
          ...fixtures.forms.validCreateArtifactInput,
          year_acquired: 999,
        }

        const result = createArtifactSchema.safeParse(input)

        expect(result.success).toBe(false)
      })

      it("should reject year in future", () => {
        const input = {
          ...fixtures.forms.validCreateArtifactInput,
          year_acquired: new Date().getFullYear() + 1,
        }

        const result = createArtifactSchema.safeParse(input)

        expect(result.success).toBe(false)
      })

      it("should accept current year", () => {
        const input = {
          ...fixtures.forms.validCreateArtifactInput,
          year_acquired: new Date().getFullYear(),
        }

        const result = createArtifactSchema.safeParse(input)

        expect(result.success).toBe(true)
      })

      it("should reject non-integer year", () => {
        const input = {
          ...fixtures.forms.validCreateArtifactInput,
          year_acquired: 1995.5,
        }

        const result = createArtifactSchema.safeParse(input)

        expect(result.success).toBe(false)
      })
    })

    describe("origin validation", () => {
      it("should accept valid origin", () => {
        const input = {
          ...fixtures.forms.validCreateArtifactInput,
          origin: "Estate Sale",
        }

        const result = createArtifactSchema.safeParse(input)

        expect(result.success).toBe(true)
      })

      it("should accept null origin", () => {
        const input = {
          ...fixtures.forms.validCreateArtifactInput,
          origin: null,
        }

        const result = createArtifactSchema.safeParse(input)

        expect(result.success).toBe(true)
      })

      it("should accept empty origin", () => {
        const input = {
          ...fixtures.forms.validCreateArtifactInput,
          origin: "",
        }

        const result = createArtifactSchema.safeParse(input)

        expect(result.success).toBe(true)
      })

      it("should reject origin longer than 200 characters", () => {
        const input = {
          ...fixtures.forms.validCreateArtifactInput,
          origin: "a".repeat(201),
        }

        const result = createArtifactSchema.safeParse(input)

        expect(result.success).toBe(false)
      })
    })

    describe("media_urls validation", () => {
      it("should accept single media URL", () => {
        const input = {
          ...fixtures.forms.validCreateArtifactInput,
          media_urls: ["https://example.com/image.jpg"],
        }

        const result = createArtifactSchema.safeParse(input)

        expect(result.success).toBe(true)
      })

      it("should accept multiple media URLs", () => {
        const input = {
          ...fixtures.forms.validCreateArtifactInput,
          media_urls: [
            "https://example.com/image1.jpg",
            "https://example.com/image2.jpg",
            "https://example.com/video.mp4",
          ],
        }

        const result = createArtifactSchema.safeParse(input)

        expect(result.success).toBe(true)
      })

      it("should accept empty array of media URLs", () => {
        const input = {
          ...fixtures.forms.validCreateArtifactInput,
          media_urls: [],
        }

        const result = createArtifactSchema.safeParse(input)

        expect(result.success).toBe(true)
      })

      it("should accept null media_urls", () => {
        const input = {
          ...fixtures.forms.validCreateArtifactInput,
          media_urls: null,
        }

        const result = createArtifactSchema.safeParse(input)

        expect(result.success).toBe(true)
      })

      it("should reject invalid URL", () => {
        const input = {
          ...fixtures.forms.validCreateArtifactInput,
          media_urls: ["not a url"],
        }

        const result = createArtifactSchema.safeParse(input)

        expect(result.success).toBe(false)
      })

      it("should accept cloudinary URLs", () => {
        const input = {
          ...fixtures.forms.validCreateArtifactInput,
          media_urls: [fixtures.cloudinary.imageUrl],
        }

        const result = createArtifactSchema.safeParse(input)

        expect(result.success).toBe(true)
      })
    })

    describe("thumbnail_url validation", () => {
      it("should accept valid thumbnail URL", () => {
        const input = {
          ...fixtures.forms.validCreateArtifactInput,
          thumbnail_url: "https://example.com/thumb.jpg",
        }

        const result = createArtifactSchema.safeParse(input)

        expect(result.success).toBe(true)
      })

      it("should accept null thumbnail_url", () => {
        const input = {
          ...fixtures.forms.validCreateArtifactInput,
          thumbnail_url: null,
        }

        const result = createArtifactSchema.safeParse(input)

        expect(result.success).toBe(true)
      })

      it("should reject invalid URL", () => {
        const input = {
          ...fixtures.forms.validCreateArtifactInput,
          thumbnail_url: "not a url",
        }

        const result = createArtifactSchema.safeParse(input)

        expect(result.success).toBe(false)
      })
    })

    describe("type_id validation", () => {
      it("should accept valid type UUID", () => {
        const input = {
          ...fixtures.forms.validCreateArtifactInput,
          type_id: "550e8400-e29b-41d4-a716-446655440000",
        }

        const result = createArtifactSchema.safeParse(input)

        expect(result.success).toBe(true)
      })

      it("should accept null type_id", () => {
        const input = {
          ...fixtures.forms.validCreateArtifactInput,
          type_id: null,
        }

        const result = createArtifactSchema.safeParse(input)

        expect(result.success).toBe(true)
      })

      it("should reject invalid UUID", () => {
        const input = {
          ...fixtures.forms.validCreateArtifactInput,
          type_id: "invalid-uuid",
        }

        const result = createArtifactSchema.safeParse(input)

        expect(result.success).toBe(false)
      })
    })

    describe("AI content fields", () => {
      it("should accept image_captions", () => {
        const input = {
          ...fixtures.forms.validCreateArtifactInput,
          image_captions: {
            "https://example.com/image.jpg": "A test caption",
          },
        }

        const result = createArtifactSchema.safeParse(input)

        expect(result.success).toBe(true)
      })

      it("should accept video_summaries", () => {
        const input = {
          ...fixtures.forms.validCreateArtifactInput,
          video_summaries: {
            "https://example.com/video.mp4": "A test summary",
          },
        }

        const result = createArtifactSchema.safeParse(input)

        expect(result.success).toBe(true)
      })

      it("should accept audio_transcripts", () => {
        const input = {
          ...fixtures.forms.validCreateArtifactInput,
          audio_transcripts: {
            "https://example.com/audio.mp3": "Full transcript",
          },
        }

        const result = createArtifactSchema.safeParse(input)

        expect(result.success).toBe(true)
      })

      it("should accept null AI fields", () => {
        const input = {
          ...fixtures.forms.validCreateArtifactInput,
          image_captions: null,
          video_summaries: null,
          audio_transcripts: null,
        }

        const result = createArtifactSchema.safeParse(input)

        expect(result.success).toBe(true)
      })
    })

    describe("complete artifact creation", () => {
      it("should accept fully populated valid artifact", () => {
        const input = {
          title: "Complete Test Artifact",
          description: "A detailed description",
          collectionId: "550e8400-e29b-41d4-a716-446655440000",
          year_acquired: 1985,
          origin: "Estate Sale",
          media_urls: ["https://example.com/image.jpg", "https://example.com/video.mp4"],
          thumbnail_url: "https://example.com/image.jpg",
          type_id: "550e8400-e29b-41d4-a716-446655440001",
          image_captions: {
            "https://example.com/image.jpg": "Family photo",
          },
          video_summaries: {
            "https://example.com/video.mp4": "Wedding ceremony",
          },
          audio_transcripts: {},
        }

        const result = createArtifactSchema.safeParse(input)

        expect(result.success).toBe(true)
      })

      it("should accept minimal valid artifact (required fields only)", () => {
        const input = {
          title: "Minimal Artifact",
          collectionId: "550e8400-e29b-41d4-a716-446655440000",
        }

        const result = createArtifactSchema.safeParse(input)

        expect(result.success).toBe(true)
      })
    })
  })

  describe("updateArtifactSchema", () => {
    it("should accept artifact update", () => {
      const input = {
        id: "550e8400-e29b-41d4-a716-446655440000",
        title: "Updated Title",
        description: "Updated description",
      }

      const result = updateArtifactSchema.safeParse(input)

      expect(result.success).toBe(true)
    })

    it("should validate same rules as createArtifactSchema for common fields", () => {
      const input = {
        id: "550e8400-e29b-41d4-a716-446655440000",
        title: "a".repeat(201), // Too long
      }

      const result = updateArtifactSchema.safeParse(input)

      expect(result.success).toBe(false)
    })

    it("should accept partial updates", () => {
      const input = {
        id: "550e8400-e29b-41d4-a716-446655440000",
        title: "Only updating title",
      }

      const result = updateArtifactSchema.safeParse(input)

      expect(result.success).toBe(true)
    })
  })
})
