import { describe, it, expect } from "vitest"
import {
  isAudioUrl,
  isVideoUrl,
  isImageUrl,
  getPrimaryVisualMediaUrl,
  normalizeMediaUrls,
  getFileSizeLimit,
  formatFileSize,
  hasVisualMedia,
  getArtifactPlaceholder,
} from "@/lib/media"

describe("Media URL Detection", () => {
  describe("isImageUrl", () => {
    it("should detect JPG images", () => {
      expect(isImageUrl("https://example.com/photo.jpg")).toBe(true)
      expect(isImageUrl("https://example.com/photo.jpeg")).toBe(true)
    })

    it("should detect PNG images", () => {
      expect(isImageUrl("https://example.com/photo.png")).toBe(true)
    })

    it("should detect modern image formats", () => {
      expect(isImageUrl("https://example.com/photo.webp")).toBe(true)
      expect(isImageUrl("https://example.com/photo.heic")).toBe(true)
      expect(isImageUrl("https://example.com/photo.heif")).toBe(true)
    })

    it("should detect GIF images", () => {
      expect(isImageUrl("https://example.com/animation.gif")).toBe(true)
    })

    it("should be case-insensitive", () => {
      expect(isImageUrl("https://example.com/photo.JPG")).toBe(true)
      expect(isImageUrl("https://example.com/photo.PnG")).toBe(true)
    })

    it("should reject non-image URLs", () => {
      expect(isImageUrl("https://example.com/video.mp4")).toBe(false)
      expect(isImageUrl("https://example.com/audio.mp3")).toBe(false)
      expect(isImageUrl("https://example.com/document.pdf")).toBe(false)
    })

    it("should handle empty and null inputs", () => {
      expect(isImageUrl("")).toBe(false)
    })
  })

  describe("isVideoUrl", () => {
    it("should detect MP4 videos from Cloudinary", () => {
      expect(
        isVideoUrl("https://res.cloudinary.com/test/video/upload/v123/users/test/video.mp4")
      ).toBe(true)
    })

    it("should detect various video formats from Cloudinary", () => {
      expect(isVideoUrl("https://res.cloudinary.com/test/video/upload/v123/video.mov")).toBe(true)
      expect(isVideoUrl("https://res.cloudinary.com/test/video/upload/v123/video.mkv")).toBe(true)
      expect(isVideoUrl("https://res.cloudinary.com/test/video/upload/v123/video.avi")).toBe(true)
    })

    it("should reject audio files in /video/upload/ path", () => {
      expect(isVideoUrl("https://res.cloudinary.com/test/video/upload/v123/audio.mp3")).toBe(false)
      expect(isVideoUrl("https://res.cloudinary.com/test/video/upload/v123/audio.wav")).toBe(false)
    })

    it("should reject non-Cloudinary video URLs", () => {
      expect(isVideoUrl("https://example.com/video.mp4")).toBe(false)
    })

    it("should handle empty and null inputs", () => {
      expect(isVideoUrl("")).toBe(false)
    })
  })

  describe("isAudioUrl", () => {
    it("should detect MP3 audio files", () => {
      expect(isAudioUrl("https://example.com/song.mp3")).toBe(true)
    })

    it("should detect various audio formats", () => {
      expect(isAudioUrl("https://example.com/song.wav")).toBe(true)
      expect(isAudioUrl("https://example.com/song.m4a")).toBe(true)
      expect(isAudioUrl("https://example.com/song.aac")).toBe(true)
      expect(isAudioUrl("https://example.com/song.ogg")).toBe(true)
    })

    it("should detect Cloudinary audio files", () => {
      expect(isAudioUrl("https://res.cloudinary.com/test/video/upload/v123/audio/song.mp3")).toBe(
        true
      )
    })

    it("should be case-insensitive", () => {
      expect(isAudioUrl("https://example.com/song.MP3")).toBe(true)
      expect(isAudioUrl("https://example.com/song.WaV")).toBe(true)
    })

    it("should reject non-audio URLs", () => {
      expect(isAudioUrl("https://example.com/video.mp4")).toBe(false)
      expect(isAudioUrl("https://example.com/image.jpg")).toBe(false)
    })

    it("should handle empty and null inputs", () => {
      expect(isAudioUrl("")).toBe(false)
    })
  })
})

