"use client"

import { Button } from "@/components/ui/button"
import { Edit, ArrowRight, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Author } from "@/components/author"
import { CollectionLabel } from "@/components/collection-label"

interface ArtifactStickyNavProps {
  title: string
  backHref: string
  backLabel: string
  previousItem?: {
    id: string
    title: string
  } | null
  nextItem?: {
    id: string
    title: string
  } | null
  editHref?: string
  canEdit?: boolean
  authorUserId?: string
  authorName?: string
  collectionId?: string
  collectionSlug?: string
  collectionName?: string
  currentPosition?: number
  totalCount?: number
}

export function ArtifactStickyNav({
  title,
  backHref,
  backLabel,
  previousItem,
  nextItem,
  editHref,
  canEdit = false,
  authorUserId,
  authorName,
  collectionId,
  collectionSlug,
  collectionName,
  currentPosition,
  totalCount,
}: ArtifactStickyNavProps) {
  const getNavUrl = (id: string) => `/artifacts/${id}`

  const truncateBackLabel = (label: string) => {
    const withoutSuffix = label.endsWith(" Collection") ? label.slice(0, -11) : label
    const truncated = withoutSuffix.length > 20 ? withoutSuffix.slice(0, 20) + "..." : withoutSuffix
    return truncated + " Collection"
  }

  const displayLabel = truncateBackLabel(backLabel)

  return (
    <div className="sticky top-3 lg:top-16 z-50 bg-background/90 border rounded-lg">
      <div className="container max-w-7xl mx-auto lg:px-8 py-3 px-0 rounded-lg border-none">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Previous button */}
          <div className="flex items-center gap-2 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              asChild={!!previousItem}
              disabled={!previousItem}
              className={`shrink-0 ${!previousItem ? "!opacity-15 pointer-events-none" : ""}`}
            >
              {previousItem ? (
                <Link href={getNavUrl(previousItem.id)} title={previousItem.title}>
                  <ArrowLeft className="h-5 w-5" />
                </Link>
              ) : (
                <span>
                  <ArrowLeft className="h-5 w-5" />
                </span>
              )}
            </Button>
          </div>

          {/* Center: Title and Author */}
          <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
            <h1 className="text-balance font-bold tracking-tight text-center truncate w-full text-lg">{title}</h1>
            {(collectionId || authorUserId) && (
              <div className="flex items-center gap-1.5 text-xs flex-wrap justify-center">
                {collectionId && collectionName && (
                  <>
                    {currentPosition && totalCount && (
                      <>
                        <span className="text-muted-foreground font-medium">
                          {currentPosition} of {totalCount}
                        </span>
                      </>
                    )}
                    <span className="text-muted-foreground">in</span>
                    <CollectionLabel
                      collectionId={collectionId}
                      collectionSlug={collectionSlug}
                      collectionName={collectionName}
                      size="sm"
                      clickable={true}
                    />
                  </>
                )}
                {authorUserId && (
                  <div className="flex items-center whitespace-nowrap">
                    <Author userId={authorUserId} authorName={authorName} size="sm" />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right: Edit and Next buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {canEdit && editHref && (
              <Button variant="ghost" size="sm" asChild>
                <Link href={editHref}>
                  <Edit className="h-4 w-4" />
                </Link>
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              asChild={!!nextItem}
              disabled={!nextItem}
              className={`${!nextItem ? "!opacity-15 pointer-events-none" : ""}`}
            >
              {nextItem ? (
                <Link href={getNavUrl(nextItem.id)} title={nextItem.title}>
                  <ArrowRight className="h-5 w-5" />
                </Link>
              ) : (
                <span>
                  <ArrowRight className="h-5 w-5" />
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
