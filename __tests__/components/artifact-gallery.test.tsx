import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { fixtures } from "@/__tests__/fixtures"
import { isAudioUrl, isVideoUrl, isImageUrl } from "@/lib/media"

/**
 * ArtifactGallery Test Suite
 *
 * Tests the media gallery rendering logic that is embedded in ArtifactDetailView.
 * Since the gallery is not a standalone component, we're testing the rendering
 * patterns and media order logic directly.
 */

// Mock component that mimics the ArtifactDetailView media rendering logic
function ArtifactGallery({ mediaUrls }: { mediaUrls: string[] }) {
  const audioUrlsFiltered = mediaUrls.filter(isAudioUrl)
  const videoUrlsFiltered = mediaUrls.filter(isVideoUrl)
  const imageUrlsFiltered = mediaUrls.filter((url) => isImageUrl(url))

  if (mediaUrls.length === 0) {
    return (
      <div data-testid="empty-gallery">
        <p>No media available</p>
      </div>
    )
  }

  return (
    <div data-testid="artifact-gallery">
      {mediaUrls.map((url, index) => {
        if (isAudioUrl(url)) {
          return (
            <div key={url} data-testid={`media-item-${index}`} data-media-type="audio">
              <h3>Audio{audioUrlsFiltered.length > 1 ? ` ${audioUrlsFiltered.indexOf(url) + 1}` : ""}</h3>
              <audio data-testid={`audio-${index}`} src={url} controls>
                Your browser does not support the audio tag.
              </audio>
            </div>
          )
        } else if (isVideoUrl(url)) {
          return (
            <div key={url} data-testid={`media-item-${index}`} data-media-type="video">
              <h3>Video{videoUrlsFiltered.length > 1 ? ` ${videoUrlsFiltered.indexOf(url) + 1}` : ""}</h3>
              <video data-testid={`video-${index}`} src={url} controls>
                Your browser does not support the video tag.
              </video>
            </div>
          )
        } else {
          return (
            <div key={url} data-testid={`media-item-${index}`} data-media-type="image">
              <h3>Photo{imageUrlsFiltered.length > 1 ? ` ${imageUrlsFiltered.indexOf(url) + 1}` : ""}</h3>
              <img data-testid={`image-${index}`} src={url || "/placeholder.svg"} alt={`Media ${index + 1}`} />
            </div>
          )
        }
      })}
    </div>
  )
}

