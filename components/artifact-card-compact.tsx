import Link from "next/link"
import { Card } from "@/components/ui/card"
import { HeirloomsIcon } from "@/components/heirlooms-icon"
import { getThumbnailUrl } from "@/lib/cloudinary"
import MediaImage from "@/components/media-image"
import { ArtifactTypeBadge } from "@/components/artifact-type-badge"

interface ArtifactCardCompactProps {
  artifact: {
    id: string
    slug: string
    title: string
    description?: string
    year_acquired?: number
    origin?: string
    media_urls?: string[]
    thumbnail_url?: string | null
    user_id?: string
    artifact_type?: {
      id: string
      name: string
      icon_name: string
    } | null
    collection?: {
      id: string
      title: string
    } | null
  }
  showAuthor?: boolean
  authorName?: string | null
}

export function ArtifactCardCompact({ artifact, showAuthor = false, authorName }: ArtifactCardCompactProps) {
  const thumbnailUrl = artifact.thumbnail_url ? getThumbnailUrl(artifact.thumbnail_url) : null

  return (
    <Link href={`/artifacts/${artifact.slug}`} data-testid="artifact-link">
      <Card className="group overflow-hidden border p-0 transition-all hover:shadow-md rounded-md">
        <div className="relative aspect-square overflow-hidden bg-muted">
          {thumbnailUrl ? (
            <>
              <MediaImage
                key={thumbnailUrl}
                src={thumbnailUrl}
                alt={artifact.title}
                className="h-full w-full transition-transform group-hover:scale-105"
                objectFit="cover"
              />
              {artifact.artifact_type && (
                <ArtifactTypeBadge iconName={artifact.artifact_type.icon_name} typeName={artifact.artifact_type.name} />
              )}
            </>
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center bg-muted">
              <HeirloomsIcon className="h-8 w-8 text-muted-foreground/40" />
            </div>
          )}
        </div>

        <div className="p-1.5">
          <h3 className="font-medium text-xs leading-tight truncate">{artifact.title}</h3>
        </div>
      </Card>
    </Link>
  )
}
