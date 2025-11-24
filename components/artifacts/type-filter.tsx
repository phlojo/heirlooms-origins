"use client"

import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { Filter } from "lucide-react"
import { getDynamicLucideIcon } from "@/lib/utils/dynamic-icon"

interface ArtifactType {
  id: string
  name: string
  icon_name: string
}

interface TypeFilterProps {
  types: ArtifactType[]
  selectedTypes: string[]
  onChange: (typeIds: string[]) => void
}

export function TypeFilter({ types, selectedTypes, onChange }: TypeFilterProps) {
  const allSelected = selectedTypes.length === 0
  const selectedCount = selectedTypes.length

  const handleToggleType = (typeId: string) => {
    if (allSelected) {
      // If all were selected, selecting one type means only that type is selected
      onChange([typeId])
    } else if (selectedTypes.includes(typeId)) {
      // Remove this type
      const newTypes = selectedTypes.filter((id) => id !== typeId)
      // If removing the last one, go back to "all selected"
      if (newTypes.length === 0) {
        onChange([])
      } else {
        onChange(newTypes)
      }
    } else {
      // Add this type
      const newTypes = [...selectedTypes, typeId]
      // If all types are now selected, go back to "all selected"
      if (newTypes.length === types.length) {
        onChange([])
      } else {
        onChange(newTypes)
      }
    }
  }

  const handleToggleAll = () => {
    // Always go back to "all selected" state
    onChange([])
  }

  return (
    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
      <span className="text-sm font-medium text-muted-foreground shrink-0 hidden sm:inline">Type:</span>
      <Popover modal>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-9">
            <Filter className="mr-1.5 sm:mr-2 h-4 w-4" />
            <span className="hidden sm:inline">{allSelected ? "All Types" : `${selectedCount} selected`}</span>
            <span className="sm:hidden">{allSelected ? "All" : `${selectedCount}`}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[280px] p-0" align="start">
          <div className="p-3">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium">Filter by Type</h4>
              {!allSelected && (
                <Button variant="ghost" size="sm" onClick={handleToggleAll} className="h-auto p-0 text-xs">
                  Clear
                </Button>
              )}
            </div>
            <div className="space-y-1">
              <div className="flex items-center space-x-2 py-1.5 px-2">
                <Checkbox
                  id="type-all"
                  checked={allSelected}
                  onCheckedChange={handleToggleAll}
                  className="rounded-sm"
                />
                <label
                  htmlFor="type-all"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  All Types
                </label>
              </div>
              <div className="h-px bg-border my-1" />
              {types.map((type) => {
                const Icon = getDynamicLucideIcon(type.icon_name)
                const isChecked = allSelected || selectedTypes.includes(type.id)

                return (
                  <div key={type.id} className="flex items-center space-x-2 py-1.5 px-2">
                    <Checkbox
                      id={`type-${type.id}`}
                      checked={isChecked}
                      onCheckedChange={() => handleToggleType(type.id)}
                      className="rounded-sm"
                    />
                    <label
                      htmlFor={`type-${type.id}`}
                      className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex items-center gap-2"
                    >
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      {type.name}
                    </label>
                  </div>
                )
              })}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
