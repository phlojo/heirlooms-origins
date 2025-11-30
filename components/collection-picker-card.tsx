"use client"

import { cn } from "@/lib/utils"
import { getThumbnailUrl } from "@/lib/cloudinary"
import { HeirloomsIcon } from "@/components/heirlooms-icon"
import MediaImage from "@/components/media-image"
import { FolderOpen } from "lucide-react"

export interface CollectionPickerItem {
  id: string
  title: string
  slug: string
  thumbnailImages: string[]
  itemCount: number
  isUncategorized?: boolean
}

interface CollectionPickerCardProps {
  collection: CollectionPickerItem
  isSelected: boolean
  onClick: () => void
}

/**
 * Mini collection card for the Collection Picker
 * Shows a 2x2 thumbnail grid (or placeholder) with title below
 */
export function CollectionPickerCard({
  collection,
  isSelected,
  onClick,
}: CollectionPickerCardProps) {
  const { title, thumbnailImages, itemCount, isUncategorized } = collection
  const validImages = thumbnailImages.filter((img) => img && typeof img === "string" && img.trim() !== "").slice(0, 4)

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative flex flex-col items-center gap-1.5 rounded-lg p-2 transition-all",
        "border-2 hover:bg-accent/50 active:scale-95",
        isSelected
          ? "border-primary bg-accent"
          : "border-transparent bg-muted/30 hover:border-muted-foreground/20"
      )}
    >
      {/* Thumbnail grid container - square aspect ratio with 4px corner radius */}
      <div className="relative w-full aspect-square rounded overflow-hidden bg-muted/50">
        {validImages.length === 0 ? (
          <div className="flex h-full w-full items-center justify-center">
            {isUncategorized ? (
              <FolderOpen className="h-8 w-8 text-muted-foreground/50" />
            ) : (
              <HeirloomsIcon className="h-8 w-8 text-muted-foreground/50" />
            )}
          </div>
        ) : validImages.length === 1 ? (
          <MediaImage
            src={getThumbnailUrl(validImages[0]) || validImages[0]}
            alt={title}
            className="h-full w-full"
            objectFit="cover"
          />
        ) : validImages.length === 2 ? (
          /* 2 images: side by side, each filling full height */
          <div className="grid h-full w-full grid-cols-2 gap-0.5">
            {validImages.map((img, idx) => (
              <MediaImage
                key={`${idx}-${img}`}
                src={getThumbnailUrl(img) || img}
                alt={title}
                className="h-full w-full"
                objectFit="cover"
              />
            ))}
          </div>
        ) : (
          /* 3 or 4 images: 2x2 grid */
          <div className="grid h-full w-full grid-cols-2 grid-rows-2 gap-0.5">
            {validImages.slice(0, 4).map((img, idx) => (
              <MediaImage
                key={`${idx}-${img}`}
                src={getThumbnailUrl(img) || img}
                alt={title}
                className="h-full w-full"
                objectFit="cover"
              />
            ))}
            {/* Fill empty grid cells if 3 images */}
            {validImages.length === 3 && (
              <div className="h-full w-full bg-muted/30" />
            )}
          </div>
        )}
      </div>

      {/* Title and count */}
      <div className="w-full text-center px-0.5">
        <p
          className={cn(
            "text-[10px] sm:text-[11px] leading-tight line-clamp-2 break-words",
            isSelected ? "font-medium text-foreground" : "text-muted-foreground"
          )}
        >
          {title}
        </p>
        <p className="text-[9px] text-muted-foreground/70 mt-0.5">
          {itemCount} {itemCount === 1 ? "item" : "items"}
        </p>
      </div>

      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute bottom-0 left-1/2 h-1 w-8 -translate-x-1/2 rounded-t-full bg-primary" />
      )}
    </button>
  )
}
