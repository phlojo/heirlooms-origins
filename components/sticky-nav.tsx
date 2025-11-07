"use client"

import { Button } from "@/components/ui/button"
import { ArrowLeft, Edit, ChevronLeft, ChevronRight } from "lucide-react"
import Link from "next/link"
import { Author } from "@/components/author"

interface StickyNavProps {
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
  itemType?: "artifact" | "collection"
  mode?: "all" | "mine"
  authorUserId?: string
  authorName?: string
  showBackButton?: boolean
}

export function StickyNav({
  title,
  backHref,
  backLabel,
  previousItem,
  nextItem,
  editHref,
  canEdit = false,
  itemType = "artifact",
  mode,
  authorUserId,
  authorName,
  showBackButton = true,
}: StickyNavProps) {
  const getNavUrl = (id: string) => {
    const baseUrl = `/${itemType}s/${id}`
    return mode ? `${baseUrl}?mode=${mode}` : baseUrl
  }

  const truncateBackLabel = (label: string) => {
    if (itemType === "collection") {
      return label.length > 20 ? label.slice(0, 20) + "..." : label
    } else {
      const withoutSuffix = label.endsWith(" Collection") ? label.slice(0, -11) : label
      const truncated = withoutSuffix.length > 20 ? withoutSuffix.slice(0, 20) + "..." : withoutSuffix
      return truncated + " Collection"
    }
  }

  const displayLabel = truncateBackLabel(backLabel)

  return (
    <div className="sticky top-3 lg:top-16 z-50 bg-background/90 border-b rounded-lg">
      <div className="container max-w-7xl mx-auto lg:px-8 py-3 px-0 rounded-lg">
        {showBackButton && (
          <div className="flex items-center gap-2 mb-3">
            <Button variant="ghost" size="sm" asChild className="gap-2">
              <Link href={backHref}>
                <ArrowLeft className="h-4 w-4" />
                <span className="text-sm font-medium">{displayLabel}</span>
              </Link>
            </Button>
          </div>
        )}

        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {/* Previous button */}
            <Button
              variant="outline"
              size="icon"
              asChild={!!previousItem}
              disabled={!previousItem}
              className={`shrink-0 bg-transparent ${!previousItem ? "opacity-50 pointer-events-none" : ""}`}
            >
              {previousItem ? (
                <Link href={getNavUrl(previousItem.id)} title={previousItem.title}>
                  <ChevronLeft className="h-5 w-5" />
                </Link>
              ) : (
                <span>
                  <ChevronLeft className="h-5 w-5" />
                </span>
              )}
            </Button>

            <div className="flex flex-col min-w-0 gap-1 text-center items-center">
              <h1 className="text-balance font-bold tracking-tight min-w-0 text-center text-base">{title}</h1>
              {authorUserId && <Author userId={authorUserId} authorName={authorName} size="sm" />}
            </div>

            {/* Edit button */}
            {canEdit && editHref && (
              <Button variant="outline" size="sm" asChild className="shrink-0 bg-transparent ml-2">
                <Link href={editHref}>
                  <Edit className="h-4 w-4" />
                </Link>
              </Button>
            )}
          </div>

          {/* Next button */}
          <Button
            variant="outline"
            size="icon"
            asChild={!!nextItem}
            disabled={!nextItem}
            className={`shrink-0 bg-transparent ${!nextItem ? "opacity-50 pointer-events-none" : ""}`}
          >
            {nextItem ? (
              <Link href={getNavUrl(nextItem.id)} title={nextItem.title}>
                <ChevronRight className="h-5 w-5" />
              </Link>
            ) : (
              <span>
                <ChevronRight className="h-5 w-5" />
              </span>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
