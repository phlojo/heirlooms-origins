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

// Gallery image with shimmer loading
function GalleryImage({
  src,
  alt,
  className,
  loading,
}: {
  src: string
  alt: string
  className?: string
  loading?: "eager" | "lazy"
}) {
  const [isLoaded, setIsLoaded] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)

  // Handle already-cached images (onLoad fires before React attaches listener)
  useEffect(() => {
    if (imgRef.current?.complete && imgRef.current?.naturalHeight > 0) {
      setIsLoaded(true)
    }
  }, [src])

  return (
    <>
      {/* Shimmer placeholder */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-muted overflow-hidden">
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        </div>
      )}
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        className={cn(
          "transition-opacity duration-300",
          isLoaded ? "opacity-100" : "opacity-0",
          className
        )}
        loading={loading}
        onLoad={() => setIsLoaded(true)}
      />
    </>
  )
}

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
  const [imageFitModes, setImageFitModes] = useState<Record<string, 'cover' | 'contain'>>({})

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

  const toggleImageFit = (mediaId: string) => {
    setImageFitModes(prev => ({
      ...prev,
      [mediaId]: prev[mediaId] === 'contain' ? 'cover' : 'contain'
    }))
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
            <div key={item.id} className="gallery-cell w-full h-full flex flex-col">
              {isImageMedia(mediaData) && (
                <div
                  className="relative w-full flex-1 overflow-hidden rounded bg-muted flex items-center justify-center cursor-pointer"
                  onClick={() => toggleImageFit(item.id)}
                  title="Tap to toggle between fill and fit modes"
                >
                  <GalleryImage
                    src={mediaData.mediumUrl || mediaData.public_url}
                    alt={item.caption_override || `Media ${item.sort_order + 1}`}
                    className={`max-h-full max-w-full ${
                      imageFitModes[item.id] === 'contain' ? 'object-contain' : 'object-cover w-full h-full'
                    }`}
                    loading={item.sort_order <= 1 ? "eager" : "lazy"}
                  />
                </div>
              )}

              {isVideoMedia(mediaData) && (
                <div className="relative w-full flex-1 overflow-hidden rounded bg-black flex items-center justify-center">
                  <video
                    src={mediaData.public_url}
                    controls
                    className="max-h-full max-w-full"
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

      <style dangerouslySetInnerHTML={{
        __html: `
          .artifact-media-gallery .flickity-viewport {
            border-radius: 0.25rem !important;
            overflow: hidden !important;
          }
          .artifact-media-gallery .flickity-page-dots {
            margin-top: 8px !important;
            margin-bottom: 16px !important;
            bottom: auto !important;
            position: relative !important;
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
  )
}
