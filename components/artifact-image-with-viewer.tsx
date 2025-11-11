"use client"

import { useState, useRef, useEffect } from "react"
import { FullscreenImageViewer } from "./fullscreen-image-viewer"

interface ArtifactImageWithViewerProps {
  src: string
  alt: string
  onFullscreenChange?: (isFullscreen: boolean) => void
}

export function ArtifactImageWithViewer({ src, alt, onFullscreenChange }: ArtifactImageWithViewerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [scrollPosition, setScrollPosition] = useState(0)
  const imageRef = useRef<HTMLDivElement>(null)

  const handleImageClick = () => {
    // Save current scroll position
    setScrollPosition(window.scrollY)
    setIsFullscreen(true)
  }

  const handleClose = () => {
    setIsFullscreen(false)
  }

  useEffect(() => {
    onFullscreenChange?.(isFullscreen)
  }, [isFullscreen, onFullscreenChange])

  // Restore scroll position after closing fullscreen
  useEffect(() => {
    if (!isFullscreen && scrollPosition > 0) {
      // Use requestAnimationFrame to ensure DOM has updated
      requestAnimationFrame(() => {
        window.scrollTo(0, scrollPosition)
      })
    }
  }, [isFullscreen, scrollPosition])

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
          className="max-h-[600px] w-full object-contain transition-opacity hover:opacity-90"
        />
      </div>

      {isFullscreen && <FullscreenImageViewer src={src} alt={alt} onClose={handleClose} />}
    </>
  )
}
