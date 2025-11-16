"use client"

import { useState } from "react"
import clsx from "clsx"

function MediaImage({
  src,
  alt = "",
  className = "",
  objectFit = "cover",
}: {
  src: string
  alt?: string
  className?: string
  objectFit?: "cover" | "contain"
}) {
  const [loaded, setLoaded] = useState(false)

  return (
    <div className={clsx("relative w-full h-full overflow-hidden", className)}>
      {!loaded && (
        <div className="absolute inset-0 animate-pulse bg-neutral-200 dark:bg-neutral-800 rounded-md" />
      )}

      <img
        src={src || "/placeholder.svg"}
        alt={alt}
        onLoad={() => setLoaded(true)}
        className={clsx(
          "w-full h-full transition-opacity duration-500",
          loaded ? "opacity-100" : "opacity-0",
          objectFit === "cover" ? "object-cover" : "object-contain"
        )}
      />
    </div>
  )
}

export { MediaImage }
export default MediaImage
