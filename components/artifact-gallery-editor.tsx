"use client"

import { useState, useEffect } from "react"
import { type ArtifactMediaWithDerivatives, type UserMediaWithDerivatives } from "@/lib/types/media"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { X, Image as ImageIcon, GripVertical, Pencil } from "lucide-react"
import { SectionTitle } from "@/components/ui/section-title"
import { HelpText } from "@/components/ui/help-text"
import {
  createArtifactMediaLink,
  removeArtifactMediaLink,
  reorderArtifactMedia,
} from "@/lib/actions/media"
import { MediaPicker } from "@/components/media-picker"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface ArtifactGalleryEditorProps {
  artifactId: string
  galleryMedia: ArtifactMediaWithDerivatives[]
  onUpdate: () => void
}

interface SortableItemProps {
  item: ArtifactMediaWithDerivatives
  onRemove: (linkId: string, filename: string) => void
}

function SortableItem({ item, onRemove }: SortableItemProps) {
  const media = item.media
  const thumbnailSrc = media.thumbnailUrl || media.public_url

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id })

  return (
    <div
      ref={setNodeRef}
      data-media-id={item.media_id}
      className="flex flex-col items-center gap-1 p-2 border rounded bg-card shadow-sm w-24 shrink-0"
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
    >
      {/* Draggable area */}
      <div
        {...attributes}
        {...listeners}
        className="flex flex-col items-center gap-1 cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="h-5 w-5 text-muted-foreground" />
        <img
          src={thumbnailSrc}
          alt={media.filename}
          className="h-16 w-16 rounded object-cover bg-muted"
        />
        <span className="text-xs text-muted-foreground capitalize">
          {media.media_type}
        </span>
      </div>

      {/* Remove Button (not draggable) */}
      <button
        onClick={() => onRemove(item.id, media.filename)}
        className="p-2 text-destructive hover:bg-destructive/10 rounded"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

/**
 * Gallery management section for artifact editor
 * Allows adding, removing, and reordering gallery media with drag-and-drop
 */
export function ArtifactGalleryEditor({
  artifactId,
  galleryMedia,
  onUpdate,
}: ArtifactGalleryEditorProps) {
  const [isPickerOpen, setIsPickerOpen] = useState(false)
  const [isReordering, setIsReordering] = useState(false)
  const [items, setItems] = useState(galleryMedia)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)

  // Sync items with galleryMedia when it changes (for add/remove operations)
  useEffect(() => {
    setItems(galleryMedia)
  }, [galleryMedia])

  // Get existing gallery media URLs to exclude from picker
  const existingUrls = galleryMedia.map((item) => item.media.public_url)

  // Configure drag sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragOver = (event: DragOverEvent) => {
    setOverId(event.over?.id as string | null)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    // Reset drag state
    setActiveId(null)
    setOverId(null)

    if (!over || active.id === over.id) {
      return
    }

    const oldIndex = items.findIndex((item) => item.id === active.id)
    const newIndex = items.findIndex((item) => item.id === over.id)

    // Optimistically update UI
    const newItems = arrayMove(items, oldIndex, newIndex)
    setItems(newItems)

    // Save to database
    setIsReordering(true)
    try {
      const reorders = newItems.map((item, idx) => ({
        media_id: item.media_id,
        new_sort_order: idx,
      }))

      const result = await reorderArtifactMedia({
        artifact_id: artifactId,
        role: "gallery",
        reorders,
      })

      if (result.error) {
        toast.error(`Failed to reorder: ${result.error}`)
        // Revert on error
        setItems(galleryMedia)
        return
      }

      toast.success("Reordered successfully")
      // Don't call onUpdate() - we're using optimistic updates, no need to refetch
    } catch (error) {
      console.error("[GalleryEditor] Error reordering:", error)
      toast.error("Failed to reorder media")
      // Revert on error
      setItems(galleryMedia)
    } finally {
      setIsReordering(false)
    }
  }

  const handleAddMedia = async (selectedMedia: UserMediaWithDerivatives[]) => {
    console.log("[GalleryEditor] handleAddMedia called with:", selectedMedia.length, "items")
    try {
      // Add each selected media to gallery
      for (let i = 0; i < selectedMedia.length; i++) {
        const media = selectedMedia[i]
        const result = await createArtifactMediaLink({
          artifact_id: artifactId,
          media_id: media.id,
          role: "gallery",
          sort_order: galleryMedia.length + i,
        })

        if (result.error) {
          toast.error(`Failed to add ${media.filename}: ${result.error}`)
          return
        }
      }

      toast.success(`Added ${selectedMedia.length} item${selectedMedia.length > 1 ? "s" : ""} to gallery`)
      setIsPickerOpen(false)
      onUpdate()
    } catch (error) {
      console.error("[GalleryEditor] Error adding media:", error)
      toast.error("Failed to add media to gallery")
    }
  }

  const handleRemove = async (linkId: string, filename: string) => {
    try {
      const result = await removeArtifactMediaLink(linkId)

      if (result.error) {
        toast.error(`Failed to remove ${filename}: ${result.error}`)
        return
      }

      toast.success(`Removed ${filename} from gallery`)
      onUpdate()
    } catch (error) {
      console.error("[GalleryEditor] Error removing media:", error)
      toast.error("Failed to remove media")
    }
  }

  return (
    <div className="space-y-4 pt-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <SectionTitle>Gallery</SectionTitle>
        <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
          Auto-saved
        </span>
        <div className="flex-1" />
        <div className="shrink-0 h-7 w-7 flex items-center justify-center rounded-full border-2 border-purple-600">
          <Pencil className="h-3.5 w-3.5 text-purple-600" />
        </div>
      </div>
      <div className="flex items-end justify-between gap-4">
        <HelpText>
          Media carousel displayed at the top of your artifact page. Drag to reorder, changes save automatically.
        </HelpText>
        <Button onClick={() => setIsPickerOpen(true)} size="sm" className="bg-purple-600 hover:bg-purple-700 text-white flex-shrink-0">
          Edit Gallery
        </Button>
      </div>

      {/* Gallery Grid */}
      {galleryMedia.length === 0 ? (
        <Card className="flex h-40 flex-col items-center justify-center gap-2 border-dashed rounded-sm">
          <ImageIcon className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No media in gallery</p>
          <Button onClick={() => setIsPickerOpen(true)} size="sm" variant="outline">
            Add Media
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={items.map(item => item.id)}
              strategy={horizontalListSortingStrategy}
            >
              <div className="gallery-grid relative overflow-x-auto overflow-y-hidden whitespace-nowrap">
                {items.map((item) => (
                  <SortableItem
                    key={item.id}
                    item={item}
                    onRemove={handleRemove}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          {/* Page dots indicator */}
          <div className="flex justify-center gap-1.5">
            {(() => {
              // Calculate projected order during drag
              const activeIndex = activeId ? items.findIndex(item => item.id === activeId) : -1
              const overIndex = overId ? items.findIndex(item => item.id === overId) : -1
              const projectedItems = activeIndex !== -1 && overIndex !== -1 && activeIndex !== overIndex
                ? arrayMove(items, activeIndex, overIndex)
                : items

              return projectedItems.map((item) => {
                const isActive = item.id === activeId
                return (
                  <div
                    key={item.id}
                    className={cn(
                      "h-2 rounded-full transition-all duration-200",
                      isActive
                        ? "w-6 bg-primary"
                        : "w-2 bg-muted-foreground/30"
                    )}
                  />
                )
              })
            })()}
          </div>
        </div>
      )}

      {/* Media Picker Dialog */}
      <Dialog open={isPickerOpen} onOpenChange={setIsPickerOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Add to Gallery</DialogTitle>
            <DialogDescription>
              Select media from your library to add to this artifact's gallery
            </DialogDescription>
          </DialogHeader>
          <MediaPicker
            onSelect={handleAddMedia}
            multiSelect={true}
            excludeUrls={existingUrls}
          />
        </DialogContent>
      </Dialog>

      <style dangerouslySetInnerHTML={{
        __html: `
          .gallery-grid {
            display: flex;
            gap: 8px;
          }

          /* Hide scrollbar but keep scrolling */
          .gallery-grid::-webkit-scrollbar {
            display: none !important;
          }
          .gallery-grid {
            -ms-overflow-style: none !important;
            scrollbar-width: none !important;
          }
        `
      }} />
    </div>
  )
}
