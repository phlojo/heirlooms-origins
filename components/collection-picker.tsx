"use client"

import { useState, useEffect, useRef } from "react"
import { ChevronDown, Plus } from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"
import { SectionTitle } from "@/components/ui/section-title"
import { CollectionPickerCard, type CollectionPickerItem } from "@/components/collection-picker-card"
import { getMyCollectionsWithThumbnails } from "@/lib/actions/collections"
import { Skeleton } from "@/components/ui/skeleton"

interface CollectionPickerProps {
  userId: string
  selectedCollectionId?: string | null
  onSelectCollection: (collectionId: string | null) => void
  required?: boolean
  defaultOpen?: boolean
  storageKey?: string
  onCreateNew?: () => void
}

/**
 * Collection picker with collapsible grid of collection thumbnail cards
 * Behaves like ArtifactTypeSelector with localStorage state persistence
 */
export function CollectionPicker({
  userId,
  selectedCollectionId,
  onSelectCollection,
  required = false,
  defaultOpen = false,
  storageKey,
  onCreateNew,
}: CollectionPickerProps) {
  // Initialize with defaultOpen to avoid hydration mismatch
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const [hasHydrated, setHasHydrated] = useState(false)

  const [collections, setCollections] = useState<CollectionPickerItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [canScrollDown, setCanScrollDown] = useState(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Check if there's more content to scroll
  const checkScrollability = () => {
    const container = scrollContainerRef.current
    if (container) {
      const hasMoreBelow = container.scrollHeight > container.clientHeight + container.scrollTop + 5
      setCanScrollDown(hasMoreBelow)
    }
  }

  // Sync from localStorage after hydration
  useEffect(() => {
    if (storageKey) {
      const stored = localStorage.getItem(storageKey)
      if (stored !== null) {
        setIsOpen(stored === "true")
      }
    }
    setHasHydrated(true)
  }, [storageKey])

  // Persist open state to localStorage (only after hydration)
  useEffect(() => {
    if (hasHydrated && storageKey) {
      localStorage.setItem(storageKey, String(isOpen))
    }
  }, [isOpen, storageKey, hasHydrated])

  // Fetch collections on mount
  useEffect(() => {
    async function fetchCollections() {
      setIsLoading(true)
      const result = await getMyCollectionsWithThumbnails(userId)
      if (!result.error) {
        setCollections(result.collections)
      }
      setIsLoading(false)
    }
    fetchCollections()
  }, [userId])

  // Check scrollability after collections load
  useEffect(() => {
    if (!isLoading && collections.length > 0) {
      // Small delay to ensure DOM has updated
      const timer = setTimeout(checkScrollability, 100)
      return () => clearTimeout(timer)
    }
  }, [isLoading, collections.length])

  const selectedCollection = selectedCollectionId
    ? collections.find((c) => c.id === selectedCollectionId)
    : null

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="rounded-md border border-input bg-transparent dark:bg-input/30 shadow-xs">
        <CollapsibleTrigger className="flex w-full items-center justify-between px-3 py-2 hover:opacity-80 transition-opacity">
          <div className="flex items-center gap-2">
            <SectionTitle className="pl-0">
              Collection:{required && <span className="text-destructive">*</span>}
            </SectionTitle>
            {selectedCollection ? (
              <span className="text-sm text-foreground">{selectedCollection.title}</span>
            ) : (
              <span className="text-sm text-muted-foreground">Select a collection</span>
            )}
          </div>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground opacity-50 transition-transform",
              isOpen && "rotate-180"
            )}
          />
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-3 pb-3">
            {isLoading ? (
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="flex flex-col gap-1.5 p-2">
                    <Skeleton className="aspect-square w-full rounded-md" />
                    <Skeleton className="h-3 w-3/4 mx-auto" />
                    <Skeleton className="h-2 w-1/2 mx-auto" />
                  </div>
                ))}
              </div>
            ) : collections.length === 0 ? (
              <div className="py-6 text-center">
                <p className="text-sm text-muted-foreground mb-3">No collections yet</p>
                {onCreateNew && (
                  <button
                    type="button"
                    onClick={onCreateNew}
                    className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                  >
                    <Plus className="h-4 w-4" />
                    Create your first collection
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* Scrollable container - shows 2.5 rows max */}
                <div className="relative">
                  <div
                    ref={scrollContainerRef}
                    onScroll={checkScrollability}
                    className="max-h-[280px] overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent"
                    style={{ scrollbarGutter: 'stable' }}
                  >
                    <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 pb-1">
                      {collections.map((collection) => (
                        <CollectionPickerCard
                          key={collection.id}
                          collection={collection}
                          isSelected={selectedCollectionId === collection.id}
                          onClick={() => {
                            if (selectedCollectionId === collection.id && !required) {
                              onSelectCollection(null)
                            } else {
                              onSelectCollection(collection.id)
                            }
                          }}
                        />
                      ))}
                    </div>
                  </div>
                  {/* Subtle scroll indicator - gradient fade at bottom */}
                  <div
                    className={cn(
                      "pointer-events-none absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-background/80 to-transparent transition-opacity duration-200",
                      canScrollDown ? "opacity-100" : "opacity-0"
                    )}
                  />
                </div>

                {!required && selectedCollectionId && (
                  <p className="mt-3 text-xs text-muted-foreground text-center">
                    Tap again to deselect
                  </p>
                )}
              </>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}

export default CollectionPicker
