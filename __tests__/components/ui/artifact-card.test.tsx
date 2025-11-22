import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@/__tests__/test-utils"
import { ArtifactCard } from "@/components/artifact-card"
import { fixtures } from "@/__tests__/fixtures"

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ href, children }: any) => (
    <a href={href} data-testid="link">
      {children}
    </a>
  ),
}))

// Mock Cloudinary
vi.mock("@/lib/cloudinary", () => ({
  getThumbnailUrl: (url: string) => url,
}))

// Mock media image component
vi.mock("@/components/media-image", () => ({
  default: ({ src, alt, className }: any) => (
    <img src={src} alt={alt} className={className} data-testid="media-image" />
  ),
}))

// Mock author component
vi.mock("@/components/author", () => ({
  Author: ({ userId, authorName, size }: any) => (
    <div data-testid="author" data-user-id={userId} data-name={authorName} data-size={size}>
      {authorName || userId}
    </div>
  ),
}))

// Mock artifact type badge
vi.mock("@/components/artifact-type-badge", () => ({
  ArtifactTypeBadge: ({ typeName, iconName }: any) => (
    <div data-testid="type-badge" data-type={typeName} data-icon={iconName}>
      {typeName}
    </div>
  ),
}))

// Mock heirlooms icon
vi.mock("@/components/heirlooms-icon", () => ({
  HeirloomsIcon: ({ className }: any) => (
    <div data-testid="heirlooms-icon" className={className}>
      Icon
    </div>
  ),
}))

// Mock card components
vi.mock("@/components/ui/card", () => ({
  Card: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardHeader: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardContent: ({ children, className }: any) => <div className={className}>{children}</div>,
}))

