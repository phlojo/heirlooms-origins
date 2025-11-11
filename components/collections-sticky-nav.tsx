"use client"

import { Button } from "@/components/ui/button"
import { ArrowLeft, Edit } from "lucide-react"
import Link from "next/link"
import { Author } from "@/components/author"
import { useRouter } from "next/navigation"

interface CollectionsStickyNavProps {
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

export function CollectionsStickyNav({
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
}: CollectionsStickyNavProps) {
  const router = useRouter()

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

  const handleBack = () => {
    router.back()
  }

  return (
    <div className="sticky top-3 lg:top-16 z-50 bg-background/90 border-b border rounded-lg">
      <div className="container max-w-7xl mx-auto lg:px-8 rounded-lg px-1 py-1">
        <div className="flex justify-between gap-3 items-center">
          {/* Left: Back button */}
          {showBackButton && (
            <Button variant="ghost" size="sm" onClick={handleBack} className="gap-2 shrink-0 h-9">
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm font-medium">Back</span>
            </Button>
          )}

          {/* Divider */}
          {showBackButton && <div className="w-px h-9 bg-border shrink-0" />}

          {/* Center-Left: Title and Author stacked, left-justified */}
          <div className="flex flex-col justify-center gap-0.5 flex-1 min-w-0 py-0.5">
            <h1 className="font-bold tracking-tight text-left truncate w-full text-base leading-tight">{title}</h1>
            {authorUserId && (
              <div className="text-left">
                <Author userId={authorUserId} authorName={authorName} size="sm" />
              </div>
            )}
          </div>

          {/* Right: Edit button */}
          <div className="flex items-center gap-2 shrink-0">
            {canEdit && editHref && (
              <Button variant="ghost" size="sm" asChild className="h-9">
                <Link href={editHref}>
                  <Edit className="h-4 w-4" />
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
