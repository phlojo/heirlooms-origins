"use client"

import { useState, useEffect } from "react"
import { type ArtifactMediaWithDerivatives } from "@/lib/types/media"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { X, Image as ImageIcon, GripVertical, BookImage, HelpCircle, Upload, FolderOpen, Camera, Video, Mic } from "lucide-react"
import { SectionTitle } from "@/components/ui/section-title"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  createArtifactMediaLink,
  removeArtifactMediaLink,
  reorderArtifactMedia,
  createUserMediaFromUrl,
} from "@/lib/actions/media"
import { AddMediaModal } from "@/components/add-media-modal"
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
  userId: string
  galleryMedia: ArtifactMediaWithDerivatives[]
  onUpdate: () => void
  currentThumbnailUrl?: string
  onSelectThumbnail?: (url: string, e?: React.MouseEvent) => void
}

interface SortableItemProps {
  item: ArtifactMediaWithDerivatives
  onRemove: (linkId: string, filename: string) => void
  isThumbnail?: boolean
  onSelectThumbnail?: (url: string, e?: React.MouseEvent) => void
}

function SortableItem({ item, onRemove, isThumbnail, onSelectThumbnail }: SortableItemProps) {
  const media = item.media
  // Use smallThumbnailUrl (120x120) for compact reorder cards
  const thumbnailSrc = media.smallThumbnailUrl || media.thumbnailUrl || media.public_url

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
      className={cn(
        "flex flex-col items-center gap-1 p-2 border rounded bg-card shadow-sm w-24 shrink-0",
        isThumbnail && "ring-2 ring-yellow-500 border-yellow-500"
      )}
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

      {/* Action Buttons (not draggable) */}
      <div className="flex items-center gap-1">
        {onSelectThumbnail && (
          <button
            onClick={(e) => onSelectThumbnail(media.public_url, e)}
            className={cn(
              "p-1.5 rounded transition-colors",
              isThumbnail
                ? "text-yellow-500"
                : "text-muted-foreground hover:text-yellow-500 hover:bg-yellow-500/10"
            )}
            title={isThumbnail ? "Current thumbnail" : "Set as thumbnail"}
          >
            <BookImage className="h-4 w-4" />
          </button>
        )}
        <button
          onClick={() => onRemove(item.id, media.filename)}
          className="p-1.5 text-destructive hover:bg-destructive/10 rounded"
          title="Remove from gallery"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

/**
 * Gallery management section for artifact editor
 * Allows adding, removing, and reordering gallery media with drag-and-drop
 */
export function ArtifactGalleryEditor({
  artifactId,
  userId,
  galleryMedia,
  onUpdate,
  currentThumbnailUrl,
  onSelectThumbnail,
}: ArtifactGalleryEditorProps) {
  const [isPickerOpen, setIsPickerOpen] = useState(false)
  const [initialSource, setInitialSource] = useState<"new" | "existing" | null>(null)
  const [initialAction, setInitialAction] = useState<"upload" | "camera" | "video" | "audio" | null>(null)
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

  const handleAddMedia = async (urls: string[]) => {
    console.log("[GalleryEditor] handleAddMedia called with:", urls.length, "URLs")
    try {
      // Add each URL to gallery
      // First create or get user_media record, then link to artifact
      for (const url of urls) {
        // Skip if already in gallery
        if (existingUrls.includes(url)) {
          console.log("[GalleryEditor] Skipping duplicate URL:", url)
          continue
        }

        // Create or get user_media record
        const mediaResult = await createUserMediaFromUrl(url, userId)
        if (mediaResult.error || !mediaResult.data) {
          toast.error(`Failed to process media: ${mediaResult.error}`)
          continue
        }

        // Create artifact_media link
        const result = await createArtifactMediaLink({
          artifact_id: artifactId,
          media_id: mediaResult.data.id,
          role: "gallery",
        })

        if (result.error) {
          toast.error(`Failed to add media: ${result.error}`)
          return
        }
      }

      toast.success(`Added ${urls.length} item${urls.length > 1 ? "s" : ""} to gallery`)
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
    <div className="space-y-4 pt-6">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <SectionTitle>Gallery</SectionTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" className="text-muted-foreground hover:text-foreground transition-colors">
                  <HelpCircle className="h-4 w-4" />
                  <span className="sr-only">Gallery help</span>
                </button>
              </TooltipTrigger>
              <TooltipContent>
                Media carousel displayed at the top of your artifact page. Drag to reorder, changes save automatically.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
            Auto-saved
          </span>
        </div>
        <div className="flex items-center justify-between">
          <Button
            onClick={() => {
              setInitialSource("existing")
              setInitialAction(null)
              setIsPickerOpen(true)
            }}
            size="sm"
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            <FolderOpen className="h-4 w-4 mr-1.5" />
            My Media
          </Button>
          <div className="flex items-center gap-1">
            <Button
              onClick={() => {
                setInitialSource(null)
                setInitialAction("upload")
                setIsPickerOpen(true)
              }}
              size="icon"
              className="h-8 w-8 bg-purple-600 hover:bg-purple-700 text-white"
              title="Upload files"
            >
              <Upload className="h-4 w-4" />
            </Button>
            <Button
              onClick={() => {
                setInitialSource(null)
                setInitialAction("camera")
                setIsPickerOpen(true)
              }}
              size="icon"
              className="h-8 w-8 bg-purple-600 hover:bg-purple-700 text-white"
              title="Take photo"
            >
              <Camera className="h-4 w-4" />
            </Button>
            <Button
              onClick={() => {
                setInitialSource(null)
                setInitialAction("video")
                setIsPickerOpen(true)
              }}
              size="icon"
              className="h-8 w-8 bg-purple-600 hover:bg-purple-700 text-white"
              title="Record video"
            >
              <Video className="h-4 w-4" />
            </Button>
            <Button
              onClick={() => {
                setInitialSource(null)
                setInitialAction("audio")
                setIsPickerOpen(true)
              }}
              size="icon"
              className="h-8 w-8 bg-purple-600 hover:bg-purple-700 text-white"
              title="Record audio"
            >
              <Mic className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Gallery Grid */}
      {galleryMedia.length === 0 ? (
        <button
          type="button"
          onClick={() => {
            setInitialSource(null)
            setIsPickerOpen(true)
          }}
          className="w-full h-48 flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-purple-400/50 bg-purple-500/5 hover:bg-purple-500/10 hover:border-purple-500/70 transition-all cursor-pointer group"
        >
          <div className="h-14 w-14 rounded-full bg-purple-500/10 flex items-center justify-center group-hover:bg-purple-500/20 transition-colors">
            <ImageIcon className="h-7 w-7 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="text-center">
            <p className="text-base font-semibold text-purple-600 dark:text-purple-400">Add Media to Gallery</p>
            <p className="text-xs text-muted-foreground mt-1">Photos, videos, and audio files</p>
            <p className="text-xs text-muted-foreground mt-1">Media carousel displayed at the top of your artifact page.</p>
          </div>
        </button>
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
                    isThumbnail={currentThumbnailUrl === item.media.public_url}
                    onSelectThumbnail={onSelectThumbnail}
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

      {/* Add Media Modal - supports both Upload New and Select Existing */}
      <AddMediaModal
        open={isPickerOpen}
        onOpenChange={setIsPickerOpen}
        artifactId={artifactId}
        userId={userId}
        onMediaAdded={handleAddMedia}
        initialSource={initialSource}
        initialAction={initialAction}
      />

      <style dangerouslySetInnerHTML={{
        __html: `
          .gallery-grid {
            display: flex;
            justify-content: center;
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
