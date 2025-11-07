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
}: StickyNavProps) {
  const getNavUrl = (id: string) => {
    const baseUrl = `/${itemType}s/${id}`
    return mode ? `${baseUrl}?mode=${mode}` : baseUrl
  }

  return (
    <div className="sticky top-16 z-30 -mx-6 bg-background px-6 pb-4 lg:-mx-8 lg:px-8">
      <div className="mb-4 flex items-center gap-2 mt-2">
        <Button variant="ghost" size="sm" asChild className="gap-2">
          <Link href={backHref}>
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm font-medium">{backLabel}</span>
          </Link>
        </Button>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {/* Previous button, Title, Edit button */}
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
          <div className="flex flex-col min-w-0">
            <h1 className="text-balance text-3xl font-bold tracking-tight min-w-0">{title}</h1>
            {authorUserId && (
              <div className="mt-1">
                <Author userId={authorUserId} authorName={authorName} size="sm" />
              </div>
            )}
          </div>
          {canEdit && editHref && (
            <Button variant="outline" size="sm" asChild className="shrink-0 bg-transparent ml-2">
              <Link href={editHref}>
                <Edit className="h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>
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
  )
}
