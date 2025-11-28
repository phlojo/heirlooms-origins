"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"

interface MediaImageProps {
  src?: string | null
  alt?: string
  className?: string
  objectFit?: "cover" | "contain"
  fallbackSrc?: string
  showShimmer?: boolean
  draggable?: boolean
}

function MediaImage({
  src,
  alt = "",
  className = "",
  objectFit = "cover",
  fallbackSrc = "/placeholder.svg",
  showShimmer = true,
  draggable,
}: MediaImageProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)
  const imageSrc = src || fallbackSrc

  return (
    <div className="relative w-full h-full">
      {/* Shimmer placeholder */}
      {showShimmer && !isLoaded && !hasError && (
        <div className="absolute inset-0 bg-muted overflow-hidden">
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        </div>
      )}

      <img
        src={imageSrc || "/placeholder.svg"}
        alt={alt}
        crossOrigin="anonymous"
        draggable={draggable}
        onLoad={() => setIsLoaded(true)}
        onError={(e) => {
          setHasError(true)
          setIsLoaded(true)
          const target = e.currentTarget
          if (target.src !== fallbackSrc) {
            target.src = fallbackSrc
          }
        }}
        className={cn(
          "w-full h-full transition-opacity duration-300",
          objectFit === "cover" ? "object-cover" : "object-contain",
          isLoaded ? "opacity-100" : "opacity-0",
          className
        )}
      />
    </div>
  )
}

export { MediaImage }
export default MediaImage
