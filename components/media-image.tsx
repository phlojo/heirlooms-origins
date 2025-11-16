"use client"

import { useState, useEffect } from "react"
import clsx from "clsx"

interface MediaImageProps {
  src?: string | null
  alt?: string
  className?: string
  objectFit?: "cover" | "contain"
  fallbackSrc?: string
}

function MediaImage({
  src,
  alt = "",
  className = "",
  objectFit = "cover",
  fallbackSrc = "/placeholder.svg",
}: MediaImageProps) {
  const imageSrc = src || fallbackSrc

  return (
    <img
      src={imageSrc || "/placeholder.svg"}
      alt={alt}
      onError={(e) => {
        const target = e.currentTarget
        if (target.src !== fallbackSrc) {
          target.src = fallbackSrc
        }
      }}
      className={`w-full h-full ${objectFit === "cover" ? "object-cover" : "object-contain"} ${className}`}
    />
  )
}

export { MediaImage }
export default MediaImage
