"use client"

import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Author } from "@/components/author"
import { Badge } from "@/components/ui/badge"
import { Settings } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import MediaImage from "@/components/media-image"
import { CollectionThumbnailGrid } from "@/components/collection-thumbnail-grid"

interface CollectionCardHorizontalProps {
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

export function CollectionCardHorizontal({ collection, mode }: CollectionCardHorizontalProps) {
  const baseHref = collection.slug ? `/collections/${collection.slug}` : `/collections/${collection.id}`
  const href = mode ? `${baseHref}?mode=${mode}` : baseHref

  return (
    <Link href={href}>
      <Card className="group overflow-hidden border transition-all hover:shadow-lg p-0 flex flex-row h-28 min-h-28">
        {/* Thumbnail - 1/3 of card width */}
        <div className="relative w-1/3 overflow-hidden bg-muted shrink-0">
          <div className="h-full w-full transition-transform group-hover:scale-105">
            {collection.thumbnailImages && collection.thumbnailImages.length > 0 ? (
              <CollectionThumbnailGrid images={collection.thumbnailImages} title={collection.title} />
            ) : collection.cover_image ? (
              <MediaImage
                src={collection.cover_image || "/placeholder.svg"}
                alt={collection.title}
                className="w-full h-full"
                objectFit="cover"
              />
            ) : (
              <CollectionThumbnailGrid images={[]} title={collection.title} />
            )}
          </div>
        </div>

        <div className="w-2/3 p-3 flex flex-col justify-between min-w-0 gap-4">
          <div className="min-w-0">
            <div className="flex items-start gap-2 flex-wrap">
              <h3 className="font-semibold leading-tight line-clamp-2 text-lg flex-1 min-w-0">{collection.title}</h3>
              {collection.is_public === false && (
                <Badge variant="purple" className="shrink-0">
                  Private
                </Badge>
              )}
              {collection.isUnsorted && (
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex shrink-0"
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
                        This collection holds your uncategorized artifacts — items you&apos;ve created without assigning
                        a collection, or ones that remained after a collection was deleted.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 min-w-0">
            <p className="text-sm text-muted-foreground whitespace-nowrap">
              {collection.itemCount} {collection.itemCount === 1 ? "artifact" : "artifacts"}
            </p>
            <Author userId={collection.user_id} authorName={collection.authorName || undefined} size="sm" />
          </div>
        </div>
      </Card>
    </Link>
  )
}
