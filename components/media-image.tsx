"use client"

import { forwardRef } from "react"
import { cn } from "@/lib/utils"

interface MediaImageProps {
  src?: string | null
  alt?: string
  className?: string
  objectFit?: "cover" | "contain"
  fallbackSrc?: string
  draggable?: boolean
  style?: React.CSSProperties
  onLoad?: React.ReactEventHandler<HTMLImageElement>
  onError?: React.ReactEventHandler<HTMLImageElement>
}

const MediaImage = forwardRef<HTMLImageElement, MediaImageProps>(
  function MediaImage(
    {
      src,
      alt = "",
      className = "",
      objectFit = "cover",
      fallbackSrc = "/placeholder.svg",
      draggable,
      style,
      onLoad,
      onError,
    },
    ref
  ) {
    const imageSrc = src || fallbackSrc

    return (
      <img
        ref={ref}
        src={imageSrc || "/placeholder.svg"}
        alt={alt}
        crossOrigin="anonymous"
        draggable={draggable}
        style={style}
        onLoad={onLoad}
        onError={(e) => {
          const target = e.currentTarget
          if (target.src !== fallbackSrc) {
            target.src = fallbackSrc
          }
          onError?.(e)
        }}
        className={cn(
          "w-full h-full",
          objectFit === "cover" ? "object-cover" : "object-contain",
          className
        )}
      />
    )
  }
)

export { MediaImage }
export default MediaImage
