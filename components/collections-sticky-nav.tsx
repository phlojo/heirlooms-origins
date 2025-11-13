"use client"

import { Button } from "@/components/ui/button"
import { ArrowLeft, Heart, Settings } from "lucide-react"
import { Author } from "@/components/author"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"
import { useState } from "react"

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
  isPrivate?: boolean
  isUnsorted?: boolean
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
  isPrivate = false,
  isUnsorted = false,
}: CollectionsStickyNavProps) {
  const router = useRouter()
  const [isFavorited, setIsFavorited] = useState(false)
  const [tooltipOpen, setTooltipOpen] = useState(false)

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

  const toggleFavorite = () => {
    setIsFavorited(!isFavorited)
  }

  return (
    <div className="sticky top-3 lg:top-16 z-50 bg-background/90 border-b border rounded-lg">
      <div className="container max-w-7xl mx-auto lg:px-8 rounded-lg px-1 py-1">
        <div className="flex justify-between items-center gap-0">
          {/* Left: Back button */}
          {showBackButton && (
            <Button variant="ghost" size="sm" onClick={handleBack} className="gap-2 shrink-0 h-9">
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm font-medium">Back</span>
            </Button>
          )}

          {/* Divider */}
          {showBackButton && <div className="w-px bg-border shrink-0 h-12 mr-2.5" />}

          {/* Center-Left: Title and Author/Private pill stacked, left-justified */}
          <div className="flex flex-col justify-center gap-0.5 flex-1 min-w-0 py-0.5">
            <h1 className="font-bold tracking-tight w-full leading-tight break-words line-clamp-2 text-2xl text-left pl-[0] pr-0">
              {title}
            </h1>
            <div className="text-left flex items-center gap-2">
              {isPrivate && <Badge variant="purple">Private</Badge>}
              {isUnsorted && (
                <Badge variant="blue">
                  <Settings className="h-3 w-3" />
                </Badge>
              )}
              {!isPrivate && !isUnsorted && authorUserId && (
                <Author userId={authorUserId} authorName={authorName} size="sm" />
              )}
            </div>
          </div>

          <Button variant="ghost" size="sm" onClick={toggleFavorite} className="shrink-0 h-9 w-9 p-0">
            <Heart className={`h-5 w-5 ${isFavorited ? "fill-red-500 text-red-500" : "text-muted-foreground"}`} />
          </Button>
        </div>
      </div>
    </div>
  )
}
