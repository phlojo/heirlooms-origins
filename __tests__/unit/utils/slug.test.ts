import { describe, it, expect, vi } from "vitest"
import { generateSlug, generateUniqueSlug } from "@/lib/utils/slug"

describe("Slug Utilities", () => {
  describe("generateSlug", () => {
    describe("basic transformations", () => {
      it("should convert text to lowercase", () => {
        expect(generateSlug("Hello World")).toBe("hello-world")
        expect(generateSlug("UPPERCASE TEXT")).toBe("uppercase-text")
        expect(generateSlug("MixedCase")).toBe("mixedcase")
      })

      it("should replace spaces with hyphens", () => {
        expect(generateSlug("hello world")).toBe("hello-world")
        expect(generateSlug("multiple   spaces")).toBe("multiple-spaces")
        expect(generateSlug("tabs\tand\tnewlines\n")).toBe("tabs-and-newlines")
      })

      it("should replace underscores with hyphens", () => {
        expect(generateSlug("hello_world")).toBe("hello-world")
        expect(generateSlug("multiple___underscores")).toBe("multiple-underscores")
      })

      it("should trim whitespace", () => {
        expect(generateSlug("  hello world  ")).toBe("hello-world")
        expect(generateSlug("\thello\n")).toBe("hello")
      })
    })

    describe("special character handling", () => {
      it("should remove special characters", () => {
        expect(generateSlug("hello! world?")).toBe("hello-world")
        expect(generateSlug("test@example.com")).toBe("testexamplecom")
        expect(generateSlug("price: $100")).toBe("price-100")
      })

      it("should handle apostrophes", () => {
        expect(generateSlug("grandma's recipe")).toBe("grandmas-recipe")
        expect(generateSlug("don't stop")).toBe("dont-stop")
      })

      it("should remove leading and trailing hyphens", () => {
        expect(generateSlug("-hello-")).toBe("hello")
        expect(generateSlug("--hello--")).toBe("hello")
        expect(generateSlug("- hello -")).toBe("hello")
      })

      it("should handle consecutive hyphens", () => {
        expect(generateSlug("hello---world")).toBe("hello-world")
        expect(generateSlug("a - b - c")).toBe("a-b-c")
      })
    })

    describe("edge cases", () => {
      it("should return 'collection' for empty input", () => {
        expect(generateSlug("")).toBe("collection")
      })

      it("should return 'collection' for whitespace-only input", () => {
        expect(generateSlug("   ")).toBe("collection")
        expect(generateSlug("\t\n")).toBe("collection")
      })

      it("should return 'collection' for special-characters-only input", () => {
        expect(generateSlug("!@#$%^&*()")).toBe("collection")
        expect(generateSlug("...")).toBe("collection")
      })

      it("should handle very long text", () => {
        const longText = "a".repeat(500) + " " + "b".repeat(500)
        const result = generateSlug(longText)
        expect(result).toBe("a".repeat(500) + "-" + "b".repeat(500))
      })

      it("should handle numbers", () => {
        expect(generateSlug("123 Main Street")).toBe("123-main-street")
        expect(generateSlug("Year 2024")).toBe("year-2024")
        expect(generateSlug("1st Place")).toBe("1st-place")
      })

      it("should handle unicode characters", () => {
        // Unicode letters get removed since they match [^\w\s-]
        expect(generateSlug("Caf\u00E9 Latte")).toBe("caf-latte")
        expect(generateSlug("H\u00F6lder")).toBe("hlder")
      })
    })

    describe("real-world examples", () => {
      it("should generate clean slugs for artifact titles", () => {
        expect(generateSlug("Grandma's Vintage Watch")).toBe("grandmas-vintage-watch")
        expect(generateSlug("1957 Chevrolet Bel Air")).toBe("1957-chevrolet-bel-air")
        expect(generateSlug("Family Heirloom - Silver Necklace")).toBe(
          "family-heirloom-silver-necklace"
        )
      })

      it("should generate clean slugs for collection names", () => {
        expect(generateSlug("Mom's Kitchen Items")).toBe("moms-kitchen-items")
        expect(generateSlug("Estate Sale Finds (2024)")).toBe("estate-sale-finds-2024")
        expect(generateSlug("Books & Documents")).toBe("books-documents")
      })
    })
  })

  describe("generateUniqueSlug", () => {
    describe("no conflicts", () => {
      it("should return base slug when no conflicts exist", async () => {
        const checkExists = vi.fn().mockResolvedValue(false)

        const result = await generateUniqueSlug("test-slug", checkExists)

        expect(result).toBe("test-slug")
        expect(checkExists).toHaveBeenCalledTimes(1)
        expect(checkExists).toHaveBeenCalledWith("test-slug")
      })
    })

    describe("conflict resolution", () => {
      it("should append -2 when base slug exists", async () => {
        const checkExists = vi
          .fn()
          .mockResolvedValueOnce(true) // test-slug exists
          .mockResolvedValueOnce(false) // test-slug-2 doesn't exist

        const result = await generateUniqueSlug("test-slug", checkExists)

        expect(result).toBe("test-slug-2")
        expect(checkExists).toHaveBeenCalledTimes(2)
      })

      it("should increment counter until unique slug found", async () => {
        const checkExists = vi
          .fn()
          .mockResolvedValueOnce(true) // test-slug exists
          .mockResolvedValueOnce(true) // test-slug-2 exists
          .mockResolvedValueOnce(true) // test-slug-3 exists
          .mockResolvedValueOnce(false) // test-slug-4 doesn't exist

        const result = await generateUniqueSlug("test-slug", checkExists)

        expect(result).toBe("test-slug-4")
        expect(checkExists).toHaveBeenCalledTimes(4)
      })

      it("should handle many collisions", async () => {
        const existingSlugs = new Set([
          "item",
          "item-2",
          "item-3",
          "item-4",
          "item-5",
          "item-6",
          "item-7",
          "item-8",
          "item-9",
        ])

        const checkExists = vi.fn().mockImplementation((slug: string) => {
          return Promise.resolve(existingSlugs.has(slug))
        })

        const result = await generateUniqueSlug("item", checkExists)

        expect(result).toBe("item-10")
      })
    })

    describe("different base slugs", () => {
      it("should work with slugs containing numbers", async () => {
        const checkExists = vi
          .fn()
          .mockResolvedValueOnce(true) // year-2024 exists
          .mockResolvedValueOnce(false) // year-2024-2 doesn't exist

        const result = await generateUniqueSlug("year-2024", checkExists)

        expect(result).toBe("year-2024-2")
      })

      it("should work with single-word slugs", async () => {
        const checkExists = vi
          .fn()
          .mockResolvedValueOnce(true)
          .mockResolvedValueOnce(false)

        const result = await generateUniqueSlug("test", checkExists)

        expect(result).toBe("test-2")
      })

      it("should work with empty-like slugs", async () => {
        const checkExists = vi
          .fn()
          .mockResolvedValueOnce(true)
          .mockResolvedValueOnce(false)

        const result = await generateUniqueSlug("collection", checkExists)

        expect(result).toBe("collection-2")
      })
    })

    describe("checkExists function behavior", () => {
      it("should pass the correct slug to checkExists", async () => {
        const checkExists = vi
          .fn()
          .mockResolvedValueOnce(true)
          .mockResolvedValueOnce(true)
          .mockResolvedValueOnce(false)

        await generateUniqueSlug("my-artifact", checkExists)

        expect(checkExists).toHaveBeenNthCalledWith(1, "my-artifact")
        expect(checkExists).toHaveBeenNthCalledWith(2, "my-artifact-2")
        expect(checkExists).toHaveBeenNthCalledWith(3, "my-artifact-3")
      })

      it("should work with async checkExists that has delay", async () => {
        const checkExists = vi.fn().mockImplementation((slug: string) => {
          return new Promise((resolve) => {
            setTimeout(() => {
              resolve(slug === "delayed-slug")
            }, 10)
          })
        })

        const result = await generateUniqueSlug("delayed-slug", checkExists)

        expect(result).toBe("delayed-slug-2")
      })
    })
  })

  describe("generateSlug + generateUniqueSlug integration", () => {
    it("should work together for typical use case", async () => {
      const title = "Grandma's Special Recipe Book"
      const baseSlug = generateSlug(title)

      const existingSlugs = new Set(["grandmas-special-recipe-book"])
      const checkExists = vi.fn().mockImplementation((slug: string) => {
        return Promise.resolve(existingSlugs.has(slug))
      })

      const uniqueSlug = await generateUniqueSlug(baseSlug, checkExists)

      expect(baseSlug).toBe("grandmas-special-recipe-book")
      expect(uniqueSlug).toBe("grandmas-special-recipe-book-2")
    })

    it("should handle edge case of empty title", async () => {
      const title = ""
      const baseSlug = generateSlug(title)

      const checkExists = vi.fn().mockResolvedValue(false)
      const uniqueSlug = await generateUniqueSlug(baseSlug, checkExists)

      expect(baseSlug).toBe("collection")
      expect(uniqueSlug).toBe("collection")
    })
  })
})
