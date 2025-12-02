"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import "flickity/css/flickity.css"
import { type ArtifactMediaWithDerivatives } from "@/lib/types/media"
import { isImageMedia, isVideoMedia } from "@/lib/types/media"
import { cn } from "@/lib/utils"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FullscreenImageViewer } from "@/components/fullscreen-image-viewer"

// Dynamic import type for Flickity
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FlickityType = any

// Gallery image component that opens fullscreen on tap
// Filmstrip style - image height fills container, width is auto
function GalleryImage({
  src,
  alt,
  loading,
  onTap,
}: {
  src: string
  alt: string
  loading?: "eager" | "lazy"
  onTap: (rect: DOMRect) => void
}) {
  const imgRef = useRef<HTMLImageElement>(null)
  // Use refs instead of state to avoid re-renders that cause flicker
  const isDraggingRef = useRef(false)
  const dragStartRef = useRef({ x: 0, y: 0 })
  const hasMovedRef = useRef(false)

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    // Only track for tap detection, don't prevent default (let Flickity handle dragging)
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
    }
    hasMovedRef.current = false
    isDraggingRef.current = true
  }, [])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDraggingRef.current) return

    const deltaX = e.clientX - dragStartRef.current.x
    const deltaY = e.clientY - dragStartRef.current.y

    // Check if moved significantly (more than 10px from start)
    if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
      hasMovedRef.current = true
    }
  }, [])

  const handlePointerUp = useCallback(() => {
    const hasMoved = hasMovedRef.current
    isDraggingRef.current = false

    // If we moved significantly, this was a swipe, not a tap
    if (hasMoved) return

    // This is a tap - open fullscreen
    if (imgRef.current) {
      const rect = imgRef.current.getBoundingClientRect()
      onTap(rect)
    }
  }, [onTap])

  return (
    <img
      ref={imgRef}
      src={src}
      alt={alt}
      loading={loading}
      draggable={false}
      className="gallery-cell h-full w-auto object-cover select-none rounded cursor-pointer"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    />
  )
}

// Gallery video component - filmstrip style
function GalleryVideo({
  src,
  poster,
  preload,
}: {
  src: string
  poster?: string
  preload: "metadata" | "none"
}) {
  return (
    <video
      src={src}
      controls
      className="gallery-cell h-full w-auto rounded"
      preload={preload}
      poster={poster}
    >
      Your browser does not support the video tag.
    </video>
  )
}

interface ArtifactMediaGalleryProps {
  media: ArtifactMediaWithDerivatives[]
  className?: string
  initialIndex?: number
  onMediaChange?: (index: number) => void
  onFullscreenChange?: (isFullscreen: boolean) => void
}

/**
 * Flickity-based media gallery for artifact detail pages
 * Displays media in a horizontal carousel with touch/swipe support
 *
 * Tap behavior:
 * - Tap on image: Opens fullscreen viewer with animated transition
 */
