"use client"

import { useState, useEffect } from "react"
import { ChevronDown } from "lucide-react"
import { getDynamicLucideIcon } from "@/lib/utils/dynamic-icon"
import type { ArtifactType } from "@/lib/types/artifact-types"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"
import { SectionTitle } from "@/components/ui/section-title"

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

  const selectedType = selectedTypeId ? types.find((t) => t.id === selectedTypeId) : null
  const SelectedIcon = selectedType ? getDynamicLucideIcon(selectedType.icon_name) : null

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="rounded-md border border-input bg-transparent dark:bg-input/30 shadow-xs">
        <CollapsibleTrigger className="flex w-full items-center justify-between px-3 py-2 hover:opacity-80 transition-opacity">
          <div className="flex items-center gap-2">
            <SectionTitle className="pl-0">
              Type:{required && <span className="text-destructive">*</span>}
            </SectionTitle>
            {selectedType ? (
              <div className="flex items-center gap-1.5">
                {SelectedIcon && <SelectedIcon className="h-4 w-4 text-foreground" />}
                <span className="text-sm text-foreground">{selectedType.name}</span>
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">Select a category</span>
            )}
          </div>
          <ChevronDown className={cn("h-4 w-4 text-muted-foreground opacity-50 transition-transform", isOpen && "rotate-180")} />
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-3 pb-3">
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
              {types.map((type) => {
                const Icon = getDynamicLucideIcon(type.icon_name)
                const isSelected = selectedTypeId === type.id

                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => {
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
      </div>
    </Collapsible>
  )
}

export { ArtifactTypeSelector }
export default ArtifactTypeSelector
