/**
 * Utilities for artifact filtering and sorting
 */

export type SortOption = "newest" | "oldest" | "title-asc" | "title-desc" | "last-edited"

export const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "title-asc", label: "Title A–Z" },
  { value: "title-desc", label: "Title Z–A" },
  { value: "last-edited", label: "Last Edited" },
]

/**
 * Parse and validate sort parameter from URL
 */
export function parseSortParam(param: string | null): SortOption {
  const validSorts: SortOption[] = ["newest", "oldest", "title-asc", "title-desc", "last-edited"]
  return validSorts.includes(param as SortOption) ? (param as SortOption) : "newest"
}

/**
 * Parse and validate type IDs from URL parameter
 */
export function parseTypeParams(param: string | null, validTypeIds: string[]): string[] {
  if (!param) return []
  const types = param.split(",").filter((id) => validTypeIds.includes(id))
  return types
}

/**
 * Build URL with filter parameters
 */
export function buildFilterUrl(
  basePath: string,
  sort: SortOption,
  typeIds: string[],
  tab?: string,
  view?: string,
): string {
  const params = new URLSearchParams()
  if (tab && tab !== "all") params.set("tab", tab)
  if (view) params.set("view", view)
  if (sort !== "newest") params.set("sort", sort)
  if (typeIds.length > 0) {
    params.set("types", typeIds.join(","))
  }
  const query = params.toString()
  return query ? `${basePath}?${query}` : basePath
}

/**
 * Get sort field and direction for Supabase query
 */
export function getSortConfig(sortBy: SortOption): {
  field: "created_at" | "updated_at" | "title"
  ascending: boolean
} {
  switch (sortBy) {
    case "newest":
      return { field: "created_at", ascending: false }
    case "oldest":
      return { field: "created_at", ascending: true }
    case "title-asc":
      return { field: "title", ascending: true }
    case "title-desc":
      return { field: "title", ascending: false }
    case "last-edited":
      return { field: "updated_at", ascending: false }
  }
}

/**
 * Check if any filters are active (non-default)
 */
export function hasActiveFilters(sort: SortOption, typeIds: string[], allTypeIds: string[]): boolean {
  return sort !== "newest" || (typeIds.length > 0 && typeIds.length < allTypeIds.length)
}
