"use client"

import { cn } from "@/lib/utils"

interface MediaImageProps {
  src?: string | null
  alt?: string
  className?: string
  objectFit?: "cover" | "contain"
  fallbackSrc?: string
  draggable?: boolean
}

function MediaImage({
  src,
  alt = "",
  className = "",
  objectFit = "cover",
  fallbackSrc = "/placeholder.svg",
  draggable,
}: MediaImageProps) {
  const imageSrc = src || fallbackSrc

  return (
    <img
      src={imageSrc || "/placeholder.svg"}
      alt={alt}
      crossOrigin="anonymous"
      draggable={draggable}
      onError={(e) => {
        const target = e.currentTarget
        if (target.src !== fallbackSrc) {
          target.src = fallbackSrc
        }
      }}
      className={cn(
        "w-full h-full",
        objectFit === "cover" ? "object-cover" : "object-contain",
        className
      )}
    />
  )
}

export { MediaImage }
export default MediaImage
