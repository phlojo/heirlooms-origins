"use client"

import { useEffect, useRef, useState } from "react"
import "flickity/css/flickity.css"
import { type ArtifactMediaWithDerivatives } from "@/lib/types/media"
import { isImageMedia, isVideoMedia } from "@/lib/types/media"
import { cn } from "@/lib/utils"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

// Dynamic import type for Flickity
type FlickityType = typeof import("flickity").default

interface ArtifactMediaGalleryProps {
  media: ArtifactMediaWithDerivatives[]
  className?: string
  initialIndex?: number
  onMediaChange?: (index: number) => void
}

/**
 * Flickity-based media gallery for artifact detail pages
 * Displays media in a horizontal carousel with touch/swipe support
 */
export function ArtifactMediaGallery({
  media,
  className,
  initialIndex = 0,
  onMediaChange,
}: ArtifactMediaGalleryProps) {
  const galleryRef = useRef<HTMLDivElement>(null)
  const flickityInstance = useRef<InstanceType<FlickityType> | null>(null)
  const [currentIndex, setCurrentIndex] = useState(initialIndex)

  // Initialize Flickity
  useEffect(() => {
    if (!galleryRef.current || media.length === 0) return

    // Dynamic import Flickity (client-side only)
    const initFlickity = async () => {
      const FlickityModule = await import("flickity")
      const Flickity = FlickityModule.default

      if (!galleryRef.current) return

      // Initialize Flickity with options
      const flkty = new Flickity(galleryRef.current, {
        cellAlign: "center",
        contain: true,
        prevNextButtons: false, // We'll use custom buttons
        pageDots: media.length > 1,
        draggable: media.length > 1,
        wrapAround: false,
        adaptiveHeight: true,
        initialIndex: initialIndex,
        imagesLoaded: true,
        lazyLoad: 2, // Load 2 ahead
        accessibility: true,
        setGallerySize: true,
        percentPosition: false,
      })

      flickityInstance.current = flkty

      // Listen for slide changes
      flkty.on("change", (index: number) => {
        setCurrentIndex(index)
        onMediaChange?.(index)
      })
    }

    initFlickity()

    return () => {
      flickityInstance.current?.destroy()
      flickityInstance.current = null
    }
  }, [media.length, initialIndex, onMediaChange])

  const handlePrevious = () => {
    flickityInstance.current?.previous()
  }

  const handleNext = () => {
    flickityInstance.current?.next()
  }

  if (media.length === 0) {
    return (
      <div className="flex h-64 w-full items-center justify-center rounded-lg bg-muted">
        <p className="text-sm text-muted-foreground">No media available</p>
      </div>
    )
  }

  const showNavButtons = media.length > 1

  return (
    <div className={cn("relative w-full", className)}>
      {/* Custom Previous Button */}
      {showNavButtons && currentIndex > 0 && (
        <Button
          variant="outline"
          size="icon"
          className="absolute left-4 top-1/2 z-10 h-10 w-10 -translate-y-1/2 rounded-full bg-background/80 shadow-lg backdrop-blur-sm hover:bg-accent"
          onClick={handlePrevious}
          aria-label="Previous media"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
      )}

      {/* Custom Next Button */}
      {showNavButtons && currentIndex < media.length - 1 && (
        <Button
          variant="outline"
          size="icon"
          className="absolute right-4 top-1/2 z-10 h-10 w-10 -translate-y-1/2 rounded-full bg-background/80 shadow-lg backdrop-blur-sm hover:bg-accent"
          onClick={handleNext}
          aria-label="Next media"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      )}

      {/* Flickity Gallery Container */}
      <div ref={galleryRef} className="artifact-media-gallery">
        {media.map((item) => {
          const mediaData = item.media

          return (
            <div key={item.id} className="gallery-cell w-full">
              {isImageMedia(mediaData) && (
                <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-muted">
                  <img
                    src={mediaData.mediumUrl || mediaData.public_url}
                    alt={item.caption_override || `Media ${item.sort_order + 1}`}
                    className="h-full w-full object-contain"
                    loading={item.sort_order <= 1 ? "eager" : "lazy"}
                  />
                </div>
              )}

              {isVideoMedia(mediaData) && (
                <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black">
                  <video
                    src={mediaData.public_url}
                    controls
                    className="h-full w-full"
                    preload={item.sort_order === 0 ? "metadata" : "none"}
                    poster={mediaData.thumbnailUrl}
                  >
                    Your browser does not support the video tag.
                  </video>
                </div>
              )}

              {/* Caption */}
              {item.caption_override && (
                <p className="mt-3 text-center text-sm text-muted-foreground">{item.caption_override}</p>
              )}
            </div>
          )
        })}
      </div>

      {/* Media Counter */}
      {media.length > 1 && (
        <div className="mt-4 text-center text-sm text-muted-foreground">
          {currentIndex + 1} / {media.length}
        </div>
      )}
    </div>
  )
}
