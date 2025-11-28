"use client"

import { useState, useEffect } from "react"
import { type ArtifactMediaWithDerivatives, type UserMediaWithDerivatives } from "@/lib/types/media"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { X, Plus, Image as ImageIcon, GripVertical } from "lucide-react"
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
  const isImage = media.media_type === "image"
  const isVideo = media.media_type === "video"

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <Card
      ref={setNodeRef}
      style={style}
      data-media-id={item.media_id}
      className="w-auto inline-flex items-center justify-center gap-1 p-3 rounded-sm"
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="flex-shrink-0 flex items-center justify-center cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="h-5 w-5 text-muted-foreground" />
      </div>

      {/* Thumbnail */}
      <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded bg-muted flex items-center justify-center">
        {isImage && (
          <img
            src={media.thumbnailUrl || media.public_url}
            alt={media.filename}
            className="h-full w-full object-cover"
          />
        )}
        {isVideo && (
          <div className="relative h-full w-full flex items-center justify-center">
            {media.thumbnailUrl ? (
              <img
                src={media.thumbnailUrl}
                alt={media.filename}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center bg-black">
                <ImageIcon className="h-6 w-6 text-white/50" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-shrink-0 flex items-center justify-center">
        <p className="text-xs text-muted-foreground capitalize">
          {media.media_type}
        </p>
      </div>

      {/* Remove Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onRemove(item.id, media.filename)}
        className="text-destructive hover:bg-destructive/10 flex-shrink-0 inline-flex items-center justify-center"
      >
        <X className="h-4 w-4" />
      </Button>
    </Card>
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

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

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
    try {
      // Add each selected media to gallery
      for (const media of selectedMedia) {
        const result = await createArtifactMediaLink({
          artifact_id: artifactId,
          media_id: media.id,
          role: "gallery",
          sort_order: galleryMedia.length,
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
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold">Gallery</h3>
            <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
              Auto-saved
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Media carousel displayed at the top of your artifact page. Drag to reorder, changes save automatically.
          </p>
        </div>
        <Button onClick={() => setIsPickerOpen(true)} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Add to Gallery
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
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={items.map(item => item.id)}
            strategy={horizontalListSortingStrategy}
          >
            <div className="gallery-grid h-[192px] relative overflow-x-auto overflow-y-hidden whitespace-nowrap">
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
            gap: 4px;
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
