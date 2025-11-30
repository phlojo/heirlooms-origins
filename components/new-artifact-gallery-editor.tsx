"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { X, Image as ImageIcon, GripVertical, HelpCircle, Upload, FolderOpen, BookImage, Camera, Video } from "lucide-react"
import { SectionTitle } from "@/components/ui/section-title"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { AddMediaModal } from "@/components/add-media-modal"
import { cn } from "@/lib/utils"
import { isImageUrl, isVideoUrl, isAudioUrl } from "@/lib/media"
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
  currentThumbnailUrl?: string | null
  onSelectThumbnail?: (url: string) => void
}

interface SortableItemProps {
  id: string
  url: string
  onRemove: (url: string) => void
  isThumbnail?: boolean
  onSelectThumbnail?: (url: string) => void
}

function SortableItem({ id, url, onRemove, isThumbnail, onSelectThumbnail }: SortableItemProps) {
  const thumbnailSrc = getThumbnailUrl(url, null) || url
  const isVideo = isVideoUrl(url)
  const isImage = isImageUrl(url)
  const isAudio = isAudioUrl(url)
  // Only images and videos can be thumbnails
  const canBeThumbnail = isImage || isVideo

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
          alt="Media thumbnail"
          className="h-16 w-16 rounded object-cover bg-muted"
        />
        <span className="text-xs text-muted-foreground capitalize">
          {isVideo ? "video" : isAudio ? "audio" : "image"}
        </span>
      </div>

      {/* Action Buttons (not draggable) */}
      <div className="flex items-center gap-1">
        {/* Thumbnail selector - only for images/videos */}
        {onSelectThumbnail && canBeThumbnail && (
          <button
            type="button"
            onClick={() => onSelectThumbnail(url)}
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
          type="button"
          onClick={() => onRemove(url)}
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
 * Gallery editor for new artifact creation
 * Works with raw URLs instead of database records
 */
export function NewArtifactGalleryEditor({
  mediaUrls,
  onMediaUrlsChange,
  userId,
  currentThumbnailUrl,
  onSelectThumbnail,
}: NewArtifactGalleryEditorProps) {
  const [isPickerOpen, setIsPickerOpen] = useState(false)
  const [initialSource, setInitialSource] = useState<"new" | "existing" | null>(null)
  const [initialAction, setInitialAction] = useState<"upload" | "camera" | "video" | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)

  // Filter to only visual media (images and videos) for display
  // Audio files are still in mediaUrls but not shown in gallery grid
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
    console.log("[NewArtifactGalleryEditor] handleAddMedia called with:", newUrls.length, "URLs:", newUrls)
    const combinedUrls = [...mediaUrls, ...newUrls]
    const uniqueUrls = Array.from(new Set(combinedUrls))
    console.log("[NewArtifactGalleryEditor] Calling onMediaUrlsChange with:", uniqueUrls.length, "URLs")
    onMediaUrlsChange(uniqueUrls)
    setIsPickerOpen(false)
  }

  const handleRemove = (urlToRemove: string) => {
    onMediaUrlsChange(mediaUrls.filter(url => url !== urlToRemove))
  }

  return (
    <div className="space-y-4">
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
                Media carousel displayed at the top of your artifact page. Drag to reorder.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="flex items-center justify-between">
          <Button
            type="button"
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
              type="button"
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
              type="button"
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
              type="button"
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
          </div>
        </div>
      </div>

      {/* Gallery Grid */}
      {visualMediaUrls.length === 0 ? (
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
            <p className="text-xs text-muted-foreground mt-1">Photos and videos</p>
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
                    isThumbnail={currentThumbnailUrl === url}
                    onSelectThumbnail={onSelectThumbnail}
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

      {/* Add Media Modal - Gallery only allows images and videos, no audio */}
      <AddMediaModal
        open={isPickerOpen}
        onOpenChange={setIsPickerOpen}
        artifactId={null}
        userId={userId}
        onMediaAdded={handleAddMedia}
        initialSource={initialSource}
        initialAction={initialAction}
        allowedMediaTypes={["image", "video"]}
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