describe("Media URL Processing", () => {
  describe("getPrimaryVisualMediaUrl", () => {
    it("should return first image if available", () => {
      const urls = ["https://example.com/video.mp4", "https://example.com/image.jpg"]
      expect(getPrimaryVisualMediaUrl(urls)).toBe("https://example.com/image.jpg")
    })

    it("should prefer images over videos", () => {
      const urls = [
        "https://res.cloudinary.com/test/video/upload/v123/video.mp4",
        "https://example.com/image.jpg",
      ]
      const result = getPrimaryVisualMediaUrl(urls)
      expect(result).toBe("https://example.com/image.jpg")
    })

    it("should return first video if no images", () => {
      const urls = [
        "https://example.com/audio.mp3",
        "https://res.cloudinary.com/test/video/upload/v123/video.mp4",
      ]
      expect(getPrimaryVisualMediaUrl(urls)).toBe(
        "https://res.cloudinary.com/test/video/upload/v123/video.mp4"
      )
    })

    it("should return null for audio-only URLs", () => {
      const urls = ["https://example.com/audio.mp3"]
      expect(getPrimaryVisualMediaUrl(urls)).toBeNull()
    })

    it("should return null for empty arrays", () => {
      expect(getPrimaryVisualMediaUrl([])).toBeNull()
    })

    it("should return null for null/undefined inputs", () => {
      expect(getPrimaryVisualMediaUrl(null)).toBeNull()
      expect(getPrimaryVisualMediaUrl(undefined)).toBeNull()
    })
  })

  describe("normalizeMediaUrls", () => {
    it("should remove duplicate URLs", () => {
      const urls = [
        "https://example.com/image1.jpg",
        "https://example.com/image2.jpg",
        "https://example.com/image1.jpg",
      ]
      expect(normalizeMediaUrls(urls)).toEqual([
        "https://example.com/image1.jpg",
        "https://example.com/image2.jpg",
      ])
    })

    it("should filter out empty strings", () => {
      const urls = ["https://example.com/image1.jpg", "", "https://example.com/image2.jpg", ""]
      expect(normalizeMediaUrls(urls)).toEqual([
        "https://example.com/image1.jpg",
        "https://example.com/image2.jpg",
      ])
    })

    it("should preserve URL order", () => {
      const urls = [
        "https://example.com/image3.jpg",
        "https://example.com/image1.jpg",
        "https://example.com/image2.jpg",
      ]
      expect(normalizeMediaUrls(urls)).toEqual(urls)
    })

    it("should return empty array for null/undefined inputs", () => {
      expect(normalizeMediaUrls(undefined as any)).toEqual([])
      expect(normalizeMediaUrls(null as any)).toEqual([])
    })

    it("should handle whitespace-only strings", () => {
      const urls = ["https://example.com/image1.jpg", "   ", "https://example.com/image2.jpg"]
      expect(normalizeMediaUrls(urls)).toEqual([
        "https://example.com/image1.jpg",
        "https://example.com/image2.jpg",
      ])
    })
  })

  describe("hasVisualMedia", () => {
    it("should return true for images", () => {
      expect(hasVisualMedia(["https://example.com/image.jpg"])).toBe(true)
    })

    it("should return true for videos", () => {
      expect(hasVisualMedia(["https://res.cloudinary.com/test/video/upload/v123/video.mp4"])).toBe(
        true
      )
    })

    it("should return false for audio-only", () => {
      expect(hasVisualMedia(["https://example.com/audio.mp3"])).toBe(false)
    })

    it("should return false for empty/null inputs", () => {
      expect(hasVisualMedia([])).toBe(false)
      expect(hasVisualMedia(null)).toBe(false)
      expect(hasVisualMedia(undefined)).toBe(false)
    })
  })
})

describe("File Utilities", () => {
  describe("getFileSizeLimit", () => {
    it("should return 500MB for video files", () => {
      const videoFile = new File([""], "video.mp4", { type: "video/mp4" })
      expect(getFileSizeLimit(videoFile)).toBe(500 * 1024 * 1024)
    })

    it("should return 50MB for image files", () => {
      const imageFile = new File([""], "image.jpg", { type: "image/jpeg" })
      expect(getFileSizeLimit(imageFile)).toBe(50 * 1024 * 1024)
    })

    it("should return 50MB for audio files", () => {
      const audioFile = new File([""], "song.mp3", { type: "audio/mpeg" })
      expect(getFileSizeLimit(audioFile)).toBe(50 * 1024 * 1024)
    })

    it("should return 50MB for unknown file types", () => {
      const unknownFile = new File([""], "file.txt", {
        type: "application/octet-stream",
      })
      expect(getFileSizeLimit(unknownFile)).toBe(50 * 1024 * 1024)
    })
  })

  describe("formatFileSize", () => {
    it("should format bytes as KB", () => {
      expect(formatFileSize(1024)).toBe("1.0KB")
      expect(formatFileSize(5120)).toBe("5.0KB")
    })

    it("should format bytes as MB", () => {
      expect(formatFileSize(1024 * 1024)).toBe("1.0MB")
      expect(formatFileSize(102.4 * 1024 * 1024)).toBe("102.4MB")
    })

    it("should format bytes as GB", () => {
      expect(formatFileSize(1024 * 1024 * 1024)).toBe("1.0GB")
      expect(formatFileSize(2.5 * 1024 * 1024 * 1024)).toBe("2.5GB")
    })

    it("should handle zero bytes", () => {
      expect(formatFileSize(0)).toBe("0.0KB")
    })
  })

  describe("getArtifactPlaceholder", () => {
    it("should return placeholder image path", () => {
      const placeholder = getArtifactPlaceholder()
      expect(placeholder).toBe("/artifact-placeholder.jpg")
    })
  })
})
