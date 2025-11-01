import Link from "next/link"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Author } from "@/components/author"
import { CollectionThumbnailGrid } from "@/components/collection-thumbnail-grid"

interface CollectionCardProps {
  collection: {
    id: string
    slug?: string // Added slug field
    title: string
    description?: string
    cover_image?: string
    itemCount: number
    user_id: string
    authorName?: string | null
    thumbnailImages?: string[]
  }
}

export function CollectionCard({ collection }: CollectionCardProps) {
  const href = collection.slug ? `/collections/${collection.slug}` : `/collections/${collection.id}`

  return (
    <Link href={href}>
      <Card className="group overflow-hidden border transition-all hover:shadow-lg p-0">
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          <div className="transition-transform group-hover:scale-105">
            {collection.thumbnailImages && collection.thumbnailImages.length > 0 ? (
              <CollectionThumbnailGrid images={collection.thumbnailImages} title={collection.title} />
            ) : collection.cover_image ? (
              <img
                src={collection.cover_image || "/placeholder.svg"}
                alt={collection.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <CollectionThumbnailGrid images={[]} title={collection.title} />
            )}
          </div>
        </div>

        <CardHeader className="pb-0">
          <h3 className="font-semibold leading-tight line-clamp-1 text-2xl">{collection.title}</h3>
        </CardHeader>

        <CardContent className="pt-0 pb-4 space-y-4 -mt-2">
          {collection.description && (
            <p className="text-sm text-muted-foreground line-clamp-3">{collection.description}</p>
          )}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {collection.itemCount} {collection.itemCount === 1 ? "artifact" : "artifacts"}
            </p>
            <Author userId={collection.user_id} authorName={collection.authorName || undefined} size="sm" />
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
