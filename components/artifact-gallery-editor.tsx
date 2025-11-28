"use client"

import { useState } from "react"
import { type ArtifactMediaWithDerivatives, type UserMediaWithDerivatives } from "@/lib/types/media"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { X, ChevronUp, ChevronDown, Plus, Image as ImageIcon } from "lucide-react"
import { cn } from "@/lib/utils"
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

interface ArtifactGalleryEditorProps {
  artifactId: string
  galleryMedia: ArtifactMediaWithDerivatives[]
  onUpdate: () => void
}

/**
 * Gallery management section for artifact editor
 * Allows adding, removing, and reordering gallery media
 */
export function ArtifactGalleryEditor({
  artifactId,
  galleryMedia,
  onUpdate,
}: ArtifactGalleryEditorProps) {
  const [isPickerOpen, setIsPickerOpen] = useState(false)
  const [isReordering, setIsReordering] = useState(false)

  // Get existing gallery media URLs to exclude from picker
  const existingUrls = galleryMedia.map((item) => item.media.public_url)

  const handleAddMedia = async (selectedMedia: UserMediaWithDerivatives[]) => {
    try {
      // Add each selected media to gallery
      for (const media of selectedMedia) {
        const result = await createArtifactMediaLink({
          artifact_id: artifactId,
          media_id: media.id,
          role: "gallery",
          sort_order: galleryMedia.length, // Add at end
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

  const handleMoveUp = async (item: ArtifactMediaWithDerivatives, index: number) => {
    if (index === 0) return

    setIsReordering(true)
    try {
      // Swap with previous item - construct new order array
      const newOrder = [...galleryMedia]
      newOrder[index] = galleryMedia[index - 1]
      newOrder[index - 1] = item

      // Build reorders array with new sort positions
      const reorders = newOrder.map((media, idx) => ({
        media_id: media.media_id,
        new_sort_order: idx,
      }))

      console.log("[GalleryEditor] Reordering up:", {
        artifactId,
        reorders,
        currentIndex: index,
      })

      const result = await reorderArtifactMedia({
        artifact_id: artifactId,
        role: "gallery",
        reorders,
      })

      console.log("[GalleryEditor] Reorder result:", result)

      if (result.error) {
        console.error("[GalleryEditor] Reorder error:", result.error)
        toast.error(`Failed to reorder: ${result.error}`)
        return
      }

      toast.success("Reordered successfully")
      onUpdate()
    } catch (error) {
      console.error("[GalleryEditor] Error reordering:", error)
      toast.error("Failed to reorder media")
    } finally {
      setIsReordering(false)
    }
  }

  const handleMoveDown = async (item: ArtifactMediaWithDerivatives, index: number) => {
    if (index === galleryMedia.length - 1) return

    setIsReordering(true)
    try {
      // Swap with next item - construct new order array
      const newOrder = [...galleryMedia]
      newOrder[index] = galleryMedia[index + 1]
      newOrder[index + 1] = item

      // Build reorders array with new sort positions
      const reorders = newOrder.map((media, idx) => ({
        media_id: media.media_id,
        new_sort_order: idx,
      }))

      console.log("[GalleryEditor] Reordering down:", {
        artifactId,
        reorders,
        currentIndex: index,
      })

      const result = await reorderArtifactMedia({
        artifact_id: artifactId,
        role: "gallery",
        reorders,
      })

      console.log("[GalleryEditor] Reorder result:", result)

      if (result.error) {
        console.error("[GalleryEditor] Reorder error:", result.error)
        toast.error(`Failed to reorder: ${result.error}`)
        return
      }

      toast.success("Reordered successfully")
      onUpdate()
    } catch (error) {
      console.error("[GalleryEditor] Error reordering:", error)
      toast.error("Failed to reorder media")
    } finally {
      setIsReordering(false)
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
            Media carousel displayed at the top of your artifact page. Changes save automatically.
          </p>
        </div>
        <Button onClick={() => setIsPickerOpen(true)} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Add to Gallery
        </Button>
      </div>

      {/* Gallery Items */}
      {galleryMedia.length === 0 ? (
        <Card className="flex h-40 flex-col items-center justify-center gap-2 border-dashed rounded-sm">
          <ImageIcon className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No media in gallery</p>
          <Button onClick={() => setIsPickerOpen(true)} size="sm" variant="outline">
            Add Media
          </Button>
        </Card>
      ) : (
        <div className="space-y-2">
          {galleryMedia.map((item, index) => {
            const media = item.media
            const isImage = media.media_type === "image"
            const isVideo = media.media_type === "video"

            return (
              <Card key={item.id} className="flex items-center gap-3 p-3 rounded-sm">
                {/* Thumbnail */}
                <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-md bg-muted">
                  {isImage && (
                    <img
                      src={media.thumbnailUrl || media.public_url}
                      alt={media.filename}
                      className="h-full w-full object-cover"
                    />
                  )}
                  {isVideo && (
                    <div className="relative h-full w-full">
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
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium">{media.filename}</p>
                  <p className="text-xs text-muted-foreground">
                    {media.media_type} • Position {index + 1}
                  </p>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleMoveUp(item, index)}
                    disabled={index === 0 || isReordering}
                    className={cn(index === 0 && "invisible")}
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleMoveDown(item, index)}
                    disabled={index === galleryMedia.length - 1 || isReordering}
                    className={cn(index === galleryMedia.length - 1 && "invisible")}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemove(item.id, media.filename)}
                    className="text-destructive hover:bg-destructive/10"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            )
          })}
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
    </div>
  )
}
