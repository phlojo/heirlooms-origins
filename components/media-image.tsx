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
  const effectiveSrc = src || fallbackSrc
  
  const [loadState, setLoadState] = useState<'loading' | 'loaded' | 'error'>('loading')
  const [currentSrc, setCurrentSrc] = useState<string>(effectiveSrc)

  useEffect(() => {
    if (effectiveSrc !== currentSrc) {
      setLoadState('loading')
      setCurrentSrc(effectiveSrc)
    }
  }, [effectiveSrc, currentSrc])

  const handleError = (): void => {
    if (currentSrc !== fallbackSrc) {
      setCurrentSrc(fallbackSrc)
      setLoadState('loading')
    } else {
      setLoadState('error')
    }
  }

  const handleLoad = (): void => {
    setLoadState('loaded')
  }

  return (
    <div className={clsx("relative w-full h-full overflow-hidden", className)}>
      {loadState === 'loading' && (
        <div className="absolute inset-0 animate-pulse bg-neutral-200 dark:bg-neutral-800 rounded-md" />
      )}

      <img
        key={currentSrc}
        src={currentSrc || "/placeholder.svg"}
        alt={alt}
        onLoad={handleLoad}
        onError={handleError}
        loading="eager"
        className={clsx(
          "w-full h-full transition-opacity duration-300",
          loadState === 'loaded' ? "opacity-100" : "opacity-0",
          objectFit === "cover" ? "object-cover" : "object-contain"
        )}
      />
    </div>
  )
}

export { MediaImage }
export default MediaImage
