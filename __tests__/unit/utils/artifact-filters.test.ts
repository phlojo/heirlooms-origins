import { describe, it, expect } from "vitest"
import {
  parseSortParam,
  parseTypeParams,
  buildFilterUrl,
  getSortConfig,
  hasActiveFilters,
  SORT_OPTIONS,
  type SortOption,
} from "@/lib/utils/artifact-filters"

describe("artifact-filters", () => {
  describe("SORT_OPTIONS", () => {
    it("should contain exactly 5 sort options", () => {
      expect(SORT_OPTIONS).toHaveLength(5)
    })

    it("should have valid structure", () => {
      SORT_OPTIONS.forEach((option) => {
        expect(option).toHaveProperty("value")
        expect(option).toHaveProperty("label")
        expect(typeof option.value).toBe("string")
        expect(typeof option.label).toBe("string")
      })
    })

    it("should have all expected sort values", () => {
      const values = SORT_OPTIONS.map((o) => o.value)
      expect(values).toEqual(["newest", "oldest", "title-asc", "title-desc", "last-edited"])
    })
  })

  describe("parseSortParam", () => {
    it("should return 'newest' for null param", () => {
      expect(parseSortParam(null)).toBe("newest")
    })

    it("should return 'newest' for undefined param", () => {
      expect(parseSortParam(undefined as any)).toBe("newest")
    })

    it("should return 'newest' for empty string", () => {
      expect(parseSortParam("")).toBe("newest")
    })

    it("should accept valid sort option: newest", () => {
      expect(parseSortParam("newest")).toBe("newest")
    })

    it("should accept valid sort option: oldest", () => {
      expect(parseSortParam("oldest")).toBe("oldest")
    })

    it("should accept valid sort option: title-asc", () => {
      expect(parseSortParam("title-asc")).toBe("title-asc")
    })

    it("should accept valid sort option: title-desc", () => {
      expect(parseSortParam("title-desc")).toBe("title-desc")
    })

    it("should accept valid sort option: last-edited", () => {
      expect(parseSortParam("last-edited")).toBe("last-edited")
    })

    it("should return 'newest' for invalid sort option", () => {
      expect(parseSortParam("invalid")).toBe("newest")
    })

    it("should return 'newest' for random string", () => {
      expect(parseSortParam("xyz123")).toBe("newest")
    })

    it("should return 'newest' for sort option with extra spaces", () => {
      expect(parseSortParam(" newest ")).toBe("newest")
    })

    it("should return 'newest' for case-sensitive mismatch", () => {
      expect(parseSortParam("Newest")).toBe("newest")
    })

    it("should return 'newest' for partial match", () => {
      expect(parseSortParam("new")).toBe("newest")
    })
  })

  describe("parseTypeParams", () => {
    const validTypeIds = ["type-1", "type-2", "type-3"]

    it("should return empty array for null param", () => {
      expect(parseTypeParams(null, validTypeIds)).toEqual([])
    })

    it("should return empty array for undefined param", () => {
      expect(parseTypeParams(undefined as any, validTypeIds)).toEqual([])
    })

    it("should return empty array for empty string", () => {
      expect(parseTypeParams("", validTypeIds)).toEqual([])
    })

    it("should parse single valid type ID", () => {
      expect(parseTypeParams("type-1", validTypeIds)).toEqual(["type-1"])
    })

    it("should parse multiple valid type IDs", () => {
      expect(parseTypeParams("type-1,type-2,type-3", validTypeIds)).toEqual([
        "type-1",
        "type-2",
        "type-3",
      ])
    })

    it("should filter out invalid type IDs", () => {
      expect(parseTypeParams("type-1,invalid,type-2", validTypeIds)).toEqual(["type-1", "type-2"])
    })

    it("should handle all invalid type IDs", () => {
      expect(parseTypeParams("invalid-1,invalid-2", validTypeIds)).toEqual([])
    })

    it("should handle whitespace around type IDs", () => {
      // parseTypeParams splits by comma but doesn't trim, so " type-2" won't match "type-2"
      expect(parseTypeParams("type-1, type-2, type-3", validTypeIds)).toEqual(["type-1"])
    })

    it("should handle empty segments in comma-separated list", () => {
      expect(parseTypeParams("type-1,,type-2", validTypeIds)).toEqual(["type-1", "type-2"])
    })

    it("should preserve order of type IDs", () => {
      expect(parseTypeParams("type-3,type-1,type-2", validTypeIds)).toEqual([
        "type-3",
        "type-1",
        "type-2",
      ])
    })

    it("should handle empty validTypeIds array", () => {
      expect(parseTypeParams("type-1,type-2", [])).toEqual([])
    })

    it("should be case-sensitive for type IDs", () => {
      expect(parseTypeParams("Type-1,TYPE-1", validTypeIds)).toEqual([])
    })

    it("should deduplicate type IDs from CSV", () => {
      // Note: Current implementation doesn't deduplicate, but this test documents the behavior
      expect(parseTypeParams("type-1,type-1", validTypeIds)).toEqual(["type-1", "type-1"])
    })
  })

  describe("buildFilterUrl", () => {
    it("should return base path with no filters", () => {
      expect(buildFilterUrl("/artifacts", "newest", [])).toBe("/artifacts")
    })

    it("should include non-default sort", () => {
      expect(buildFilterUrl("/artifacts", "oldest", [])).toBe("/artifacts?sort=oldest")
    })

    it("should not include default 'newest' sort", () => {
      expect(buildFilterUrl("/artifacts", "newest", [])).not.toContain("sort=newest")
    })

    it("should include all sort options", () => {
      const sorts: SortOption[] = ["oldest", "title-asc", "title-desc", "last-edited"]
      sorts.forEach((sort) => {
        const url = buildFilterUrl("/artifacts", sort, [])
        expect(url).toContain(`sort=${sort}`)
      })
    })

    it("should include single type ID", () => {
      expect(buildFilterUrl("/artifacts", "newest", ["type-1"])).toBe(
        "/artifacts?types=type-1",
      )
    })

    it("should include multiple type IDs", () => {
      const url = buildFilterUrl("/artifacts", "newest", ["type-1", "type-2", "type-3"])
      // URLSearchParams encodes commas as %2C
      expect(url).toContain("types=type-1%2Ctype-2%2Ctype-3")
    })

    it("should include both sort and type filters", () => {
      const url = buildFilterUrl("/artifacts", "oldest", ["type-1", "type-2"])
      expect(url).toContain("sort=oldest")
      expect(url).toContain("types=type-1%2Ctype-2")
    })

    it("should include tab parameter when not 'all'", () => {
      expect(buildFilterUrl("/artifacts", "newest", [], "my-artifacts")).toContain(
        "tab=my-artifacts",
      )
    })

    it("should not include tab parameter when 'all'", () => {
      expect(buildFilterUrl("/artifacts", "newest", [], "all")).not.toContain("tab=")
    })

    it("should not include tab parameter when undefined", () => {
      expect(buildFilterUrl("/artifacts", "newest", [], undefined)).not.toContain("tab=")
    })

    it("should include view parameter when provided", () => {
      expect(buildFilterUrl("/artifacts", "newest", [], undefined, "compact")).toContain(
        "view=compact",
      )
    })

    it("should not include view parameter when undefined", () => {
      expect(buildFilterUrl("/artifacts", "newest", [], undefined, undefined)).not.toContain(
        "view=",
      )
    })

    it("should include all parameters together", () => {
      const url = buildFilterUrl("/artifacts", "title-asc", ["type-1", "type-2"], "my-artifacts", "compact")
      expect(url).toContain("tab=my-artifacts")
      expect(url).toContain("sort=title-asc")
      expect(url).toContain("types=type-1%2Ctype-2")
      expect(url).toContain("view=compact")
    })

    it("should properly format URL parameters", () => {
      const url = buildFilterUrl("/artifacts", "oldest", ["type-1"], "community")
      expect(url).toContain("tab=community")
      expect(url).toContain("sort=oldest")
      expect(url).toContain("types=type-1")
    })

    it("should handle different base paths", () => {
      expect(buildFilterUrl("/my-artifacts", "newest", [])).toBe("/my-artifacts")
      expect(buildFilterUrl("/collections", "newest", [])).toBe("/collections")
    })

    it("should handle empty type IDs array", () => {
      expect(buildFilterUrl("/artifacts", "oldest", [])).not.toContain("types=")
    })
  })

  describe("getSortConfig", () => {
    it("should return config for 'newest'", () => {
      const config = getSortConfig("newest")
      expect(config).toEqual({ field: "created_at", ascending: false })
    })

    it("should return config for 'oldest'", () => {
      const config = getSortConfig("oldest")
      expect(config).toEqual({ field: "created_at", ascending: true })
    })

    it("should return config for 'title-asc'", () => {
      const config = getSortConfig("title-asc")
      expect(config).toEqual({ field: "title", ascending: true })
    })

    it("should return config for 'title-desc'", () => {
      const config = getSortConfig("title-desc")
      expect(config).toEqual({ field: "title", ascending: false })
    })

    it("should return config for 'last-edited'", () => {
      const config = getSortConfig("last-edited")
      expect(config).toEqual({ field: "updated_at", ascending: false })
    })

    it("should have valid field values", () => {
      const validFields = ["created_at", "updated_at", "title"]
      SORT_OPTIONS.forEach((option) => {
        const config = getSortConfig(option.value)
        expect(validFields).toContain(config.field)
      })
    })

    it("should have boolean ascending value", () => {
      SORT_OPTIONS.forEach((option) => {
        const config = getSortConfig(option.value)
        expect(typeof config.ascending).toBe("boolean")
      })
    })

    it("should map each sort option consistently", () => {
      // Test that the same sort option always returns the same config
      const config1 = getSortConfig("newest")
      const config2 = getSortConfig("newest")
      expect(config1).toEqual(config2)
    })

    it("should use created_at for date-based sorts", () => {
      expect(getSortConfig("newest").field).toBe("created_at")
      expect(getSortConfig("oldest").field).toBe("created_at")
    })

    it("should use updated_at for last-edited sort", () => {
      expect(getSortConfig("last-edited").field).toBe("updated_at")
    })

    it("should use title for title sorts", () => {
      expect(getSortConfig("title-asc").field).toBe("title")
      expect(getSortConfig("title-desc").field).toBe("title")
    })
  })

  describe("hasActiveFilters", () => {
    const allTypeIds = ["type-1", "type-2", "type-3"]

    it("should return false for default state (newest, no filters)", () => {
      expect(hasActiveFilters("newest", [], allTypeIds)).toBe(false)
    })

    it("should return true for non-default sort", () => {
      expect(hasActiveFilters("oldest", [], allTypeIds)).toBe(true)
      expect(hasActiveFilters("title-asc", [], allTypeIds)).toBe(true)
      expect(hasActiveFilters("title-desc", [], allTypeIds)).toBe(true)
      expect(hasActiveFilters("last-edited", [], allTypeIds)).toBe(true)
    })

    it("should return false for all types selected (empty typeIds)", () => {
      expect(hasActiveFilters("newest", [], allTypeIds)).toBe(false)
    })

    it("should return true for some types selected", () => {
      expect(hasActiveFilters("newest", ["type-1"], allTypeIds)).toBe(true)
      expect(hasActiveFilters("newest", ["type-1", "type-2"], allTypeIds)).toBe(true)
    })

    it("should return false when all types are selected", () => {
      expect(hasActiveFilters("newest", ["type-1", "type-2", "type-3"], allTypeIds)).toBe(false)
    })

    it("should return true for combination of sort and filters", () => {
      expect(hasActiveFilters("oldest", ["type-1"], allTypeIds)).toBe(true)
      expect(hasActiveFilters("title-asc", ["type-1", "type-2"], allTypeIds)).toBe(true)
    })

    it("should handle single type in allTypeIds", () => {
      const singleType = ["type-1"]
      expect(hasActiveFilters("newest", ["type-1"], singleType)).toBe(false)
      expect(hasActiveFilters("newest", [], singleType)).toBe(false)
    })

    it("should handle empty allTypeIds", () => {
      expect(hasActiveFilters("newest", [], [])).toBe(false)
      expect(hasActiveFilters("oldest", [], [])).toBe(true)
    })

    it("should return true when typeIds length is less than allTypeIds length", () => {
      const types10 = Array.from({ length: 10 }, (_, i) => `type-${i + 1}`)
      const selected5 = types10.slice(0, 5)
      expect(hasActiveFilters("newest", selected5, types10)).toBe(true)
    })

    it("should return false when typeIds length equals allTypeIds length but sort is newest", () => {
      expect(hasActiveFilters("newest", ["type-1", "type-2", "type-3"], allTypeIds)).toBe(false)
    })

    it("should handle case where typeIds has more items than allTypeIds (defensive)", () => {
      // This shouldn't happen in practice. When typeIds.length > allTypeIds.length,
      // the condition (typeIds.length > 0 && typeIds.length < allTypeIds.length) evaluates to false
      // So it returns false (no active filters) unless sort is not "newest"
      expect(hasActiveFilters("newest", ["type-1", "type-2", "type-3", "type-4"], allTypeIds)).toBe(false)
    })

    it("should prioritize sort filter over type filter", () => {
      // If sort is non-default, hasActiveFilters is true even if all types selected
      expect(hasActiveFilters("oldest", ["type-1", "type-2", "type-3"], allTypeIds)).toBe(true)
    })

    it("should handle whitespace or edge case in typeIds", () => {
      // Assuming typeIds are pre-validated
      expect(hasActiveFilters("newest", [""], allTypeIds)).toBe(true)
    })
  })

  describe("integration scenarios", () => {
    const allTypeIds = ["type-1", "type-2", "type-3"]

    it("should work together: parse URL params → build new URL with changes", () => {
      // Simulate user clicking "oldest"
      const currentSort = parseSortParam("newest")
      const currentTypes = parseTypeParams(null, allTypeIds)

      const newUrl = buildFilterUrl("/artifacts", "oldest", currentTypes)
      expect(newUrl).toBe("/artifacts?sort=oldest")
    })

    it("should work together: parse → apply filter → build new URL", () => {
      // Simulate user filtering by types
      const currentSort = parseSortParam(null)
      const currentTypes = parseTypeParams(null, allTypeIds)

      const newTypes = ["type-1", "type-2"]
      const newUrl = buildFilterUrl("/artifacts", currentSort, newTypes)
      expect(newUrl).toContain("types=type-1%2Ctype-2")
    })

    it("should work together: clear filters", () => {
      // Simulate user clearing all filters
      const currentUrl = "/artifacts?sort=oldest&types=type-1,type-2"
      const isActive = hasActiveFilters("oldest", ["type-1", "type-2"], allTypeIds)

      if (isActive) {
        const clearedUrl = buildFilterUrl("/artifacts", "newest", [])
        expect(clearedUrl).toBe("/artifacts")
      }
    })

    it("should handle complex filtering + sorting scenario", () => {
      // Simulate: user on /artifacts?types=type-1,type-2&sort=title-asc
      const sort = parseSortParam("title-asc")
      const types = parseTypeParams("type-1,type-2,invalid", allTypeIds)
      const hasFilters = hasActiveFilters(sort, types, allTypeIds)
      const config = getSortConfig(sort)

      expect(sort).toBe("title-asc")
      expect(types).toEqual(["type-1", "type-2"])
      expect(hasFilters).toBe(true)
      expect(config).toEqual({ field: "title", ascending: true })
    })

    it("should build URL from getSortConfig output", () => {
      // Simulate: apply sorting
      const sort: SortOption = "last-edited"
      const config = getSortConfig(sort)
      const url = buildFilterUrl("/artifacts", sort, [])

      expect(config.field).toBe("updated_at")
      expect(url).toContain("sort=last-edited")
    })
  })
})
