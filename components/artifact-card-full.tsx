import Link from "next/link"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { HeirloomsIcon } from "@/components/heirlooms-icon"
import { CollectionLabel } from "@/components/collection-label"
import { Author } from "@/components/author"
import { getThumbnailUrl } from "@/lib/cloudinary"
import MediaImage from "@/components/media-image"

interface ArtifactCardFullProps {
  artifact: {
    id: string
    slug: string
    title: string
    description?: string
    year_acquired?: number
    origin?: string
    media_urls?: string[]
    thumbnail_url?: string | null // Phase 2: Use stored thumbnail
    user_id?: string
    collection?: {
      id: string
      title: string
    } | null
  }
  showAuthor?: boolean
  authorName?: string | null
}

export function ArtifactCardFull({ artifact, showAuthor = false, authorName }: ArtifactCardFullProps) {
  const thumbnailUrl = artifact.thumbnail_url ? getThumbnailUrl(artifact.thumbnail_url) : null

  return (
    <Link href={`/artifacts/${artifact.slug}`}>
      <Card className="group overflow-hidden border p-0 transition-all hover:shadow-lg">
        <div className="relative aspect-square overflow-hidden bg-muted">
          {thumbnailUrl ? (
            <MediaImage
              src={thumbnailUrl}
              alt={artifact.title}
              className="h-full w-full transition-transform group-hover:scale-105"
              objectFit="cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gray-300">
              <HeirloomsIcon className="h-12 w-12 text-gray-600" />
            </div>
          )}
        </div>

        <CardHeader className="pb-3">
          {artifact.collection ? (
            <div className="mb-2">
              <CollectionLabel
                collectionId={artifact.collection.id}
                collectionName={artifact.collection.title}
                size="sm"
                clickable={false}
              />
            </div>
          ) : (
            <div className="mb-2">
              <CollectionLabel collectionId="unsorted" collectionName="Unsorted" size="sm" clickable={false} />
            </div>
          )}
          <h3 className="font-semibold leading-tight line-clamp-1">{artifact.title}</h3>
        </CardHeader>

        <CardContent className="space-y-2 pt-0 pb-4">
          {artifact.description && <p className="text-sm text-muted-foreground line-clamp-2">{artifact.description}</p>}
          <div className="flex gap-2 text-xs text-muted-foreground">
            {artifact.year_acquired && <span>{artifact.year_acquired}</span>}
            {artifact.year_acquired && artifact.origin && <span>•</span>}
            {artifact.origin && <span className="line-clamp-1">{artifact.origin}</span>}
          </div>
          {showAuthor && artifact.user_id && (
            <div className="pt-1">
              <Author userId={artifact.user_id} authorName={authorName} size="sm" />
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}
