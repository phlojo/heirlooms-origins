"use client"

import type React from "react"

import { useEffect, useState, useRef } from "react"
import { X, ZoomIn, ZoomOut, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"

interface FullscreenImageViewerProps {
  src: string
  alt: string
  onClose: () => void
}

export function FullscreenImageViewer({ src, alt, onClose }: FullscreenImageViewerProps) {
  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  // Prevent body scroll when fullscreen is open
  useEffect(() => {
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = ""
    }
  }, [])

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose()
      }
    }
    window.addEventListener("keydown", handleEscape)
    return () => window.removeEventListener("keydown", handleEscape)
  }, [onClose])

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.5, 5))
  }

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev - 0.5, 0.5))
  }

  const handleReset = () => {
    setScale(1)
    setPosition({ x: 0, y: 0 })
  }

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
    if (e.touches.length === 1 && scale > 1) {
      setIsDragging(true)
      setDragStart({
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y,
      })
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

  const handleTouchEnd = () => {
    setIsDragging(false)
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
      setScale((prev) => Math.max(0.5, Math.min(5, prev + delta * 0.01)))
      lastTouchDistance.current = distance
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Close button - always on top */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onClose}
        className="fixed top-4 right-4 z-50 h-10 w-10 rounded-full bg-black/50 text-white hover:bg-black/70 hover:text-white"
      >
        <X className="h-5 w-5" />
      </Button>

      {/* Zoom controls */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex gap-2 rounded-full bg-black/50 p-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleZoomOut}
          disabled={scale <= 0.5}
          className="h-10 w-10 rounded-full text-white hover:bg-white/20 hover:text-white disabled:opacity-30"
        >
          <ZoomOut className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleReset}
          className="h-10 w-10 rounded-full text-white hover:bg-white/20 hover:text-white"
        >
          <RotateCcw className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleZoomIn}
          disabled={scale >= 5}
          className="h-10 w-10 rounded-full text-white hover:bg-white/20 hover:text-white disabled:opacity-30"
        >
          <ZoomIn className="h-5 w-5" />
        </Button>
      </div>

      {/* Image container */}
      <div
        ref={containerRef}
        className="h-full w-full flex items-center justify-center overflow-hidden"
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
        style={{ cursor: scale > 1 ? (isDragging ? "grabbing" : "grab") : "default" }}
      >
        <img
          src={src || "/placeholder.svg"}
          alt={alt}
          draggable={false}
          style={{
            transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
            transition: isDragging ? "none" : "transform 0.2s ease-out",
            maxWidth: "100%",
            maxHeight: "100%",
            objectFit: "contain",
          }}
        />
      </div>
    </div>
  )
}
