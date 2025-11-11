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
      <Card className="group overflow-hidden border p-0 transition-all hover:shadow-lg rounded-tl-md rounded-tr-md rounded-bl-md rounded-br-sm">
        <div className="relative aspect-square overflow-hidden bg-muted">
          {thumbnailUrl ? (
            <img
              src={thumbnailUrl || "/placeholder.svg"}
              alt={artifact.title}
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10">
              <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
            </div>
          )}
        </div>

        <CardHeader className="pb-1.5 pt-2 px-2">
          <h3 className="font-semibold text-xs leading-tight truncate">{artifact.title}</h3>
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
