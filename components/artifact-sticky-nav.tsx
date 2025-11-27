"use client"

import { Button } from "@/components/ui/button"
import { ArrowRight, ArrowLeft, Heart, Pencil } from "lucide-react"
import Link from "next/link"
import { CollectionLabel } from "@/components/collection-label"
import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"

interface ArtifactStickyNavProps {
  title: string
  backHref?: string
  backLabel: string
  previousItem?: {
    id: string
    slug: string
    title: string
  } | null
  nextItem?: {
    id: string
    slug: string
    title: string
  } | null
  editHref?: string
  canEdit?: boolean
  isEditMode?: boolean
  authorUserId?: string
  authorName?: string
  collectionId?: string
  collectionSlug?: string
  collectionName?: string
  currentPosition?: number
  totalCount?: number
  currentUserId?: string
  isCurrentUserAdmin?: boolean
  contentOwnerId?: string
}

export function ArtifactStickyNav({
  title,
  backHref,
  backLabel,
  previousItem,
  nextItem,
  editHref,
  canEdit = false,
  isEditMode = false,
  authorUserId,
  authorName,
  collectionId,
  collectionSlug,
  collectionName,
  currentPosition,
  totalCount,
  currentUserId,
  isCurrentUserAdmin = false,
  contentOwnerId,
}: ArtifactStickyNavProps) {
  const [isFavorited, setIsFavorited] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [lastScrollY, setLastScrollY] = useState(0)

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      const scrollDifference = Math.abs(currentScrollY - lastScrollY)

      // Only change state if scrolled more than threshold (prevents jumpiness)
      const SCROLL_THRESHOLD = 50

      if (scrollDifference < SCROLL_THRESHOLD) {
        return // Ignore tiny scrolls
      }

      // Show top section when scrolling up or at top of page
      // Hide top section when scrolling down
      if (currentScrollY < lastScrollY || currentScrollY < 50) {
        setIsScrolled(false)
      } else if (currentScrollY > lastScrollY && currentScrollY > 50) {
        setIsScrolled(true)
      }

      setLastScrollY(currentScrollY)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [lastScrollY])

  const getNavUrl = (slug: string) => (isEditMode ? `/artifacts/${slug}?mode=edit` : `/artifacts/${slug}`)

  const truncateBackLabel = (label: string) => {
    const withoutSuffix = label.endsWith(" Collection") ? label.slice(0, -11) : label
    const truncated = withoutSuffix.length > 20 ? withoutSuffix.slice(0, 20) + "..." : withoutSuffix
    return truncated + " Collection"
  }

  const displayLabel = truncateBackLabel(backLabel)

  const toggleFavorite = () => {
    setIsFavorited(!isFavorited)
  }

  const showSuperUserBadge = isCurrentUserAdmin && contentOwnerId && currentUserId && contentOwnerId !== currentUserId

  return (
    <div className="sticky top-4 lg:top-20 z-50 bg-background/90 border rounded-lg mb-4 py-2 will-change-transform">
      <div className="container max-w-7xl mx-auto">
        <div className="flex flex-col gap-0">
          {/* First row: Navigation with left arrow, collection info, right arrow */}
          <div
            className={`flex items-center justify-between border-b gap-0 pb-0 px-3.5 transition-all duration-300 overflow-hidden ${
              isScrolled ? 'max-h-0 opacity-0' : 'max-h-20 opacity-100'
            }`}
          >
            {/* Left: Previous button */}
            <Button
              variant="ghost"
              size="icon"
              asChild={!!previousItem}
              disabled={!previousItem}
              className={`shrink-0 ${!previousItem ? "!opacity-15 pointer-events-none" : "hover:bg-accent"}`}
            >
              {previousItem ? (
                <Link href={getNavUrl(previousItem.slug)} title={previousItem.title}>
                  <ArrowLeft className="h-6 w-6" strokeWidth={2.5} />
                </Link>
              ) : (
                <span>
                  <ArrowLeft className="h-6 w-6" strokeWidth={2.5} />
                </span>
              )}
            </Button>

            {/* Center: Collection info */}
            {collectionId && collectionName && (
              <div className="flex items-center gap-1.5 text-xs flex-wrap justify-center flex-1">
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
                  clickable={!isEditMode}
                />
              </div>
            )}

            {/* Right: Next button */}
            <Button
              variant="ghost"
              size="icon"
              asChild={!!nextItem}
              disabled={!nextItem}
              className={`shrink-0 ${!nextItem ? "!opacity-15 pointer-events-none" : "hover:bg-accent"}`}
            >
              {nextItem ? (
                <Link href={getNavUrl(nextItem.slug)} title={nextItem.title}>
                  <ArrowRight className="h-6 w-6" strokeWidth={2.5} />
                </Link>
              ) : (
                <span>
                  <ArrowRight className="h-6 w-6" strokeWidth={2.5} />
                </span>
              )}
            </Button>
          </div>

          {/* Second row: Title and Heart icon */}
          <div className="flex items-center justify-between gap-0 pb-0">
            <div className="flex items-center gap-2 flex-1 min-w-0 px-3.5 py-2">
              <h1 className="text-balance font-bold tracking-tight flex-1 min-w-0 text-xl">{title}</h1>
              {showSuperUserBadge && (
                <Badge variant="destructive" className="shrink-0 text-xs">
                  Super User
                </Badge>
              )}
            </div>
            {isEditMode ? (
              <div className="shrink-0 h-9 w-9 mr-3.5 flex items-center justify-center rounded-full bg-purple-600">
                <Pencil className="h-4 w-4 text-white" />
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleFavorite}
                className="shrink-0 h-9 w-9 p-0 mr-3.5"
                aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
              >
                <Heart className={`h-5 w-5 ${isFavorited ? "fill-red-500 text-red-500" : "text-muted-foreground"}`} />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
