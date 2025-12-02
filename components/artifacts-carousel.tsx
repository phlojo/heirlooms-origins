"use client"

import { useRef, useState, useEffect, useCallback } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ArtifactCard } from "@/components/artifact-card"
import { ArtifactCardCompact } from "@/components/artifact-card-compact"

interface Artifact {
  id: string
  slug: string
  title: string
  description?: string | null
  media_urls?: string[]
  media_derivatives?: Record<string, any> | null
  thumbnail_url?: string | null
  user_id?: string
  artifact_type?: {
    id: string
    name: string
    icon_name: string
  } | null
  collection_id?: string
  created_at?: string
}

interface ArtifactsCarouselProps {
  artifacts: Artifact[]
  canEdit?: boolean
  /** Hide the empty state message */
  hideEmptyState?: boolean
  /** Use compact cards (120px thumbnails) instead of standard cards */
  compact?: boolean
  /** Enable infinite/circular scrolling - never ends in either direction */
  infinite?: boolean
}

export function ArtifactsCarousel({ artifacts, canEdit, hideEmptyState, compact, infinite }: ArtifactsCarouselProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [isAnimating, setIsAnimating] = useState(false)
  const animationRef = useRef<number | null>(null)

  // For infinite scroll, we triple the items to allow seamless looping
  const displayArtifacts = infinite && artifacts.length > 0
    ? [...artifacts, ...artifacts, ...artifacts]
    : artifacts

  // Calculate card and gap sizes
  const getCardWidth = useCallback(() => compact ? 120 : 320, [compact])
  const getGapWidth = useCallback(() => compact ? 12 : 24, [compact])

  // Get the width of one complete set of artifacts
  const getSingleSetWidth = useCallback(() => {
    const cardWidth = getCardWidth()
    const gapWidth = getGapWidth()
    return artifacts.length * (cardWidth + gapWidth)
  }, [artifacts.length, getCardWidth, getGapWidth])

  // Initialize scroll position to middle set for infinite mode
  useEffect(() => {
    if (infinite && scrollContainerRef.current && artifacts.length > 0) {
      const singleSetWidth = getSingleSetWidth()
      // Start at the beginning of the middle set (with spacer offset)
      scrollContainerRef.current.scrollLeft = singleSetWidth + 16
    }
  }, [infinite, artifacts.length, getSingleSetWidth])

  // Reposition scroll to maintain infinite illusion (called after animation completes)
  const repositionIfNeeded = useCallback(() => {
    if (!infinite || !scrollContainerRef.current || artifacts.length === 0) return

    const container = scrollContainerRef.current
    const singleSetWidth = getSingleSetWidth()
    const scrollLeft = container.scrollLeft

    // If we've scrolled into the third set, jump back to the equivalent position in the middle set
    if (scrollLeft >= singleSetWidth * 2) {
      container.scrollLeft = scrollLeft - singleSetWidth
    }
    // If we've scrolled into the first set, jump forward to the equivalent position in the middle set
    else if (scrollLeft < singleSetWidth) {
      container.scrollLeft = scrollLeft + singleSetWidth
    }
  }, [infinite, artifacts.length, getSingleSetWidth])

  // Easing function: ease-out cubic for smooth deceleration
  const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3)

  const animateScroll = useCallback((targetScrollLeft: number, duration: number = 400) => {
    if (!scrollContainerRef.current) return

    // Cancel any existing animation
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
    }

    setIsAnimating(true)
    const container = scrollContainerRef.current
    const startScrollLeft = container.scrollLeft
    const distance = targetScrollLeft - startScrollLeft
    const startTime = performance.now()

    const step = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      const easedProgress = easeOutCubic(progress)

      container.scrollLeft = startScrollLeft + distance * easedProgress

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(step)
      } else {
        setIsAnimating(false)
        animationRef.current = null
        // Reposition after animation completes for seamless looping
        repositionIfNeeded()
      }
    }

    animationRef.current = requestAnimationFrame(step)
  }, [repositionIfNeeded])

  const scroll = useCallback((direction: "left" | "right") => {
    if (!scrollContainerRef.current || isAnimating) return

    const container = scrollContainerRef.current
    const cardWidth = getCardWidth()
    const gapWidth = getGapWidth()

    // Scroll by ~3 cards for compact, ~1 card for standard
    const cardsToScroll = compact ? 3 : 1
    const scrollAmount = cardsToScroll * (cardWidth + gapWidth)

    const newScrollLeft = container.scrollLeft + (direction === "left" ? -scrollAmount : scrollAmount)

    if (!infinite) {
      // Clamp to valid scroll range for non-infinite
      const maxScroll = container.scrollWidth - container.clientWidth
      const clampedScrollLeft = Math.max(0, Math.min(newScrollLeft, maxScroll))
      animateScroll(clampedScrollLeft, 400)
    } else {
      // For infinite, just scroll - repositioning happens after animation
      animateScroll(newScrollLeft, 400)
    }
  }, [isAnimating, compact, infinite, animateScroll, getCardWidth, getGapWidth])

  // Cleanup animation on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])

  if (artifacts.length === 0) {
    if (hideEmptyState) return null
    return (
      <div className="mx-6 rounded-lg border border-dashed p-12 text-center lg:mx-8">
        <p className="text-sm text-muted-foreground">No artifacts in this collection yet.</p>
        {canEdit && (
          <p className="mt-2 text-xs text-muted-foreground">Click "Add Artifact" above to add your first item.</p>
        )}
      </div>
    )
  }

  return (
    <div className="relative w-full overflow-hidden">
      {/* Left Navigation Button - Always visible for infinite */}
      {(infinite || artifacts.length > 3) && (
        <Button
          variant="outline"
          size="icon"
          className="absolute left-2 top-1/2 z-10 h-10 w-10 -translate-y-1/2 rounded-full bg-background/90 backdrop-blur-sm shadow-lg hover:bg-accent lg:left-4"
          onClick={() => scroll("left")}
          onPointerDown={(e) => e.stopPropagation()}
          disabled={isAnimating}
        >
          <ChevronLeft className="h-5 w-5" />
          <span className="sr-only">Scroll left</span>
        </Button>
      )}

      {/* Right Navigation Button - Always visible for infinite */}
      {(infinite || artifacts.length > 3) && (
        <Button
          variant="outline"
          size="icon"
          className="absolute right-2 top-1/2 z-10 h-10 w-10 -translate-y-1/2 rounded-full bg-background/90 backdrop-blur-sm shadow-lg hover:bg-accent lg:right-4"
          onClick={() => scroll("right")}
          onPointerDown={(e) => e.stopPropagation()}
          disabled={isAnimating}
        >
          <ChevronRight className="h-5 w-5" />
          <span className="sr-only">Scroll right</span>
        </Button>
      )}

      <div
        ref={scrollContainerRef}
        className={`flex items-start overflow-x-auto pb-4 scrollbar-hide ${
          compact ? "gap-3" : "gap-6"
        }`}
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          overscrollBehaviorX: "contain",
        }}
      >
        {/* Leading spacer */}
        <div className="flex-none w-4 lg:w-6" aria-hidden="true" />

        {displayArtifacts.map((artifact, index) => (
          <div
            key={`${artifact.id}-${index}`}
            className={`flex-none ${
              compact ? "w-[120px]" : "w-[75vw] lg:w-80"
            }`}
          >
            {compact ? (
              <ArtifactCardCompact artifact={artifact} />
            ) : (
              <ArtifactCard artifact={artifact} />
            )}
          </div>
        ))}

        {/* Trailing spacer */}
        <div className="flex-none w-4 lg:w-6" aria-hidden="true" />
      </div>
    </div>
  )
}
