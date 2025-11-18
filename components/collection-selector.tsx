"use client"

import { useState, useEffect } from "react"
import { getMyCollections } from "@/lib/actions/collections"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { FormControl, FormLabel, FormMessage } from "@/components/ui/form"

interface CollectionSelectorProps {
  userId: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

export function CollectionSelector({ 
  userId, 
  value, 
  onChange, 
  disabled 
}: CollectionSelectorProps) {
  const [collections, setCollections] = useState<Array<{ id: string; title: string; slug: string }>>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchCollections = async () => {
      setIsLoading(true)
      const result = await getMyCollections(userId)
      if (!result.error) {
        setCollections(result.collections)
      }
      setIsLoading(false)
    }

    fetchCollections()
  }, [userId])

  if (isLoading) {
    return (
      <div className="space-y-2">
        <FormLabel>Collection</FormLabel>
        <div className="h-9 w-full rounded-md border border-input bg-muted/30 animate-pulse" />
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <FormLabel>Collection</FormLabel>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <FormControl>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Choose a collection" />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          {collections.map((collection) => (
            <SelectItem key={collection.id} value={collection.id}>
              {collection.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FormMessage />
    </div>
  )
}