describe("ArtifactGallery Media Rendering", () => {
  describe("Primary Thumbnail Logic", () => {
    it("renders the first media item as the primary item in the gallery", () => {
      const mediaUrls = [
        "https://example.com/photo1.jpg",
        "https://example.com/photo2.jpg",
        "https://example.com/photo3.jpg",
      ]

      render(<ArtifactGallery mediaUrls={mediaUrls} />)

      // First media item should be rendered first
      const firstMediaItem = screen.getByTestId("media-item-0")
      expect(firstMediaItem).toBeInTheDocument()

      const firstImage = screen.getByTestId("image-0")
      expect(firstImage).toHaveAttribute("src", "https://example.com/photo1.jpg")
    })

    it("renders video as first media item when video is first in array", () => {
      const mediaUrls = ["https://res.cloudinary.com/test/video/upload/v123/video.mp4", "https://example.com/photo.jpg"]

      render(<ArtifactGallery mediaUrls={mediaUrls} />)

      // First media item should be the video
      const firstMediaItem = screen.getByTestId("media-item-0")
      expect(firstMediaItem).toHaveAttribute("data-media-type", "video")

      const video = screen.getByTestId("video-0")
      expect(video).toHaveAttribute("src", "https://res.cloudinary.com/test/video/upload/v123/video.mp4")
    })

    it("renders audio as first media item when audio is first in array", () => {
      const mediaUrls = ["https://example.com/interview.mp3", "https://example.com/photo.jpg"]

      render(<ArtifactGallery mediaUrls={mediaUrls} />)

      // First media item should be the audio
      const firstMediaItem = screen.getByTestId("media-item-0")
      expect(firstMediaItem).toHaveAttribute("data-media-type", "audio")

      const audio = screen.getByTestId("audio-0")
      expect(audio).toHaveAttribute("src", "https://example.com/interview.mp3")
    })
  })

  describe("Media Type Rendering", () => {
    it("renders <img> tags for image URLs", () => {
      const mediaUrls = ["https://example.com/photo.jpg"]

      render(<ArtifactGallery mediaUrls={mediaUrls} />)

      const image = screen.getByTestId("image-0")
      expect(image.tagName).toBe("IMG")
      expect(image).toHaveAttribute("src", "https://example.com/photo.jpg")
    })

    it("renders <video> tags for video URLs", () => {
      const mediaUrls = ["https://res.cloudinary.com/test/video/upload/v123/video.mp4"]

      render(<ArtifactGallery mediaUrls={mediaUrls} />)

      const video = screen.getByTestId("video-0")
      expect(video.tagName).toBe("VIDEO")
      expect(video).toHaveAttribute("src", "https://res.cloudinary.com/test/video/upload/v123/video.mp4")
      expect(video).toHaveAttribute("controls")
    })

    it("renders <audio> player for audio URLs", () => {
      const mediaUrls = ["https://example.com/song.mp3"]

      render(<ArtifactGallery mediaUrls={mediaUrls} />)

      const audio = screen.getByTestId("audio-0")
      expect(audio.tagName).toBe("AUDIO")
      expect(audio).toHaveAttribute("src", "https://example.com/song.mp3")
      expect(audio).toHaveAttribute("controls")
    })

    it("correctly detects multiple image formats", () => {
      const mediaUrls = [
        "https://example.com/photo1.jpg",
        "https://example.com/photo2.png",
        "https://example.com/photo3.webp",
      ]

      render(<ArtifactGallery mediaUrls={mediaUrls} />)

      // All should be rendered as images
      expect(screen.getByTestId("image-0")).toBeInTheDocument()
      expect(screen.getByTestId("image-1")).toBeInTheDocument()
      expect(screen.getByTestId("image-2")).toBeInTheDocument()
    })

    it("correctly detects multiple video formats from Cloudinary", () => {
      const mediaUrls = [
        "https://res.cloudinary.com/test/video/upload/v123/video1.mp4",
        "https://res.cloudinary.com/test/video/upload/v123/video2.mov",
      ]

      render(<ArtifactGallery mediaUrls={mediaUrls} />)

      // Both should be rendered as videos
      expect(screen.getByTestId("video-0")).toBeInTheDocument()
      expect(screen.getByTestId("video-1")).toBeInTheDocument()
    })

    it("correctly detects multiple audio formats", () => {
      const mediaUrls = [
        "https://example.com/audio1.mp3",
        "https://example.com/audio2.wav",
        "https://example.com/audio3.m4a",
      ]

      render(<ArtifactGallery mediaUrls={mediaUrls} />)

      // All should be rendered as audio
      expect(screen.getByTestId("audio-0")).toBeInTheDocument()
      expect(screen.getByTestId("audio-1")).toBeInTheDocument()
      expect(screen.getByTestId("audio-2")).toBeInTheDocument()
    })
  })

  describe("Media Order Preservation", () => {
    it("renders media in the exact order stored in artifact.media_urls", () => {
      // Specific order: image, video, audio, image, video
      const mediaUrls = [
        "https://example.com/photo1.jpg",
        "https://res.cloudinary.com/test/video/upload/v123/video.mp4",
        "https://example.com/audio.mp3",
        "https://example.com/photo2.jpg",
        "https://res.cloudinary.com/test/video/upload/v123/video2.mp4",
      ]

      render(<ArtifactGallery mediaUrls={mediaUrls} />)

      // Verify each media item is rendered in the correct order
      const mediaItem0 = screen.getByTestId("media-item-0")
      const mediaItem1 = screen.getByTestId("media-item-1")
      const mediaItem2 = screen.getByTestId("media-item-2")
      const mediaItem3 = screen.getByTestId("media-item-3")
      const mediaItem4 = screen.getByTestId("media-item-4")

      expect(mediaItem0).toHaveAttribute("data-media-type", "image")
      expect(mediaItem1).toHaveAttribute("data-media-type", "video")
      expect(mediaItem2).toHaveAttribute("data-media-type", "audio")
      expect(mediaItem3).toHaveAttribute("data-media-type", "image")
      expect(mediaItem4).toHaveAttribute("data-media-type", "video")

      // Verify the actual src attributes match the order
      expect(screen.getByTestId("image-0")).toHaveAttribute("src", "https://example.com/photo1.jpg")
      expect(screen.getByTestId("video-0")).toHaveAttribute(
        "src",
        "https://res.cloudinary.com/test/video/upload/v123/video.mp4",
      )
      expect(screen.getByTestId("audio-0")).toHaveAttribute("src", "https://example.com/audio.mp3")
      expect(screen.getByTestId("image-1")).toHaveAttribute("src", "https://example.com/photo2.jpg")
      expect(screen.getByTestId("video-1")).toHaveAttribute(
        "src",
        "https://res.cloudinary.com/test/video/upload/v123/video2.mp4",
      )
    })

    it("does not sort or reorder media by type", () => {
      // Intentionally mixed order
      const mediaUrls = [
        "https://example.com/audio.mp3",
        "https://example.com/photo.jpg",
        "https://res.cloudinary.com/test/video/upload/v123/video.mp4",
      ]

      render(<ArtifactGallery mediaUrls={mediaUrls} />)

      // Should maintain the original order: audio, image, video
      const mediaItem0 = screen.getByTestId("media-item-0")
      const mediaItem1 = screen.getByTestId("media-item-1")
      const mediaItem2 = screen.getByTestId("media-item-2")

      expect(mediaItem0).toHaveAttribute("data-media-type", "audio")
      expect(mediaItem1).toHaveAttribute("data-media-type", "image")
      expect(mediaItem2).toHaveAttribute("data-media-type", "video")
    })

    it("preserves order from fixture multiMediaArtifact", () => {
      // Uses the fixture data
      const mediaUrls = fixtures.artifacts.multiMediaArtifact.media_urls

      render(<ArtifactGallery mediaUrls={mediaUrls} />)

      // Expected order from fixture: photo1, video, photo2
      const mediaItem0 = screen.getByTestId("media-item-0")
      const mediaItem1 = screen.getByTestId("media-item-1")
      const mediaItem2 = screen.getByTestId("media-item-2")

      expect(mediaItem0).toHaveAttribute("data-media-type", "image")
      expect(mediaItem1).toHaveAttribute("data-media-type", "video")
      expect(mediaItem2).toHaveAttribute("data-media-type", "image")

      expect(screen.getByTestId("image-0")).toHaveAttribute("src", "https://example.com/photo1.jpg")
      expect(screen.getByTestId("video-0")).toHaveAttribute("src", "https://example.com/video.mp4")
      expect(screen.getByTestId("image-1")).toHaveAttribute("src", "https://example.com/photo2.jpg")
    })
  })

  describe("Empty State", () => {
    it("renders empty state when no media is provided", () => {
      render(<ArtifactGallery mediaUrls={[]} />)

      const emptyGallery = screen.getByTestId("empty-gallery")
      expect(emptyGallery).toBeInTheDocument()
      expect(emptyGallery).toHaveTextContent("No media available")
    })
  })

  describe("Mixed Media Collections", () => {
    it("handles artifact with only images", () => {
      const mediaUrls = fixtures.artifacts.imageArtifact.media_urls

      render(<ArtifactGallery mediaUrls={mediaUrls} />)

      expect(screen.getByTestId("media-item-0")).toHaveAttribute("data-media-type", "image")
      expect(screen.queryByTestId("video-0")).not.toBeInTheDocument()
      expect(screen.queryByTestId("audio-0")).not.toBeInTheDocument()
    })

    it("handles artifact with only audio", () => {
      const mediaUrls = fixtures.artifacts.audioArtifact.media_urls

      render(<ArtifactGallery mediaUrls={mediaUrls} />)

      expect(screen.getByTestId("media-item-0")).toHaveAttribute("data-media-type", "audio")
      expect(screen.queryByTestId("video-0")).not.toBeInTheDocument()
      expect(screen.queryByTestId("image-0")).not.toBeInTheDocument()
    })

    it("handles artifact with mixed media types", () => {
      const mediaUrls = [
        "https://example.com/photo.jpg",
        "https://res.cloudinary.com/test/video/upload/v123/video.mp4",
        "https://example.com/audio.mp3",
      ]

      render(<ArtifactGallery mediaUrls={mediaUrls} />)

      // All three types should be present
      expect(screen.getByTestId("image-0")).toBeInTheDocument()
      expect(screen.getByTestId("video-0")).toBeInTheDocument()
      expect(screen.getByTestId("audio-0")).toBeInTheDocument()
    })
  })

  describe("Media Labeling", () => {
    it("labels single image without number", () => {
      const mediaUrls = ["https://example.com/photo.jpg"]

      render(<ArtifactGallery mediaUrls={mediaUrls} />)

      expect(screen.getByText("Photo")).toBeInTheDocument()
      expect(screen.queryByText("Photo 1")).not.toBeInTheDocument()
    })

    it("labels multiple images with numbers", () => {
      const mediaUrls = [
        "https://example.com/photo1.jpg",
        "https://example.com/photo2.jpg",
        "https://example.com/photo3.jpg",
      ]

      render(<ArtifactGallery mediaUrls={mediaUrls} />)

      expect(screen.getByText("Photo 1")).toBeInTheDocument()
      expect(screen.getByText("Photo 2")).toBeInTheDocument()
      expect(screen.getByText("Photo 3")).toBeInTheDocument()
    })

    it("labels single video without number", () => {
      const mediaUrls = ["https://res.cloudinary.com/test/video/upload/v123/video.mp4"]

      render(<ArtifactGallery mediaUrls={mediaUrls} />)

      expect(screen.getByText("Video")).toBeInTheDocument()
      expect(screen.queryByText("Video 1")).not.toBeInTheDocument()
    })

    it("labels multiple videos with numbers", () => {
      const mediaUrls = [
        "https://res.cloudinary.com/test/video/upload/v123/video1.mp4",
        "https://res.cloudinary.com/test/video/upload/v123/video2.mp4",
      ]

      render(<ArtifactGallery mediaUrls={mediaUrls} />)

      expect(screen.getByText("Video 1")).toBeInTheDocument()
      expect(screen.getByText("Video 2")).toBeInTheDocument()
    })

    it("labels single audio without number", () => {
      const mediaUrls = ["https://example.com/audio.mp3"]

      render(<ArtifactGallery mediaUrls={mediaUrls} />)

      expect(screen.getByText("Audio")).toBeInTheDocument()
      expect(screen.queryByText("Audio 1")).not.toBeInTheDocument()
    })

    it("labels multiple audio files with numbers", () => {
      const mediaUrls = ["https://example.com/audio1.mp3", "https://example.com/audio2.mp3"]

      render(<ArtifactGallery mediaUrls={mediaUrls} />)

      expect(screen.getByText("Audio 1")).toBeInTheDocument()
      expect(screen.getByText("Audio 2")).toBeInTheDocument()
    })
  })

  describe("Media Type Detection Edge Cases", () => {
    it("handles uppercase file extensions", () => {
      const mediaUrls = [
        "https://example.com/photo.JPG",
        "https://res.cloudinary.com/test/video/upload/v123/video.MP4",
        "https://example.com/audio.MP3",
      ]

      render(<ArtifactGallery mediaUrls={mediaUrls} />)

      expect(screen.getByTestId("image-0")).toBeInTheDocument()
      expect(screen.getByTestId("video-0")).toBeInTheDocument()
      expect(screen.getByTestId("audio-0")).toBeInTheDocument()
    })

    it("distinguishes between video and audio in Cloudinary /video/upload/ path", () => {
      const mediaUrls = [
        "https://res.cloudinary.com/test/video/upload/v123/actual-video.mp4",
        "https://res.cloudinary.com/test/video/upload/v123/actual-audio.mp3",
      ]

      render(<ArtifactGallery mediaUrls={mediaUrls} />)

      // First should be video, second should be audio
      expect(screen.getByTestId("media-item-0")).toHaveAttribute("data-media-type", "video")
      expect(screen.getByTestId("media-item-1")).toHaveAttribute("data-media-type", "audio")
    })
  })
})
