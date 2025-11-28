"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { X, Image as ImageIcon, GripVertical, Pencil } from "lucide-react"
import { SectionTitle } from "@/components/ui/section-title"
import { HelpText } from "@/components/ui/help-text"
import { AddMediaModal } from "@/components/add-media-modal"
import { cn } from "@/lib/utils"
import { isImageUrl, isVideoUrl } from "@/lib/media"
import { getThumbnailUrl } from "@/lib/cloudinary"
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

interface NewArtifactGalleryEditorProps {
  mediaUrls: string[]
  onMediaUrlsChange: (urls: string[]) => void
  userId: string
}

interface SortableItemProps {
  id: string
  url: string
  onRemove: (url: string) => void
}

function SortableItem({ id, url, onRemove }: SortableItemProps) {
  const thumbnailSrc = getThumbnailUrl(url, null) || url
  const isVideo = isVideoUrl(url)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  return (
    <div
      ref={setNodeRef}
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
          alt="Media thumbnail"
          className="h-16 w-16 rounded object-cover bg-muted"
        />
        <span className="text-xs text-muted-foreground capitalize">
          {isVideo ? "video" : "image"}
        </span>
      </div>

      {/* Remove Button (not draggable) */}
      <button
        type="button"
        onClick={() => onRemove(url)}
        className="p-2 text-destructive hover:bg-destructive/10 rounded"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

/**
 * Gallery editor for new artifact creation
 * Works with raw URLs instead of database records
 */
export function NewArtifactGalleryEditor({
  mediaUrls,
  onMediaUrlsChange,
  userId,
}: NewArtifactGalleryEditorProps) {
  const [isPickerOpen, setIsPickerOpen] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)

  // Filter to only visual media (images and videos)
  const visualMediaUrls = mediaUrls.filter(url => isImageUrl(url) || isVideoUrl(url))

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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    setActiveId(null)
    setOverId(null)

    if (!over || active.id === over.id) {
      return
    }

    const oldIndex = visualMediaUrls.findIndex((url) => url === active.id)
    const newIndex = visualMediaUrls.findIndex((url) => url === over.id)

    const newVisualUrls = arrayMove(visualMediaUrls, oldIndex, newIndex)

    // Preserve audio URLs at the end (they're not in the gallery)
    const audioUrls = mediaUrls.filter(url => !isImageUrl(url) && !isVideoUrl(url))
    onMediaUrlsChange([...newVisualUrls, ...audioUrls])
  }

  const handleAddMedia = (newUrls: string[]) => {
    const combinedUrls = [...mediaUrls, ...newUrls]
    const uniqueUrls = Array.from(new Set(combinedUrls))
    onMediaUrlsChange(uniqueUrls)
    setIsPickerOpen(false)
  }

  const handleRemove = (urlToRemove: string) => {
    onMediaUrlsChange(mediaUrls.filter(url => url !== urlToRemove))
  }

  return (
    <div className="space-y-4 pt-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <SectionTitle>Gallery</SectionTitle>
        <div className="flex-1" />
        <div className="shrink-0 h-7 w-7 flex items-center justify-center rounded-full border-2 border-purple-600">
          <Pencil className="h-3.5 w-3.5 text-purple-600" />
        </div>
      </div>
      <div className="flex items-end justify-between gap-4">
        <HelpText>
          Media carousel displayed at the top of your artifact page. Drag to reorder.
        </HelpText>
        <Button
          type="button"
          onClick={() => setIsPickerOpen(true)}
          size="sm"
          className="bg-purple-600 hover:bg-purple-700 text-white flex-shrink-0"
        >
          Edit Gallery
        </Button>
      </div>

      {/* Gallery Grid */}
      {visualMediaUrls.length === 0 ? (
        <Card className="flex h-40 flex-col items-center justify-center gap-2 border-dashed rounded-sm">
          <ImageIcon className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No media in gallery</p>
          <Button type="button" onClick={() => setIsPickerOpen(true)} size="sm" variant="outline">
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
              items={visualMediaUrls}
              strategy={horizontalListSortingStrategy}
            >
              <div className="gallery-grid relative overflow-x-auto overflow-y-hidden whitespace-nowrap">
                {visualMediaUrls.map((url) => (
                  <SortableItem
                    key={url}
                    id={url}
                    url={url}
                    onRemove={handleRemove}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          {/* Page dots indicator */}
          <div className="flex justify-center gap-1.5">
            {(() => {
              const activeIndex = activeId ? visualMediaUrls.indexOf(activeId) : -1
              const overIndex = overId ? visualMediaUrls.indexOf(overId) : -1
              const projectedItems = activeIndex !== -1 && overIndex !== -1 && activeIndex !== overIndex
                ? arrayMove(visualMediaUrls, activeIndex, overIndex)
                : visualMediaUrls

              return projectedItems.map((url) => {
                const isActive = url === activeId
                return (
                  <div
                    key={url}
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

      {/* Add Media Modal */}
      <AddMediaModal
        open={isPickerOpen}
        onOpenChange={setIsPickerOpen}
        artifactId={null}
        userId={userId}
        onMediaAdded={handleAddMedia}
      />

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
