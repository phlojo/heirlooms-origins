"use client"

import type React from "react"

import { useEffect, useState, useRef, useCallback } from "react"
import { createPortal } from "react-dom"
import { X, ZoomIn, ZoomOut, Maximize, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from "@/components/ui/button"
import MediaImage from "@/components/media-image"

interface FullscreenImageViewerProps {
  src: string
  alt: string
  onClose: () => void
  /** Optional: source element rect for animated transition (no longer used, kept for API compatibility) */
  sourceRect?: DOMRect | null
  /** Optional: array of all image URLs for navigation */
  images?: string[]
  /** Optional: current index in the images array */
  currentIndex?: number
  /** Optional: callback when navigating to a different image */
  onNavigate?: (index: number) => void
}

export function FullscreenImageViewer({
  src,
  alt,
  onClose,
  images,
  currentIndex = 0,
  onNavigate,
}: FullscreenImageViewerProps) {
  // Scale of 1 = "fit" (CSS handles fitting), scale > 1 = zoomed in
  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [isAnimatingIn, setIsAnimatingIn] = useState(true)
  const [isAnimatingOut, setIsAnimatingOut] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [isImageLoading, setIsImageLoading] = useState(true)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const lastTapTime = useRef<number>(0)

  // Swipe tracking
  const swipeStartX = useRef<number | null>(null)
  const swipeStartY = useRef<number | null>(null)

  // Determine if we have multiple images for navigation
  const hasMultipleImages = images && images.length > 1
  const totalImages = images?.length || 1
  const displayIndex = currentIndex + 1 // 1-based for display

  // Wait for client-side mount before rendering portal
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    document.body.style.overflow = "hidden"

    // Prevent page zoom on mobile devices
    const metaViewport = document.querySelector('meta[name="viewport"]')
    const originalContent = metaViewport?.getAttribute("content") || ""
    metaViewport?.setAttribute("content", "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no")

    // Trigger the entry animation after mount
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setIsAnimatingIn(false)
      })
    })

    return () => {
      document.body.style.overflow = ""
      if (originalContent) {
        metaViewport?.setAttribute("content", originalContent)
      }
    }
  }, [])

  // Handle close with animation
  const handleClose = useCallback(() => {
    setIsAnimatingOut(true)
    setTimeout(() => {
      onClose()
    }, 300) // Match animation duration
  }, [onClose])

  // Navigation handlers with fade transition
  const handlePrevious = useCallback(() => {
    if (!hasMultipleImages || !onNavigate || isTransitioning) return
    const newIndex = currentIndex === 0 ? totalImages - 1 : currentIndex - 1
    // Start fade out transition
    setIsTransitioning(true)
    setIsImageLoading(true)
    // Reset zoom/position when navigating
    setScale(1)
    setPosition({ x: 0, y: 0 })
    // Navigate after fade out
    setTimeout(() => {
      onNavigate(newIndex)
    }, 150)
  }, [hasMultipleImages, onNavigate, currentIndex, totalImages, isTransitioning])

  const handleNext = useCallback(() => {
    if (!hasMultipleImages || !onNavigate || isTransitioning) return
    const newIndex = currentIndex === totalImages - 1 ? 0 : currentIndex + 1
    // Start fade out transition
    setIsTransitioning(true)
    setIsImageLoading(true)
    // Reset zoom/position when navigating
    setScale(1)
    setPosition({ x: 0, y: 0 })
    // Navigate after fade out
    setTimeout(() => {
      onNavigate(newIndex)
    }, 150)
  }, [hasMultipleImages, onNavigate, currentIndex, totalImages, isTransitioning])

  // Handle image load complete
  const handleImageLoad = useCallback(() => {
    setIsImageLoading(false)
    setIsTransitioning(false)
  }, [])

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose()
      } else if (e.key === "ArrowLeft" && hasMultipleImages) {
        handlePrevious()
      } else if (e.key === "ArrowRight" && hasMultipleImages) {
        handleNext()
      }
    }
    window.addEventListener("keydown", handleKeydown)
    return () => window.removeEventListener("keydown", handleKeydown)
  }, [handleClose, handlePrevious, handleNext, hasMultipleImages])

  // Zoom increments: 1x (fit), 1.5x, 2x, 3x, 4x, 5x
  const zoomLevels = [1, 1.5, 2, 3, 4, 5]

  const handleZoomIn = useCallback(() => {
    setScale((prev) => {
      // Find next zoom level above current
      const nextLevel = zoomLevels.find(level => level > prev + 0.01)
      return nextLevel || 5
    })
  }, [])

  const handleZoomOut = useCallback(() => {
    setScale((prev) => {
      // Find next zoom level below current
      const reversedLevels = [...zoomLevels].reverse()
      const nextLevel = reversedLevels.find(level => level < prev - 0.01)
      return nextLevel || 1 // 1 is fit
    })
    // Reset position when zooming out
    setPosition({ x: 0, y: 0 })
  }, [])

  const handleFit = useCallback(() => {
    setScale(1)
    setPosition({ x: 0, y: 0 })
  }, [])

  const handleDoubleTap = useCallback(() => {
    // Toggle between fit and 2x zoom
    if (scale > 1.01) {
      handleFit()
    } else {
      setScale(2)
    }
  }, [scale, handleFit])

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      setIsDragging(true)
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      })
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      })
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    const currentTime = Date.now()
    const timeSinceLastTap = currentTime - lastTapTime.current

    if (timeSinceLastTap < 300 && timeSinceLastTap > 0 && e.touches.length === 1) {
      // Double-tap detected
      handleDoubleTap()
      lastTapTime.current = 0
      return
    }

    lastTapTime.current = currentTime

    if (e.touches.length === 1) {
      // Track swipe start position (only used when not zoomed)
      swipeStartX.current = e.touches[0].clientX
      swipeStartY.current = e.touches[0].clientY

      if (scale > 1) {
        setIsDragging(true)
        setDragStart({
          x: e.touches[0].clientX - position.x,
          y: e.touches[0].clientY - position.y,
        })
      }
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDragging && e.touches.length === 1 && scale > 1) {
      setPosition({
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y,
      })
    }
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    setIsDragging(false)

    // Handle swipe navigation only when not zoomed in
    if (scale <= 1.01 && swipeStartX.current !== null && swipeStartY.current !== null && hasMultipleImages) {
      const touch = e.changedTouches[0]
      const deltaX = touch.clientX - swipeStartX.current
      const deltaY = touch.clientY - swipeStartY.current

      // Check if horizontal swipe is significant and more horizontal than vertical
      const minSwipeDistance = 50
      if (Math.abs(deltaX) > minSwipeDistance && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
        if (deltaX > 0) {
          handlePrevious() // Swipe right = previous
        } else {
          handleNext() // Swipe left = next
        }
      }
    }

    swipeStartX.current = null
    swipeStartY.current = null
  }

  // Handle pinch zoom on touch devices
  const lastTouchDistance = useRef<number | null>(null)

  const handleTouchStartPinch = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      )
      lastTouchDistance.current = distance
    }
  }

  const handleTouchMovePinch = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && lastTouchDistance.current) {
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      )
      const delta = distance - lastTouchDistance.current
      setScale((prev) => {
        const newScale = prev + delta * 0.01
        // Clamp between 1 (fit) and 5x
        return Math.max(1, Math.min(5, newScale))
      })
      lastTouchDistance.current = distance
    }
  }

  // Prevent any events from bubbling to elements behind the viewer
  const handleContainerClick = (e: React.MouseEvent) => {
    e.stopPropagation()
  }

  const isAtFit = scale <= 1.01
  const isAtMaxZoom = scale >= 5

  // Don't render anything until mounted (client-side only for portal)
  if (!mounted) return null

  const viewerContent = (
    <div
      className="fixed inset-0 z-[9999]"
      onClick={handleContainerClick}
      onTouchStart={(e) => e.stopPropagation()}
      style={{
        backgroundColor: isAnimatingIn ? 'rgba(0,0,0,0)' : isAnimatingOut ? 'rgba(0,0,0,0)' : 'rgba(0,0,0,1)',
        transition: 'background-color 0.3s ease-out',
      }}
    >
      {/* Close button - top right with safe area */}
      <Button
        variant="ghost"
        size="icon"
        onClick={handleClose}
        className="fixed z-[10000] h-10 w-10 rounded-full bg-black/50 text-white hover:bg-black/70 hover:text-white"
        style={{
          top: 'calc(16px + env(safe-area-inset-top, 0px))',
          right: 'calc(16px + env(safe-area-inset-right, 0px))',
          opacity: isAnimatingIn || isAnimatingOut ? 0 : 1,
          transition: 'opacity 0.3s ease-out',
        }}
        aria-label="Close fullscreen viewer"
      >
        <X className="h-5 w-5" />
      </Button>

      {/* Previous button - left side, centered on image area */}
      {hasMultipleImages && (
        <Button
          variant="ghost"
          size="icon"
          onClick={handlePrevious}
          className="fixed z-[10000] h-12 w-12 rounded-full bg-black/50 text-white hover:bg-black/70 hover:text-white"
          style={{
            top: 'calc(50% - 40px - env(safe-area-inset-bottom, 0px) / 2)',
            left: 'calc(16px + env(safe-area-inset-left, 0px))',
            transform: 'translateY(-50%)',
            opacity: isAnimatingIn || isAnimatingOut ? 0 : 1,
            transition: 'opacity 0.3s ease-out',
          }}
          aria-label="Previous image"
        >
          <ChevronLeft className="h-6 w-6" />
        </Button>
      )}

      {/* Next button - right side, centered on image area */}
      {hasMultipleImages && (
        <Button
          variant="ghost"
          size="icon"
          onClick={handleNext}
          className="fixed z-[10000] h-12 w-12 rounded-full bg-black/50 text-white hover:bg-black/70 hover:text-white"
          style={{
            top: 'calc(50% - 40px - env(safe-area-inset-bottom, 0px) / 2)',
            right: 'calc(16px + env(safe-area-inset-right, 0px))',
            transform: 'translateY(-50%)',
            opacity: isAnimatingIn || isAnimatingOut ? 0 : 1,
            transition: 'opacity 0.3s ease-out',
          }}
          aria-label="Next image"
        >
          <ChevronRight className="h-6 w-6" />
        </Button>
      )}

      {/* Image container - fills screen except toolbar */}
      <div
        ref={containerRef}
        className="absolute inset-0 flex items-center justify-center overflow-hidden touch-none"
        style={{
          bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))',
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={(e) => {
          handleTouchStart(e)
          handleTouchStartPinch(e)
        }}
        onTouchMove={(e) => {
          handleTouchMove(e)
          handleTouchMovePinch(e)
        }}
        onTouchEnd={handleTouchEnd}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Loading spinner - shown while image is loading */}
        {isImageLoading && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="h-10 w-10 rounded-full border-2 border-white/20 border-t-white/80 animate-spin" />
          </div>
        )}

        <div
          style={{
            transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
            opacity: isAnimatingIn || isAnimatingOut || isTransitioning ? 0 : 1,
            transition: isDragging ? "none" : "transform 0.3s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.15s ease-out",
            cursor: scale > 1 ? (isDragging ? "grabbing" : "grab") : "default",
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <MediaImage
            src={src || "/placeholder.svg"}
            alt={alt}
            className="max-w-none"
            objectFit="contain"
            draggable={false}
            onLoad={handleImageLoad}
            style={{
              maxWidth: '100vw',
              maxHeight: `calc(100vh - 80px - env(safe-area-inset-bottom, 0px))`,
              width: 'auto',
              height: 'auto',
            }}
          />
        </div>
      </div>

      {/* Bottom toolbar with zoom controls and counter */}
      <div
        className="fixed left-0 right-0 z-[10000] flex flex-col items-center gap-2"
        style={{
          bottom: 'calc(24px + env(safe-area-inset-bottom, 0px))',
          opacity: isAnimatingIn || isAnimatingOut ? 0 : 1,
          transition: 'opacity 0.3s ease-out',
        }}
      >
        <div className="flex items-center gap-1 rounded-full bg-black/60 px-2 py-1.5 backdrop-blur-sm">
          {/* Zoom Out */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleZoomOut}
            disabled={isAtFit}
            className="h-10 w-10 rounded-full text-white hover:bg-white/20 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
            aria-label="Zoom out"
          >
            <ZoomOut className="h-5 w-5" />
          </Button>

          {/* Fit */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleFit}
            disabled={isAtFit}
            className="h-10 w-10 rounded-full text-white hover:bg-white/20 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
            aria-label="Fit to screen"
          >
            <Maximize className="h-5 w-5" />
          </Button>

          {/* Zoom In */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleZoomIn}
            disabled={isAtMaxZoom}
            className="h-10 w-10 rounded-full text-white hover:bg-white/20 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
            aria-label="Zoom in"
          >
            <ZoomIn className="h-5 w-5" />
          </Button>
        </div>

        {/* Image counter */}
        {hasMultipleImages && (
          <div className="text-sm text-white/80 font-medium">
            {displayIndex} of {totalImages}
          </div>
        )}
      </div>
    </div>
  )

  // Use portal to render at document body level, escaping any stacking contexts
  return createPortal(viewerContent, document.body)
}
