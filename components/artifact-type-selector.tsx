"use client"

import { useState, useEffect } from "react"
import { getArtifactTypes } from "@/lib/actions/artifact-types"
import type { ArtifactType } from "@/lib/types/artifact-types"
import { FormLabel, FormDescription } from "@/components/ui/form"
import * as LucideIcons from "lucide-react"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface ArtifactTypeSelectorProps {
  value: string | null | undefined
  onChange: (value: string | null) => void
  disabled?: boolean
  required?: boolean
  collectionPrimaryTypeId?: string | null
}

/**
 * ArtifactTypeSelector - Modern visual picker for artifact types
 *
 * Features:
 * - Loads types from database (future-expandable)
 * - Shows icon and label in grid layout
 * - Preselects collection's primary type if available
 * - Allows clearing selection (optional field)
 */
export function ArtifactTypeSelector({
  value,
  onChange,
  disabled,
  required = false,
  collectionPrimaryTypeId,
}: ArtifactTypeSelectorProps) {
  const [types, setTypes] = useState<ArtifactType[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchTypes = async () => {
      setIsLoading(true)
      const fetchedTypes = await getArtifactTypes()
      setTypes(fetchedTypes)

      if (!value && collectionPrimaryTypeId && fetchedTypes.length > 0) {
        const primaryType = fetchedTypes.find((t) => t.id === collectionPrimaryTypeId)
        if (primaryType) {
          onChange(primaryType.id)
        }
      }

      setIsLoading(false)
    }

    fetchTypes()
  }, [collectionPrimaryTypeId, value, onChange])

  if (isLoading) {
    return (
      <div className="space-y-2">
        <FormLabel>Type {!required && <span className="text-muted-foreground">(optional)</span>}</FormLabel>
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="aspect-square rounded-2xl border bg-muted/30 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <FormLabel>Type {!required && <span className="text-muted-foreground">(optional)</span>}</FormLabel>

      <div className="grid grid-cols-3 gap-3">
        {types.map((type) => {
          const IconComponent = (LucideIcons as any)[type.icon_name] || LucideIcons.Package
          const isSelected = value === type.id

          return (
            <button
              key={type.id}
              type="button"
              disabled={disabled}
              onClick={() => {
                if (isSelected && !required) {
                  onChange(null)
                } else {
                  onChange(type.id)
                }
              }}
              className={cn(
                "relative flex flex-col items-center justify-center gap-2 rounded-2xl border-2 p-4 transition-all",
                "hover:border-primary/50 hover:bg-accent/50",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                isSelected ? "border-primary bg-primary/5 shadow-sm" : "border-border bg-background",
              )}
            >
              {/* Selected indicator */}
              {isSelected && (
                <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                  <Check className="h-3 w-3 text-primary-foreground" />
                </div>
              )}

              {/* Icon */}
              <IconComponent
                className={cn("h-8 w-8 transition-colors", isSelected ? "text-primary" : "text-muted-foreground")}
              />

              {/* Label */}
              <span
                className={cn(
                  "text-xs font-medium text-center leading-tight",
                  isSelected ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {type.name}
              </span>
            </button>
          )
        })}
      </div>

      <FormDescription className="text-xs">
        {required ? "Select a type for this artifact" : "Tap again to deselect"}
      </FormDescription>
    </div>
  )
}
