"use client"

import Link from "next/link"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Author } from "@/components/author"
import { CollectionThumbnailGrid } from "@/components/collection-thumbnail-grid"
import { Badge } from "@/components/ui/badge"
import { Settings } from 'lucide-react'
import { useState, useEffect } from "react"

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

  useEffect(() => {
    if (!tooltipOpen) return

    const handleScroll = () => {
      setTooltipOpen(false)
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [tooltipOpen])

  const handleCardClick = (e: React.MouseEvent) => {
    // Let Links handle their own navigation
  }

  const handleGearClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setTooltipOpen(!tooltipOpen)
  }

  return (
    <Link href={href}>
      <Card className="group overflow-hidden border transition-all hover:shadow-lg p-0 relative">
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
          {tooltipOpen && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-10 pointer-events-none">
              <div className="bg-background border border-border rounded-lg shadow-lg p-4 max-w-xs mx-4">
                <p className="text-sm">
                  This collection holds your uncategorized artifacts — items you&apos;ve created without assigning a
                  collection, or ones that remained after a collection was deleted.
                </p>
              </div>
            </div>
          )}
        </div>

        <CardHeader className="pb-0">
          <h3 className="font-semibold leading-tight text-2xl pb-2 pt-2">{collection.title}</h3>
          <div className="flex items-center gap-2 flex-wrap pt-1">
            {collection.is_public === false && <Badge variant="purple">Private</Badge>}
            {collection.isUnsorted && (
              <button
                onClick={handleGearClick}
                className="inline-flex"
                type="button"
              >
                <Badge variant="blue" className="cursor-pointer">
                  <Settings className="h-3 w-3" />
                </Badge>
              </button>
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
    </Link>
  )
}
