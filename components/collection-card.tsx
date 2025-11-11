import Link from "next/link"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Author } from "@/components/author"
import { CollectionThumbnailGrid } from "@/components/collection-thumbnail-grid"

interface CollectionCardProps {
  collection: {
    id: string
    slug?: string
    title: string
    description?: string
    cover_image?: string
    itemCount: number
    user_id: string
    authorName?: string | null
    thumbnailImages?: string[]
    isUnsorted?: boolean
    is_public?: boolean
  }
  mode?: "all" | "mine"
}

export function CollectionCard({ collection, mode }: CollectionCardProps) {
  const baseHref = collection.slug ? `/collections/${collection.slug}` : `/collections/${collection.id}`
  const href = mode ? `${baseHref}?mode=${mode}` : baseHref

  return (
    <Link href={href}>
      <Card className="group overflow-hidden border transition-all hover:shadow-lg p-0">
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          <div className="h-full transition-transform group-hover:scale-105">
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
          <div className="flex items-center gap-2 flex-wrap pb-2">
            <h3 className="font-semibold leading-tight line-clamp-1 text-2xl">{collection.title}</h3>
            {collection.is_public === false && (
              <span className="inline-flex items-center rounded-full bg-purple-500/10 px-2.5 py-0.5 text-xs font-medium text-purple-700 dark:text-purple-400 border border-purple-500/20">
                Private
              </span>
            )}
            {collection.isUnsorted && (
              <span className="inline-flex items-center rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-400 border border-blue-500/20">
                Default
              </span>
            )}
          </div>
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
