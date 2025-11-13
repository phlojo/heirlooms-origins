"use client"

import Link from "next/link"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Author } from "@/components/author"
import { CollectionThumbnailGrid } from "@/components/collection-thumbnail-grid"
import { Badge } from "@/components/ui/badge"
import { Settings } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useState } from "react"

interface UncategorizedCollectionCardProps {
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

export function UncategorizedCollectionCard({ collection, mode }: UncategorizedCollectionCardProps) {
  const baseHref = collection.slug ? `/collections/${collection.slug}` : `/collections/${collection.id}`
  const href = mode ? `${baseHref}?mode=${mode}` : baseHref
  const [tooltipOpen, setTooltipOpen] = useState(false)

  return (
    <Card className="group overflow-hidden border transition-all hover:shadow-lg p-0">
      <Link href={href} className="block">
        <div className="relative aspect-[4/1.5] overflow-hidden bg-muted">
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
      </Link>

      <CardHeader className="pb-0">
        <Link href={href} className="block">
          <h3 className="font-semibold leading-tight text-2xl pb-2 pt-2">{collection.title}</h3>
        </Link>

        <div className="flex items-center gap-2 flex-wrap pb-2">
          {collection.is_public === false && <Badge variant="purple">Private</Badge>}
          {collection.isUnsorted && (
            <TooltipProvider delayDuration={0}>
              <Tooltip open={tooltipOpen} onOpenChange={setTooltipOpen}>
                <TooltipTrigger asChild>
                  <Badge
                    variant="blue"
                    className="cursor-pointer"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setTooltipOpen(!tooltipOpen)
                    }}
                    onPointerDown={(e) => {
                      e.stopPropagation()
                    }}
                  >
                    <Settings className="h-3 w-3" />
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="bottom" align="center" className="max-w-xs">
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
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {collection.itemCount} {collection.itemCount === 1 ? "artifact" : "artifacts"}
          </p>
          <Author userId={collection.user_id} authorName={collection.authorName || undefined} size="sm" />
        </div>
      </CardContent>
    </Card>
  )
}
