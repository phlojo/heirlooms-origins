import Link from "next/link"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { ImageIcon } from "lucide-react"
import { Author } from "@/components/author"
import { getThumbnailUrl } from "@/lib/cloudinary"

interface ArtifactCardProps {
  artifact: {
    id: string
    title: string
    description?: string
    year_acquired?: number
    origin?: string
    media_urls?: string[]
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
  const firstImage = artifact.media_urls?.[0]
  const thumbnailUrl = firstImage ? getThumbnailUrl(firstImage) : null

  return (
    <Link href={`/artifacts/${artifact.id}`}>
      <Card className="group overflow-hidden border p-0 transition-all hover:shadow-lg rounded-md">
        <div className="relative aspect-square overflow-hidden bg-muted">
          {thumbnailUrl ? (
            <img
              src={thumbnailUrl || "/placeholder.svg"}
              alt={artifact.title}
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10">
              <ImageIcon className="h-12 w-12 text-muted-foreground/40" />
            </div>
          )}
        </div>

        <CardHeader className="pb-2 pt-3 px-3">
          <h3 className="font-semibold text-sm leading-tight line-clamp-1">{artifact.title}</h3>
        </CardHeader>

        <CardContent className="pt-0 pb-3 px-3">
          <div className="flex gap-2 text-xs text-muted-foreground">
            {artifact.year_acquired && <span>{artifact.year_acquired}</span>}
            {artifact.year_acquired && artifact.origin && <span>•</span>}
            {artifact.origin && <span className="line-clamp-1">{artifact.origin}</span>}
          </div>
          {showAuthor && artifact.user_id && (
            <div className="text-right pt-0">
              <Author userId={artifact.user_id} authorName={authorName} size="sm" />
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}
