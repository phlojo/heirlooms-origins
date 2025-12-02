"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { Package, Grid3x3, Grid2x2, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ArtifactCard } from "@/components/artifact-card"
import { ArtifactCardCompact } from "@/components/artifact-card-compact"
import { MasonryGrid } from "@/components/masonry-grid"
import { cn } from "@/lib/utils"

/**
 * Sort options for community showcase
 * Foundation for future sorting capabilities
 */
export type ShowcaseSortOption =
  | "random"      // Random selection (current default)
  | "newest"      // Most recently added
  | "most-loved"  // Most favorites/likes (future)
  | "most-viewed" // Most views (future)
  | "trending"    // Trending/hot (future)

interface ShowcaseArtifact {
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
}

interface CommunityShowcaseProps {
  /** Artifacts to display (max 6 recommended) */
  artifacts: ShowcaseArtifact[]
  /** Title for the section */
  title?: string
  /** Subtitle/description */
  subtitle?: string
  /** Current sort option (for future use) */
  sortBy?: ShowcaseSortOption
  /** Callback when sort changes (for future use) */
  onSortChange?: (sort: ShowcaseSortOption) => void
  /** Show the "View All" link */
  showViewAll?: boolean
  /** URL for "View All" link */
  viewAllHref?: string
  /** Maximum number of artifacts to show */
  maxItems?: number
  /** Show author information on cards */
  showAuthor?: boolean
  /** Custom class name for the container */
  className?: string
}

type ViewType = "standard" | "compact"

const STORAGE_KEY = "heirloom-showcase-view"

/**
 * CommunityShowcase - Reusable component for displaying public artifacts
 *
 * Features:
 * - Masonry grid layout with responsive columns
 * - Toggle between standard (2x2 mobile) and compact (3x3 mobile) views
 * - Persists view preference to localStorage
 * - Foundation for sort options (random, newest, most-loved, etc.)
 *
 * Usage:
 * ```tsx
 * <CommunityShowcase
 *   artifacts={publicArtifacts}
 *   title="Community Showcase"
 *   subtitle="Discover artifacts from the community"
 *   showViewAll
 *   viewAllHref="/artifacts?tab=all"
 * />
 * ```
 */
export function CommunityShowcase({
  artifacts,
  title = "Community Showcase",
  subtitle = "Artifacts",
  sortBy = "random",
  onSortChange,
  showViewAll = true,
  viewAllHref = "/artifacts",
  maxItems = 9,
  showAuthor = false,
  className,
}: CommunityShowcaseProps) {
  const [viewType, setViewType] = useState<ViewType>("compact")
  const [mounted, setMounted] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)

  // Load view preference from localStorage on mount
  useEffect(() => {
    setMounted(true)
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === "standard" || saved === "compact") {
      setViewType(saved)
    }
  }, [])

  const handleViewToggle = () => {
    // Start transition
    setIsTransitioning(true)

    // After fade out, switch view
    setTimeout(() => {
      const newView: ViewType = viewType === "standard" ? "compact" : "standard"
      setViewType(newView)
      localStorage.setItem(STORAGE_KEY, newView)

      // After a brief delay, fade back in
      setTimeout(() => {
        setIsTransitioning(false)
      }, 50)
    }, 200)
  }

  const isCompact = viewType === "compact"
  // Show 9 cards in compact mode, 6 in standard mode
  const itemCount = isCompact ? Math.min(maxItems, 9) : Math.min(maxItems, 6)
  const displayArtifacts = artifacts.slice(0, itemCount)

  if (artifacts.length === 0) {
    return null
  }

  const CardComponent = isCompact ? ArtifactCardCompact : ArtifactCard

  return (
    <section className={cn("py-12 md:py-16", className)}>
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-end justify-between mb-6">
          {/* Left side: Icon + Title + Subtitle */}
          <div className="flex items-end gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400 mb-0.5">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{title}</p>
              <h2 className="text-xl md:text-2xl font-bold tracking-tight leading-tight">{subtitle}</h2>
            </div>
          </div>

          {/* Right side: View toggle + View All grouped */}
          <div className="flex items-center gap-3 self-end mb-0.5">
            {/* View toggle button */}
            {mounted && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleViewToggle}
                className="h-8 w-8"
                title={isCompact ? "Switch to large cards" : "Switch to small cards"}
              >
                {isCompact ? (
                  <Grid2x2 className="h-4 w-4" />
                ) : (
                  <Grid3x3 className="h-4 w-4" />
                )}
              </Button>
            )}

            {/* View All link */}
            {showViewAll && (
              <Link
                href={viewAllHref}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                View All
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        </div>

        {/* Masonry Grid with crossfade transition */}
        <div
          className={cn(
            "transition-opacity duration-200 ease-in-out",
            isTransitioning ? "opacity-0" : "opacity-100"
          )}
        >
          <MasonryGrid isCompact={isCompact} gutter={12}>
            {displayArtifacts.map((artifact) => (
              <CardComponent
                key={artifact.id}
                artifact={artifact}
                showAuthor={showAuthor}
              />
            ))}
          </MasonryGrid>
        </div>
      </div>
    </section>
  )
}
