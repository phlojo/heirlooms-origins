"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { FullscreenImageViewer } from "./fullscreen-image-viewer"

interface ArtifactImageWithViewerProps {
  src: string
  alt: string
  setIsImageFullscreen?: (isFullscreen: boolean) => void
}

export function ArtifactImageWithViewer({ src, alt, setIsImageFullscreen }: ArtifactImageWithViewerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [scrollPosition, setScrollPosition] = useState(0)
  const [hasError, setHasError] = useState(false)
  const imageRef = useRef<HTMLDivElement>(null)

  const handleImageClick = () => {
    // Save current scroll position
    setScrollPosition(window.scrollY)
    setIsFullscreen(true)
    setIsImageFullscreen?.(true)
  }

  const handleClose = () => {
    setIsFullscreen(false)
    setIsImageFullscreen?.(false)
  }

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    console.error("[v0] Image load error:", src)
    setHasError(true)
  }

  useEffect(() => {
    if (!isFullscreen && scrollPosition > 0) {
      // Use requestAnimationFrame to ensure DOM has updated
      requestAnimationFrame(() => {
        window.scrollTo(0, scrollPosition)
      })
    }
  }, [isFullscreen, scrollPosition])

  if (hasError) {
    return (
      <div className="min-h-[400px] bg-muted -mx-6 lg:-mx-8 flex items-center justify-center">
        <div className="text-center p-8">
          <p className="text-sm text-destructive">Failed to load image</p>
          <p className="text-xs text-muted-foreground mt-2">The image may be corrupted or unavailable</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div
        ref={imageRef}
        className="min-h-[400px] overflow-hidden bg-muted -mx-6 lg:-mx-8 flex items-center justify-center cursor-pointer"
        onClick={handleImageClick}
      >
        <img
          src={src || "/placeholder.svg"}
          alt={alt}
          crossOrigin="anonymous"
          className="max-h-[600px] w-full object-contain transition-opacity hover:opacity-90"
          onError={handleImageError}
        />
      </div>

      {isFullscreen && <FullscreenImageViewer src={src} alt={alt} onClose={handleClose} />}
    </>
  )
}
