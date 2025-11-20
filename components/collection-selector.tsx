"use client"

import { useState, useEffect } from "react"
import { getMyCollections } from "@/lib/actions/collections"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FormControl, FormLabel, FormMessage } from "@/components/ui/form"

interface CollectionSelectorProps {
  userId: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

export function CollectionSelector({ userId, value, onChange, disabled }: CollectionSelectorProps) {
  const [collections, setCollections] = useState<Array<{ id: string; title: string; slug: string }>>([])
  const [isLoading, setIsLoading] = useState(true)

  console.log("[v0] CollectionSelector - Rendering with props:", { userId, value, disabled })

  useEffect(() => {
    const fetchCollections = async () => {
      console.log("[v0] CollectionSelector - Fetching collections for userId:", userId)
      setIsLoading(true)
      const result = await getMyCollections(userId)
      console.log("[v0] CollectionSelector - Fetch result:", result)
      if (!result.error) {
        setCollections(result.collections)
        console.log("[v0] CollectionSelector - Set collections:", result.collections.length)
      } else {
        console.error("[v0] CollectionSelector - Error fetching:", result.error)
      }
      setIsLoading(false)
    }

    fetchCollections()
  }, [userId])

  if (isLoading) {
    console.log("[v0] CollectionSelector - Showing loading state")
    return (
      <div className="space-y-2">
        <FormLabel>Collection</FormLabel>
        <div className="h-9 w-full rounded-md border border-input bg-muted/30 animate-pulse" />
      </div>
    )
  }

  console.log("[v0] CollectionSelector - Rendering selector with", collections.length, "collections")

  return (
    <div className="space-y-2">
      <FormLabel>Collection</FormLabel>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <FormControl>
          <SelectTrigger className="w-full text-base md:text-sm">
            <SelectValue placeholder="Choose a collection" />
          </SelectTrigger>
        </FormControl>
        <SelectContent className="text-base md:text-sm">
          {collections.map((collection) => (
            <SelectItem key={collection.id} value={collection.id} className="text-base md:text-sm">
              {collection.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FormMessage />
    </div>
  )
}
