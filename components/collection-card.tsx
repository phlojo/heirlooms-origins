"use client"

import Link from "next/link"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Author } from "@/components/author"
import { CollectionThumbnailGrid } from "@/components/collection-thumbnail-grid"
import { Badge } from "@/components/ui/badge"
import { Settings } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

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
            <h3 className="font-semibold leading-tight line-clamp-1 text-2xl pb-0 pt-2">{collection.title}</h3>
            {collection.is_public === false && <Badge variant="purple">Private</Badge>}
            {collection.isUnsorted && (
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                      }}
                      onPointerDown={(e) => {
                        e.stopPropagation()
                      }}
                    >
                      <Badge variant="blue" className="px-1.5 cursor-help">
                        <Settings className="h-4 w-4" />
                      </Badge>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>
                      This collection holds your uncategorized artifacts — items you&apos;ve created without assigning a
                      collection, or ones that remained after a collection was deleted.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
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
