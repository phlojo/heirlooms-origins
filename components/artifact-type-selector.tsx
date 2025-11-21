"use client"

import { useState, useEffect } from "react"
import { getArtifactTypes } from "@/lib/actions/artifact-types"
import type { ArtifactType } from "@/lib/types/artifact-types"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FormControl, FormLabel, FormDescription } from "@/components/ui/form"
import * as LucideIcons from "lucide-react"

interface ArtifactTypeSelectorProps {
  value: string | null | undefined
  onChange: (value: string | null) => void
  disabled?: boolean
  required?: boolean
  collectionPrimaryTypeId?: string | null
}

/**
 * ArtifactTypeSelector - Select artifact type from dynamic database
 *
 * Features:
 * - Loads types from database (future-expandable)
 * - Shows icon preview for each type
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
        <div className="h-9 w-full rounded-md border border-input bg-muted/30 animate-pulse" />
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <FormLabel>Type {!required && <span className="text-muted-foreground">(optional)</span>}</FormLabel>
      <Select
        value={value || "none"}
        onValueChange={(val) => onChange(val === "none" ? null : val)}
        disabled={disabled}
      >
        <FormControl>
          <SelectTrigger className="w-full text-base md:text-sm">
            <SelectValue placeholder="Select artifact type" />
          </SelectTrigger>
        </FormControl>
        <SelectContent className="text-base md:text-sm">
          {!required && (
            <SelectItem value="none" className="text-base md:text-sm text-muted-foreground">
              No type selected
            </SelectItem>
          )}
          {types.map((type) => {
            // Get the Lucide icon component dynamically
            const IconComponent = (LucideIcons as any)[type.icon_name] || LucideIcons.Package

            return (
              <SelectItem key={type.id} value={type.id} className="text-base md:text-sm">
                <div className="flex items-center gap-2">
                  <IconComponent className="h-4 w-4 text-muted-foreground" />
                  <span>{type.name}</span>
                </div>
              </SelectItem>
            )
          })}
        </SelectContent>
      </Select>
      <FormDescription className="text-xs">Categorize your artifact by type</FormDescription>
    </div>
  )
}
