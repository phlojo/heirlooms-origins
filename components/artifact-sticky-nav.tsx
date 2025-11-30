"use client"

import { Button } from "@/components/ui/button"
import { StepForward, StepBack, Heart } from "lucide-react"
import Link from "next/link"
import { ArtifactBreadcrumb } from "@/components/artifact-breadcrumb"
import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { TranscriptionInput } from "@/components/transcription-input"

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
  currentUserId?: string
  isCurrentUserAdmin?: boolean
  contentOwnerId?: string
  // Edit mode title input props
  editTitle?: string
  onEditTitleChange?: (value: string) => void
  userId?: string
  // For breadcrumb navigation
  isLoggedIn?: boolean
  hasUnsavedChanges?: boolean
  onAbandonChanges?: () => Promise<void>
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
  currentUserId,
  isCurrentUserAdmin = false,
  contentOwnerId,
  editTitle,
  onEditTitleChange,
  userId,
  isLoggedIn = false,
  hasUnsavedChanges = false,
  onAbandonChanges,
}: ArtifactStickyNavProps) {
  const [isFavorited, setIsFavorited] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [lastScrollY, setLastScrollY] = useState(0)

  useEffect(() => {
    let rafId: number | null = null

    const handleScroll = () => {
      // Cancel pending animation frame to debounce
      if (rafId) {
        cancelAnimationFrame(rafId)
      }

      rafId = requestAnimationFrame(() => {
        const currentScrollY = window.scrollY
        const scrollDifference = Math.abs(currentScrollY - lastScrollY)

        // Only change state if scrolled more than threshold (prevents jumpiness)
        const SCROLL_THRESHOLD = 50

        if (scrollDifference < SCROLL_THRESHOLD) {
          return // Ignore tiny scrolls
        }

        // Prevent state updates at scroll boundaries to avoid flicker
        const docHeight = document.documentElement.scrollHeight
        const windowHeight = window.innerHeight
        const isAtBottom = currentScrollY + windowHeight >= docHeight - 10
        const isAtTop = currentScrollY < 50

        // Don't update state if we're at scroll boundaries
        if (isAtBottom || isAtTop) {
          if (isAtTop && isScrolled) {
            setIsScrolled(false)
          }
          return
        }

        // Show top section when scrolling up or at top of page
        // Hide top section when scrolling down
        if (currentScrollY < lastScrollY) {
          setIsScrolled(false)
        } else if (currentScrollY > lastScrollY) {
          setIsScrolled(true)
        }

        setLastScrollY(currentScrollY)
      })
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', handleScroll)
      if (rafId) {
        cancelAnimationFrame(rafId)
      }
    }
  }, [lastScrollY, isScrolled])

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
    <div className="artifact-sticky-nav sticky top-0 z-50 bg-background/90 border-b will-change-transform -mx-4 overflow-x-hidden">
      <div className="container max-w-7xl mx-auto">
        <div className="flex flex-col gap-0">
          {/* First row: Breadcrumb (collapses on scroll) */}
          <div
            className={`flex items-center justify-center border-b gap-0 px-3.5 transition-all duration-300 overflow-hidden ${
              isScrolled ? 'max-h-0 opacity-0 py-0' : 'max-h-20 opacity-100 py-2'
            }`}
          >
            <ArtifactBreadcrumb
              collectionId={collectionId}
              collectionSlug={collectionSlug}
              collectionName={collectionName}
              isLoggedIn={isLoggedIn}
              isEditMode={isEditMode}
              hasUnsavedChanges={hasUnsavedChanges}
              onAbandonChanges={onAbandonChanges}
            />
          </div>

          {/* Second row: Title with nav buttons (view) or just Title Input (edit) */}
          <div className="flex items-center justify-between gap-2 px-3.5 pt-2 pb-2">
            {isEditMode && onEditTitleChange && userId ? (
              // Edit mode: just the title input, no nav buttons
              <div className="flex-1 min-w-0">
                <TranscriptionInput
                  value={editTitle || ""}
                  onChange={onEditTitleChange}
                  placeholder="Enter artifact title"
                  type="input"
                  fieldType="title"
                  userId={userId}
                  entityType="artifact"
                  className="text-center"
                />
              </div>
            ) : (
              // View mode: prev button, title + heart, next button
              <>
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
                      <StepBack className="h-6 w-6" strokeWidth={2.5} />
                    </Link>
                  ) : (
                    <span>
                      <StepBack className="h-6 w-6" strokeWidth={2.5} />
                    </span>
                  )}
                </Button>

                {/* Center: Title and heart */}
                <div className="flex items-center justify-center gap-2 flex-1 min-w-0">
                  <h1 className="text-balance font-bold tracking-tight text-xl text-center truncate">{title}</h1>
                  {showSuperUserBadge && (
                    <Badge variant="destructive" className="shrink-0 text-xs">
                      Super User
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleFavorite}
                    className="shrink-0 h-9 w-9 p-0"
                    aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
                  >
                    <Heart className={`h-5 w-5 ${isFavorited ? "fill-red-500 text-red-500" : "text-muted-foreground"}`} />
                  </Button>
                </div>

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
                      <StepForward className="h-6 w-6" strokeWidth={2.5} />
                    </Link>
                  ) : (
                    <span>
                      <StepForward className="h-6 w-6" strokeWidth={2.5} />
                    </span>
                  )}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
