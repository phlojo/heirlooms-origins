"use client"

import { Button } from "@/components/ui/button"
import { ArrowLeft, Edit, ChevronRight } from "lucide-react"
import Link from "next/link"
import { Author } from "@/components/author"

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
}: ArtifactStickyNavProps) {
  const getNavUrl = (id: string) => `/artifacts/${id}`

  const truncateBackLabel = (label: string) => {
    const withoutSuffix = label.endsWith(" Collection") ? label.slice(0, -11) : label
    const truncated = withoutSuffix.length > 20 ? withoutSuffix.slice(0, 20) + "..." : withoutSuffix
    return truncated + " Collection"
  }

  const displayLabel = truncateBackLabel(backLabel)

  return (
    <div className="sticky top-3 lg:top-16 z-50 bg-background/90 border-b rounded-lg">
      <div className="container max-w-7xl mx-auto lg:px-8 py-3 px-0 rounded-lg">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Back button */}
          <div className="flex items-center gap-2 min-w-0">
            <Button variant="ghost" size="sm" asChild className="gap-2 shrink-0">
              <Link href={backHref}>
                <ArrowLeft className="h-4 w-4" />
                <span className="text-sm font-medium hidden sm:inline">{displayLabel}</span>
              </Link>
            </Button>
          </div>

          {/* Center: Title and Author */}
          <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
            <h1 className="text-balance font-bold tracking-tight text-center text-base truncate w-full">{title}</h1>
            {authorUserId && <Author userId={authorUserId} authorName={authorName} size="sm" />}
          </div>

          {/* Right: Forward/Edit button */}
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
              className={`${!nextItem ? "opacity-50 pointer-events-none" : ""}`}
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
    </div>
  )
}
