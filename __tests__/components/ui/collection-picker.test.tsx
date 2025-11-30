import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent, waitFor, act } from "@/__tests__/test-utils"
import { CollectionPickerCard, type CollectionPickerItem } from "@/components/collection-picker-card"
import { fixtures } from "@/__tests__/fixtures"

// Mock media image component
vi.mock("@/components/media-image", () => ({
  default: ({ src, alt, className }: any) => (
    <img src={src} alt={alt} className={className} data-testid="picker-image" />
  ),
}))

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  ChevronDown: ({ className }: any) => <div data-testid="chevron-icon" className={className} />,
  Plus: ({ className }: any) => <div data-testid="plus-icon" className={className} />,
  FolderOpen: ({ className }: any) => <div data-testid="folder-icon" className={className} />,
}))

// Mock cloudinary
vi.mock("@/lib/cloudinary", () => ({
  getThumbnailUrl: (url: string) => url ? `thumbnail-${url}` : null,
}))

// Mock HeirloomsIcon
vi.mock("@/components/heirlooms-icon", () => ({
  HeirloomsIcon: ({ className }: any) => <div data-testid="heirlooms-icon" className={className} />,
}))

describe("CollectionPickerCard", () => {
  const defaultCollection: CollectionPickerItem = {
    id: "test-id",
    title: "Test Collection",
    slug: "test-collection",
    thumbnailImages: [],
    itemCount: 5,
    isUncategorized: false,
  }

  describe("rendering", () => {
    it("should render collection title", () => {
      render(
        <CollectionPickerCard
          collection={defaultCollection}
          isSelected={false}
          onClick={() => {}}
        />
      )

      expect(screen.getByText("Test Collection")).toBeInTheDocument()
    })

    it("should render item count with singular form", () => {
      render(
        <CollectionPickerCard
          collection={{ ...defaultCollection, itemCount: 1 }}
          isSelected={false}
          onClick={() => {}}
        />
      )

      expect(screen.getByText("1 item")).toBeInTheDocument()
    })

    it("should render item count with plural form", () => {
      render(
        <CollectionPickerCard
          collection={{ ...defaultCollection, itemCount: 5 }}
          isSelected={false}
          onClick={() => {}}
        />
      )

      expect(screen.getByText("5 items")).toBeInTheDocument()
    })

    it("should render zero items correctly", () => {
      render(
        <CollectionPickerCard
          collection={{ ...defaultCollection, itemCount: 0 }}
          isSelected={false}
          onClick={() => {}}
        />
      )

      expect(screen.getByText("0 items")).toBeInTheDocument()
    })
  })

  describe("thumbnail display", () => {
    it("should render HeirloomsIcon when no images", () => {
      render(
        <CollectionPickerCard
          collection={{ ...defaultCollection, thumbnailImages: [] }}
          isSelected={false}
          onClick={() => {}}
        />
      )

      expect(screen.getByTestId("heirlooms-icon")).toBeInTheDocument()
    })

    it("should render FolderOpen icon for uncategorized collection", () => {
      render(
        <CollectionPickerCard
          collection={{ ...defaultCollection, thumbnailImages: [], isUncategorized: true }}
          isSelected={false}
          onClick={() => {}}
        />
      )

      expect(screen.getByTestId("folder-icon")).toBeInTheDocument()
    })

    it("should render single image when 1 thumbnail", () => {
      render(
        <CollectionPickerCard
          collection={{
            ...defaultCollection,
            thumbnailImages: ["https://example.com/1.jpg"],
          }}
          isSelected={false}
          onClick={() => {}}
        />
      )

      const images = screen.getAllByTestId("picker-image")
      expect(images).toHaveLength(1)
    })

    it("should render 2 images in grid when 2 thumbnails", () => {
      render(
        <CollectionPickerCard
          collection={{
            ...defaultCollection,
            thumbnailImages: ["https://example.com/1.jpg", "https://example.com/2.jpg"],
          }}
          isSelected={false}
          onClick={() => {}}
        />
      )

      const images = screen.getAllByTestId("picker-image")
      expect(images).toHaveLength(2)
    })

    it("should render 2x2 grid when 3 thumbnails", () => {
      render(
        <CollectionPickerCard
          collection={{
            ...defaultCollection,
            thumbnailImages: [
              "https://example.com/1.jpg",
              "https://example.com/2.jpg",
              "https://example.com/3.jpg",
            ],
          }}
          isSelected={false}
          onClick={() => {}}
        />
      )

      const images = screen.getAllByTestId("picker-image")
      expect(images).toHaveLength(3)
    })

    it("should render 2x2 grid with 4 thumbnails max", () => {
      render(
        <CollectionPickerCard
          collection={{
            ...defaultCollection,
            thumbnailImages: [
              "https://example.com/1.jpg",
              "https://example.com/2.jpg",
              "https://example.com/3.jpg",
              "https://example.com/4.jpg",
              "https://example.com/5.jpg", // Should be ignored
            ],
          }}
          isSelected={false}
          onClick={() => {}}
        />
      )

      const images = screen.getAllByTestId("picker-image")
      expect(images).toHaveLength(4)
    })

    it("should filter out empty or invalid image URLs", () => {
      render(
        <CollectionPickerCard
          collection={{
            ...defaultCollection,
            thumbnailImages: ["https://example.com/1.jpg", "", "  ", null as any, "https://example.com/2.jpg"],
          }}
          isSelected={false}
          onClick={() => {}}
        />
      )

      const images = screen.getAllByTestId("picker-image")
      expect(images).toHaveLength(2)
    })
  })

  describe("selection state", () => {
    it("should apply selected styling when isSelected is true", () => {
      render(
        <CollectionPickerCard
          collection={defaultCollection}
          isSelected={true}
          onClick={() => {}}
        />
      )

      const button = screen.getByRole("button")
      expect(button).toHaveClass("border-primary")
      expect(button).toHaveClass("bg-accent")
    })

    it("should apply unselected styling when isSelected is false", () => {
      render(
        <CollectionPickerCard
          collection={defaultCollection}
          isSelected={false}
          onClick={() => {}}
        />
      )

      const button = screen.getByRole("button")
      expect(button).toHaveClass("border-transparent")
    })

    it("should render selection indicator when selected", () => {
      const { container } = render(
        <CollectionPickerCard
          collection={defaultCollection}
          isSelected={true}
          onClick={() => {}}
        />
      )

      // Selection indicator is absolute positioned div with bg-primary
      const indicator = container.querySelector(".bg-primary")
      expect(indicator).toBeInTheDocument()
    })
  })

  describe("interaction", () => {
    it("should call onClick when clicked", () => {
      const handleClick = vi.fn()

      render(
        <CollectionPickerCard
          collection={defaultCollection}
          isSelected={false}
          onClick={handleClick}
        />
      )

      fireEvent.click(screen.getByRole("button"))
      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it("should have type=button to prevent form submission", () => {
      render(
        <CollectionPickerCard
          collection={defaultCollection}
          isSelected={false}
          onClick={() => {}}
        />
      )

      expect(screen.getByRole("button")).toHaveAttribute("type", "button")
    })
  })

  describe("accessibility", () => {
    it("should be an interactive button element", () => {
      render(
        <CollectionPickerCard
          collection={defaultCollection}
          isSelected={false}
          onClick={() => {}}
        />
      )

      const button = screen.getByRole("button")
      expect(button).toBeInTheDocument()
    })

    it("should display title text for screen readers", () => {
      render(
        <CollectionPickerCard
          collection={defaultCollection}
          isSelected={false}
          onClick={() => {}}
        />
      )

      expect(screen.getByText("Test Collection")).toBeInTheDocument()
    })

    it("should display item count for screen readers", () => {
      render(
        <CollectionPickerCard
          collection={defaultCollection}
          isSelected={false}
          onClick={() => {}}
        />
      )

      expect(screen.getByText("5 items")).toBeInTheDocument()
    })
  })

  describe("visual layout", () => {
    it("should truncate long titles with line-clamp", () => {
      const { container } = render(
        <CollectionPickerCard
          collection={{
            ...defaultCollection,
            title: "This is a very long collection title that should be truncated after two lines",
          }}
          isSelected={false}
          onClick={() => {}}
        />
      )

      const titleElement = container.querySelector(".line-clamp-2")
      expect(titleElement).toBeInTheDocument()
    })

    it("should have square aspect ratio thumbnail container", () => {
      const { container } = render(
        <CollectionPickerCard
          collection={defaultCollection}
          isSelected={false}
          onClick={() => {}}
        />
      )

      const thumbnailContainer = container.querySelector(".aspect-square")
      expect(thumbnailContainer).toBeInTheDocument()
    })
  })
})

/**
 * CollectionPicker integration tests
 *
 * The CollectionPicker component has complex async behavior with server actions.
 * These tests focus on the CollectionPickerCard which is the core visual component.
 * Integration tests for the full CollectionPicker would require more complex mocking
 * of Radix UI primitives and server actions which is better tested in E2E tests.
 */
describe("CollectionPicker Integration Patterns", () => {
  describe("collection data shape", () => {
    it("should match CollectionPickerItem interface", () => {
      const collection: CollectionPickerItem = {
        id: fixtures.collections.publicCollection.id,
        title: "Test Collection",
        slug: "test-collection",
        thumbnailImages: ["https://example.com/1.jpg"],
        itemCount: 5,
        isUncategorized: false,
      }

      // Type check passes
      expect(collection.id).toBeDefined()
      expect(collection.title).toBeDefined()
      expect(collection.slug).toBeDefined()
      expect(collection.thumbnailImages).toBeInstanceOf(Array)
      expect(typeof collection.itemCount).toBe("number")
      expect(typeof collection.isUncategorized).toBe("boolean")
    })

    it("should support optional isUncategorized flag", () => {
      const collection: CollectionPickerItem = {
        id: "test-id",
        title: "Test",
        slug: "test",
        thumbnailImages: [],
        itemCount: 0,
        // isUncategorized is optional, defaults to false behavior
      }

      render(
        <CollectionPickerCard
          collection={collection}
          isSelected={false}
          onClick={() => {}}
        />
      )

      // Should show HeirloomsIcon (not FolderOpen) when isUncategorized is falsy
      expect(screen.getByTestId("heirlooms-icon")).toBeInTheDocument()
    })
  })

  describe("selection behavior patterns", () => {
    it("should support toggle-off selection via onClick with null", () => {
      const handleSelect = vi.fn()
      const collection: CollectionPickerItem = {
        id: "test-id",
        title: "Test",
        slug: "test",
        thumbnailImages: [],
        itemCount: 0,
      }

      render(
        <CollectionPickerCard
          collection={collection}
          isSelected={true}
          onClick={handleSelect}
        />
      )

      fireEvent.click(screen.getByRole("button"))

      // onClick is called - parent component would check if already selected
      // and call onSelectCollection(null) to deselect
      expect(handleSelect).toHaveBeenCalled()
    })

    it("should visually indicate selection state", () => {
      const collection: CollectionPickerItem = {
        id: "test-id",
        title: "Test",
        slug: "test",
        thumbnailImages: [],
        itemCount: 0,
      }

      const { rerender } = render(
        <CollectionPickerCard
          collection={collection}
          isSelected={false}
          onClick={() => {}}
        />
      )

      const button = screen.getByRole("button")
      expect(button).toHaveClass("border-transparent")
      expect(button).not.toHaveClass("bg-accent")

      rerender(
        <CollectionPickerCard
          collection={collection}
          isSelected={true}
          onClick={() => {}}
        />
      )

      expect(button).toHaveClass("border-primary")
      expect(button).toHaveClass("bg-accent")
    })
  })

  describe("thumbnail grid patterns", () => {
    it("should handle mixed valid/invalid URLs", () => {
      const collection: CollectionPickerItem = {
        id: "test-id",
        title: "Test",
        slug: "test",
        thumbnailImages: [
          "https://example.com/valid1.jpg",
          "", // invalid
          "https://example.com/valid2.jpg",
          "   ", // whitespace only
          "https://example.com/valid3.jpg",
        ],
        itemCount: 3,
      }

      render(
        <CollectionPickerCard
          collection={collection}
          isSelected={false}
          onClick={() => {}}
        />
      )

      // Should only render 3 valid images
      const images = screen.getAllByTestId("picker-image")
      expect(images).toHaveLength(3)
    })

    it("should use cloudinary thumbnail transform", () => {
      const collection: CollectionPickerItem = {
        id: "test-id",
        title: "Test",
        slug: "test",
        thumbnailImages: ["https://example.com/image.jpg"],
        itemCount: 1,
      }

      render(
        <CollectionPickerCard
          collection={collection}
          isSelected={false}
          onClick={() => {}}
        />
      )

      const image = screen.getByTestId("picker-image")
      // Should have the mocked thumbnail URL
      expect(image).toHaveAttribute("src", "thumbnail-https://example.com/image.jpg")
    })
  })
})
