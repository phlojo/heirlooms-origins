import Link from "next/link"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { HeirloomsIcon } from "@/components/heirlooms-icon"
import { Author } from "@/components/author"
import { getThumbnailUrl } from "@/lib/cloudinary"
import MediaImage from "@/components/media-image"

interface ArtifactCardProps {
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

export function ArtifactCard({ artifact, showAuthor = false, authorName }: ArtifactCardProps) {
  const thumbnailUrl = artifact.thumbnail_url ? getThumbnailUrl(artifact.thumbnail_url) : null

  return (
    <Link href={`/artifacts/${artifact.slug}`}>
      <Card className="group overflow-hidden border p-0 transition-all hover:shadow-lg rounded-md">
        <div className="relative aspect-square overflow-hidden bg-muted">
          {thumbnailUrl ? (
            <MediaImage
              key={thumbnailUrl}
              src={thumbnailUrl}
              alt={artifact.title}
              className="h-full w-full transition-transform group-hover:scale-105"
              objectFit="cover"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center bg-muted">
              <HeirloomsIcon className="h-12 w-12 text-muted-foreground/40 mb-2" />
              <p className="text-xs text-muted-foreground/60 px-4 text-center">
                {artifact.media_urls && artifact.media_urls.length > 0 
                  ? "Audio only" 
                  : "No media"}
              </p>
            </div>
          )}
        </div>

        <CardHeader className="pb-1.5 pt-2 px-2">
          <h3 className="font-semibold text-sm leading-tight truncate">{artifact.title}</h3>
        </CardHeader>

        <CardContent className="pt-0 pb-2 px-2">
          {showAuthor && artifact.user_id && (
            <div className="flex justify-end overflow-hidden">
              <Author userId={artifact.user_id} authorName={authorName} size="sm" />
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}
