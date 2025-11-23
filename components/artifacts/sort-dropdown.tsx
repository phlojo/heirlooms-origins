"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SORT_OPTIONS, type SortOption } from "@/lib/utils/artifact-filters"
import { ArrowUpDown } from "lucide-react"

interface SortDropdownProps {
  value: SortOption
  onChange: (value: SortOption) => void
}

export function SortDropdown({ value, onChange }: SortDropdownProps) {
  return (
    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
      <span className="text-sm font-medium text-muted-foreground shrink-0 hidden sm:inline">Sort:</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-[148px] sm:w-[180px] h-9">
          <div className="flex items-center gap-2">
            <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
            <SelectValue />
          </div>
        </SelectTrigger>
        <SelectContent>
          {SORT_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