export function ArtifactMediaGallery({
  media,
  className,
  initialIndex = 0,
  onMediaChange,
  onFullscreenChange,
}: ArtifactMediaGalleryProps) {
  const galleryRef = useRef<HTMLDivElement>(null)
  const flickityInstance = useRef<InstanceType<FlickityType> | null>(null)
  const [currentIndex, setCurrentIndex] = useState(initialIndex)

  // Fullscreen viewer state
  const [fullscreenImage, setFullscreenImage] = useState<{
    src: string
    alt: string
    sourceRect: DOMRect | null
    imageIndex: number  // Index in the images-only array
  } | null>(null)

  // Get only images for fullscreen navigation (excluding videos)
  const imageOnlyMedia = media.filter((item) => isImageMedia(item.media))
  const imageUrls = imageOnlyMedia.map((item) => {
    const mediaData = item.media
    return mediaData.largeUrl || mediaData.mediumUrl || mediaData.public_url
  })

  // Initialize Flickity
  useEffect(() => {
    if (!galleryRef.current || media.length === 0) return

    // Dynamic import Flickity (client-side only)
    const initFlickity = async () => {
      const FlickityModule = await import("flickity")
      const Flickity = FlickityModule.default

      if (!galleryRef.current) return

      // Initialize Flickity with options for filmstrip layout
      const flkty = new Flickity(galleryRef.current, {
        cellAlign: "center", // Center current image
        contain: false, // Allow partial images at edges
        prevNextButtons: false, // We'll use custom buttons
        pageDots: media.length > 1, // Show dots for navigation
        draggable: media.length > 1,
        freeScroll: false, // Snap to images for centered behavior
        wrapAround: false,
        adaptiveHeight: false,
        initialIndex: initialIndex,
        imagesLoaded: true,
        lazyLoad: 2,
        accessibility: true,
        setGallerySize: false,
        percentPosition: false,
        cellSelector: '.gallery-cell',
        selectedAttraction: 0.025, // Smooth animation
        friction: 0.28, // Smooth deceleration
      })

      flickityInstance.current = flkty

      // Listen for slide changes
      flkty.on("change", (index: number) => {
        setCurrentIndex(index)
        onMediaChange?.(index)

        // Pause all videos when switching slides
        const videos = galleryRef.current?.querySelectorAll('video')
        videos?.forEach((video) => {
          if (!video.paused) {
            video.pause()
          }
        })
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

  // Handle image tap to open fullscreen
  const handleImageTap = useCallback((src: string, alt: string, rect: DOMRect, imageIndex: number) => {
    setFullscreenImage({ src, alt, sourceRect: rect, imageIndex })
    onFullscreenChange?.(true)
  }, [onFullscreenChange])

  // Handle navigation in fullscreen viewer
  const handleFullscreenNavigate = useCallback((newImageIndex: number) => {
    if (newImageIndex < 0 || newImageIndex >= imageOnlyMedia.length) return

    const item = imageOnlyMedia[newImageIndex]
    const mediaData = item.media
    const src = mediaData.largeUrl || mediaData.mediumUrl || mediaData.public_url
    const alt = item.caption_override || `Media ${item.sort_order + 1}`

    setFullscreenImage((prev) => prev ? { ...prev, src, alt, imageIndex: newImageIndex } : null)
  }, [imageOnlyMedia])

  // Close fullscreen viewer
  const handleCloseFullscreen = useCallback(() => {
    setFullscreenImage(null)
    onFullscreenChange?.(false)
  }, [onFullscreenChange])

  if (media.length === 0) {
    return (
      <div className="flex h-64 w-full items-center justify-center rounded bg-muted">
        <p className="text-sm text-muted-foreground">No media available</p>
      </div>
    )
  }

  const showNavButtons = media.length > 1

  return (
    <>
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

        {/* Flickity Gallery Container - Filmstrip layout */}
        <div ref={galleryRef} className="artifact-media-gallery aspect-[4/3] mb-10 bg-purple-500/5">
          {media.map((item) => {
            const mediaData = item.media
            const imageSrc = mediaData.largeUrl || mediaData.mediumUrl || mediaData.public_url
            const displaySrc = mediaData.mediumUrl || mediaData.public_url

            if (isImageMedia(mediaData)) {
              // Find the index of this image in the images-only array
              const imageIndex = imageOnlyMedia.findIndex((img) => img.id === item.id)

              return (
                <GalleryImage
                  key={item.id}
                  src={displaySrc}
                  alt={item.caption_override || `Media ${item.sort_order + 1}`}
                  loading={item.sort_order <= 1 ? "eager" : "lazy"}
                  onTap={(rect) => handleImageTap(
                    imageSrc, // Use large version for fullscreen
                    item.caption_override || `Media ${item.sort_order + 1}`,
                    rect,
                    imageIndex
                  )}
                />
              )
            }

            if (isVideoMedia(mediaData)) {
              return (
                <GalleryVideo
                  key={item.id}
                  src={mediaData.public_url}
                  poster={mediaData.thumbnailUrl}
                  preload={item.sort_order === 0 ? "metadata" : "none"}
                />
              )
            }

            return null
          })}
        </div>

        <style dangerouslySetInnerHTML={{
          __html: `
            .artifact-media-gallery .flickity-viewport {
              height: 100% !important;
              border-radius: 4px;
              overflow: hidden;
            }
            .artifact-media-gallery .flickity-slider {
              height: 100% !important;
            }
            .artifact-media-gallery .gallery-cell {
              height: 100% !important;
              margin-right: 4px;
            }
            .artifact-media-gallery .gallery-cell:last-child {
              margin-right: 0;
            }
            .artifact-media-gallery .flickity-page-dots {
              bottom: -24px !important;
            }
            .artifact-media-gallery .flickity-page-dot {
              width: 8px !important;
              height: 8px !important;
              opacity: 0.4 !important;
              background: #9ca3af !important;
              border: 1px solid #d1d5db !important;
            }
            .artifact-media-gallery .flickity-page-dot.is-selected {
              opacity: 1 !important;
              background: #ffffff !important;
              border-color: #ffffff !important;
            }
          `
        }} />
      </div>

      {/* Fullscreen Image Viewer */}
      {fullscreenImage && (
        <FullscreenImageViewer
          src={fullscreenImage.src}
          alt={fullscreenImage.alt}
          onClose={handleCloseFullscreen}
          sourceRect={fullscreenImage.sourceRect}
          images={imageUrls}
          currentIndex={fullscreenImage.imageIndex}
          onNavigate={handleFullscreenNavigate}
        />
      )}
    </>
  )
}
