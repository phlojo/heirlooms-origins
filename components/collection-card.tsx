"use client"

import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Author } from "@/components/author"
import { CollectionThumbnailGrid } from "@/components/collection-thumbnail-grid"
import { Badge } from "@/components/ui/badge"
import { Settings } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import MediaImage from "@/components/media-image"

interface CollectionCardProps {
  collection: {
    id: string
    slug?: string
    title: string
    description?: string | null
    cover_image?: string | null
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

  const safeThumbnailImages = Array.isArray(collection.thumbnailImages) ? collection.thumbnailImages : []

  return (
    <Link href={href}>
      <Card className="group overflow-hidden border transition-all hover:shadow-lg p-0 animate-fade-in relative aspect-[4/3] sm:aspect-[3/2]">
        {/* Full-bleed thumbnail */}
        <div className="absolute inset-0 transition-transform group-hover:scale-105">
          {safeThumbnailImages.length > 0 ? (
            <CollectionThumbnailGrid images={safeThumbnailImages} title={collection.title} />
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

        {/* Text overlay at bottom */}
        <div className="absolute inset-x-0 bottom-0 bg-background/70 backdrop-blur-sm p-3 sm:p-4 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold leading-tight line-clamp-1 text-base sm:text-lg">{collection.title}</h3>
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

          <div className="flex items-center justify-between gap-2">
            {mode === "all" && <Author userId={collection.user_id} authorName={collection.authorName || undefined} size="sm" />}
            <p className="text-sm text-muted-foreground">
              {collection.itemCount} {collection.itemCount === 1 ? "artifact" : "artifacts"}
            </p>
          </div>
        </div>
      </Card>
    </Link>
  )
}
