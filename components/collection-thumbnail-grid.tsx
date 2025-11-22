import { getThumbnailUrl } from "@/lib/cloudinary"
import { HeirloomsIcon } from "@/components/heirlooms-icon"
import MediaImage from "@/components/media-image"

interface CollectionThumbnailGridProps {
  images: string[]
  title: string
}

export function CollectionThumbnailGrid({ images, title }: CollectionThumbnailGridProps) {
  const validImages = images.filter((img) => img && typeof img === "string" && img.trim() !== "").slice(0, 4)

  if (validImages.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-gray-300">
        <HeirloomsIcon className="h-12 w-12 text-gray-600" />
      </div>
    )
  }

  if (validImages.length === 1) {
    const thumbnailUrl = getThumbnailUrl(validImages[0])
    return (
      <MediaImage src={thumbnailUrl} alt={title} className="h-full w-full" objectFit="cover" objectPosition="center" />
    )
  }

  if (validImages.length === 2) {
    return (
      <div className="grid h-full w-full grid-cols-2 gap-1">
        {validImages.map((img, idx) => {
          const thumbnailUrl = getThumbnailUrl(img)
          return <MediaImage key={`${idx}-${img}`} src={thumbnailUrl} alt={`${title}`} className="h-full" objectFit="cover" />
        })}
      </div>
    )
  }

  if (validImages.length === 3) {
    return (
      <div className="grid h-full w-full grid-cols-3 gap-1">
        {validImages.map((img, idx) => {
          const thumbnailUrl = getThumbnailUrl(img)
          return <MediaImage key={`${idx}-${img}`} src={thumbnailUrl} alt={`${title}`} className="h-full" objectFit="cover" />
        })}
      </div>
    )
  }

  return (
    <div className="grid h-full w-full grid-cols-4 gap-1">
      {validImages.map((img, idx) => {
        const thumbnailUrl = getThumbnailUrl(img)
        return <MediaImage key={`${idx}-${img}`} src={thumbnailUrl} alt={`${title}`} className="h-full" objectFit="cover" />
      })}
    </div>
  )
}