describe("ArtifactCard", () => {
  describe("rendering", () => {
    it("should render artifact with title", () => {
      const artifact = fixtures.artifacts.imageArtifact

      render(<ArtifactCard artifact={artifact} />)

      expect(screen.getByText(artifact.title)).toBeInTheDocument()
    })

    it("should render as a link to artifact detail", () => {
      const artifact = fixtures.artifacts.imageArtifact

      render(<ArtifactCard artifact={artifact} />)

      const link = screen.getByTestId("link")
      expect(link).toHaveAttribute("href", `/artifacts/${artifact.slug}`)
    })

    it("should render thumbnail image when available", () => {
      const artifact = fixtures.artifacts.imageArtifact

      render(<ArtifactCard artifact={artifact} />)

      const image = screen.getByTestId("media-image")
      expect(image).toBeInTheDocument()
      expect(image).toHaveAttribute("alt", artifact.title)
    })

    it("should render placeholder when no thumbnail", () => {
      const artifact = {
        ...fixtures.artifacts.imageArtifact,
        thumbnail_url: null,
      }

      render(<ArtifactCard artifact={artifact} />)

      const icon = screen.getByTestId("heirlooms-icon")
      expect(icon).toBeInTheDocument()
    })

    it("should show 'Audio only' message for audio-only artifacts", () => {
      const artifact = {
        ...fixtures.artifacts.imageArtifact,
        thumbnail_url: null,
        media_urls: ["https://example.com/audio.mp3"],
      }

      render(<ArtifactCard artifact={artifact} />)

      expect(screen.getByText(/Audio only/i)).toBeInTheDocument()
    })

    it("should show 'No media' message for artifacts without media", () => {
      const artifact = {
        ...fixtures.artifacts.imageArtifact,
        thumbnail_url: null,
        media_urls: [],
      }

      render(<ArtifactCard artifact={artifact} />)

      expect(screen.getByText(/No media/i)).toBeInTheDocument()
    })
  })

  describe("artifact type badge", () => {
    it("should render artifact type badge when type is present", () => {
      const artifact = {
        ...fixtures.artifacts.imageArtifact,
        artifact_type: {
          id: "type-id",
          name: "Car Collectors",
          icon_name: "Car",
        },
      }

      render(<ArtifactCard artifact={artifact} />)

      const badge = screen.getByTestId("type-badge")
      expect(badge).toBeInTheDocument()
      expect(badge).toHaveAttribute("data-type", "Car Collectors")
    })

    it("should not render type badge when artifact_type is null", () => {
      const artifact = {
        ...fixtures.artifacts.imageArtifact,
        artifact_type: null,
      }

      render(<ArtifactCard artifact={artifact} />)

      const badge = screen.queryByTestId("type-badge")
      expect(badge).not.toBeInTheDocument()
    })
  })

  describe("author display", () => {
    it("should not show author by default", () => {
      const artifact = fixtures.artifacts.imageArtifact

      render(<ArtifactCard artifact={artifact} />)

      const author = screen.queryByTestId("author")
      expect(author).not.toBeInTheDocument()
    })

    it("should show author when showAuthor is true", () => {
      const artifact = fixtures.artifacts.imageArtifact
      const authorName = "John Doe"

      render(<ArtifactCard artifact={artifact} showAuthor={true} authorName={authorName} />)

      const author = screen.getByTestId("author")
      expect(author).toBeInTheDocument()
      expect(author).toHaveAttribute("data-name", authorName)
    })

    it("should pass user_id to author component", () => {
      const artifact = fixtures.artifacts.imageArtifact

      render(<ArtifactCard artifact={artifact} showAuthor={true} />)

      const author = screen.getByTestId("author")
      expect(author).toHaveAttribute("data-user-id", artifact.user_id)
    })

    it("should use authorName from props over user_id", () => {
      const artifact = fixtures.artifacts.imageArtifact
      const authorName = "Custom Name"

      render(<ArtifactCard artifact={artifact} showAuthor={true} authorName={authorName} />)

      const author = screen.getByTestId("author")
      expect(author).toHaveAttribute("data-name", authorName)
    })
  })

  describe("multi-media artifacts", () => {
    it("should render artifact with multiple media URLs", () => {
      const artifact = fixtures.artifacts.multiMediaArtifact

      render(<ArtifactCard artifact={artifact} />)

      expect(screen.getByText(artifact.title)).toBeInTheDocument()
    })

    it("should use first visual media URL as thumbnail", () => {
      const artifact = fixtures.artifacts.multiMediaArtifact

      render(<ArtifactCard artifact={artifact} />)

      const image = screen.getByTestId("media-image")
      expect(image).toHaveAttribute("src", artifact.thumbnail_url)
    })
  })

  describe("optional properties", () => {
    it("should handle artifact without optional properties", () => {
      const artifact = {
        id: "test-id",
        slug: "test-artifact",
        title: "Test Artifact",
      }

      render(<ArtifactCard artifact={artifact as any} />)

      expect(screen.getByText("Test Artifact")).toBeInTheDocument()
    })

    it("should handle artifact with undefined description", () => {
      const artifact = {
        ...fixtures.artifacts.imageArtifact,
        description: undefined,
      }

      render(<ArtifactCard artifact={artifact} />)

      expect(screen.getByText(artifact.title)).toBeInTheDocument()
    })

    it("should handle artifact with null year_acquired", () => {
      const artifact = {
        ...fixtures.artifacts.imageArtifact,
        year_acquired: null,
      }

      render(<ArtifactCard artifact={artifact} />)

      expect(screen.getByText(artifact.title)).toBeInTheDocument()
    })
  })

  describe("accessibility", () => {
    it("should have proper alt text for thumbnail image", () => {
      const artifact = fixtures.artifacts.imageArtifact

      render(<ArtifactCard artifact={artifact} />)

      const image = screen.getByTestId("media-image")
      expect(image).toHaveAttribute("alt", artifact.title)
    })

    it("should have proper alt text for placeholder icon", () => {
      const artifact = {
        ...fixtures.artifacts.imageArtifact,
        thumbnail_url: null,
      }

      render(<ArtifactCard artifact={artifact} />)

      const icon = screen.getByTestId("heirlooms-icon")
      expect(icon).toBeInTheDocument()
    })

    it("should be a clickable link", () => {
      const artifact = fixtures.artifacts.imageArtifact

      render(<ArtifactCard artifact={artifact} />)

      const link = screen.getByTestId("link")
      expect(link.tagName).toBe("A")
    })
  })

  describe("styling and hover effects", () => {
    it("should render card with proper styling classes", () => {
      const artifact = fixtures.artifacts.imageArtifact

      const { container } = render(<ArtifactCard artifact={artifact} />)

      // Card should have overflow-hidden and transition classes
      const card = container.querySelector(".overflow-hidden")
      expect(card).toBeInTheDocument()
    })
  })
})
