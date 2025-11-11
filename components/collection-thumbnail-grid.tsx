import { getThumbnailUrl } from "@/lib/cloudinary"
import { HeirloomsIcon } from "@/components/heirlooms-icon"

interface CollectionThumbnailGridProps {
  images: string[]
  title: string
}

export function CollectionThumbnailGrid({ images, title }: CollectionThumbnailGridProps) {
  const validImages = images.filter(Boolean).slice(0, 4)

  console.log("[v0] CollectionThumbnailGrid rendering with", validImages.length, "images")

  if (validImages.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-gray-300">
        <HeirloomsIcon className="h-12 w-12 text-gray-600" />
      </div>
    )
  }

  if (validImages.length === 1) {
    return (
      <img
        src={getThumbnailUrl(validImages[0]) || "/placeholder.svg"}
        alt={title}
        className="h-full w-full object-cover"
      />
    )
  }

  if (validImages.length === 2) {
    return (
      <div className="grid h-full w-full grid-cols-2 gap-1">
        {validImages.map((img, i) => (
          <img
            key={i}
            src={getThumbnailUrl(img) || "/placeholder.svg"}
            alt={`${title} ${i + 1}`}
            className="h-full object-cover"
          />
        ))}
      </div>
    )
  }

  if (validImages.length === 3) {
    return (
      <div className="grid h-full w-full grid-cols-3 gap-1">
        {validImages.map((img, i) => (
          <img
            key={i}
            src={getThumbnailUrl(img) || "/placeholder.svg"}
            alt={`${title} ${i + 1}`}
            className="h-full object-cover"
          />
        ))}
      </div>
    )
  }

  return (
    <div className="grid h-full w-full grid-cols-4 gap-1">
      {validImages.map((img, i) => (
        <img
          key={i}
          src={getThumbnailUrl(img) || "/placeholder.svg"}
          alt={`${title} ${i + 1}`}
          className="h-full object-cover"
        />
      ))}
    </div>
  )
}
