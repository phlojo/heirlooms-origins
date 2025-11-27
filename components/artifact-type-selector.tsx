"use client"

import { useState, useEffect } from "react"
import { ChevronDown } from "lucide-react"
import { getDynamicLucideIcon } from "@/lib/utils/dynamic-icon"
import type { ArtifactType } from "@/lib/types/artifact-types"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"

interface ArtifactTypeSelectorProps {
  types: ArtifactType[]
  selectedTypeId?: string | null
  onSelectType: (typeId: string | null) => void
  required?: boolean
  defaultOpen?: boolean
  storageKey?: string
}

function ArtifactTypeSelector({
  types,
  selectedTypeId,
  onSelectType,
  required = false,
  defaultOpen = false,
  storageKey,
}: ArtifactTypeSelectorProps) {
  const [isOpen, setIsOpen] = useState(() => {
    if (!storageKey || typeof window === "undefined") {
      return defaultOpen
    }
    const stored = localStorage.getItem(storageKey)
    return stored !== null ? stored === "true" : defaultOpen
  })

  useEffect(() => {
    if (storageKey && typeof window !== "undefined") {
      localStorage.setItem(storageKey, String(isOpen))
    }
  }, [isOpen, storageKey])

  console.log("[v0] ArtifactTypeSelector rendering with types:", types)
  console.log("[v0] Selected type ID:", selectedTypeId)

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex w-full items-center justify-between hover:opacity-80 transition-opacity">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-medium text-foreground">
            Type:{required && <span className="text-destructive">*</span>}
          </h2>
          {selectedTypeId && (() => {
            const selectedType = types.find((t) => t.id === selectedTypeId)
            if (!selectedType) return null
            const Icon = getDynamicLucideIcon(selectedType.icon_name)
            return (
              <div className="flex items-center gap-1.5">
                {Icon && <Icon className="h-4 w-4 text-foreground" />}
                <span className="text-sm font-medium text-foreground">{selectedType.name}</span>
              </div>
            )
          })()}
        </div>
        <ChevronDown className={cn("h-5 w-5 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="mt-2 rounded-lg border bg-card p-4">
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
            {types.map((type) => {
              const Icon = getDynamicLucideIcon(type.icon_name)
              const isSelected = selectedTypeId === type.id

              console.log("[v0] Rendering type:", type.name, "Icon:", Icon?.name, "Selected:", isSelected)

              return (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => {
                    console.log("[v0] Type clicked:", type.name, type.id)
                    // Toggle selection: if already selected and not required, deselect
                    if (isSelected && !required) {
                      onSelectType(null)
                    } else {
                      onSelectType(type.id)
                    }
                  }}
                  className={cn(
                    "relative flex flex-col items-center justify-center gap-1.5 rounded-lg p-3 transition-all",
                    "border-2 hover:bg-accent/50 active:scale-95",
                    isSelected
                      ? "border-primary bg-accent font-medium text-foreground"
                      : "border-transparent bg-muted/30 text-muted-foreground hover:text-foreground",
                  )}
                >
                  {Icon ? (
                    <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
                  ) : (
                    <div className="h-5 w-5 sm:h-6 sm:w-6 rounded bg-muted" />
                  )}

                  <span className="text-[10px] sm:text-[11px] leading-tight text-center break-words">{type.name}</span>

                  {isSelected && (
                    <div className="absolute bottom-0 left-1/2 h-1 w-8 -translate-x-1/2 rounded-t-full bg-primary" />
                  )}
                </button>
              )
            })}
          </div>

          {!required && selectedTypeId && (
            <p className="mt-3 text-xs text-muted-foreground text-center">Tap again to deselect</p>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

export { ArtifactTypeSelector }
export default ArtifactTypeSelector
