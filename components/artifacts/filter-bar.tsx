"use client"

import { Button } from "@/components/ui/button"
import { X } from "lucide-react"
import { SortDropdown } from "./sort-dropdown"
import { TypeFilter } from "./type-filter"
import type { SortOption } from "@/lib/utils/artifact-filters"

interface ArtifactType {
  id: string
  name: string
  icon_name: string
}

interface FilterBarProps {
  sortBy: SortOption
  selectedTypes: string[]
  artifactTypes: ArtifactType[]
  onSortChange: (sort: SortOption) => void
  onTypeChange: (types: string[]) => void
  onClearFilters: () => void
  hasActiveFilters: boolean
}

export function FilterBar({
  sortBy,
  selectedTypes,
  artifactTypes,
  onSortChange,
  onTypeChange,
  onClearFilters,
  hasActiveFilters,
}: FilterBarProps) {
  return (
    <div className="py-3 space-y-2">
      <div className="flex flex-row gap-2 items-center justify-between">
        <div className="flex flex-row gap-2 items-center min-w-0 flex-1">
          <SortDropdown value={sortBy} onChange={onSortChange} />
          <TypeFilter types={artifactTypes} selectedTypes={selectedTypes} onChange={onTypeChange} />
        </div>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={onClearFilters} className="h-9 shrink-0">
            <X className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Clear Filters</span>
            <span className="sm:hidden">Clear</span>
          </Button>
        )}
      </div>
    </div>
  )
}
