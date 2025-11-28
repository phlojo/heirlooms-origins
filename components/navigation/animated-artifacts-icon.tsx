"use client"

import { useEffect, useState, useRef } from "react"
import { Package } from "lucide-react"
import { getDynamicLucideIcon } from "@/lib/utils/dynamic-icon"
import { cn } from "@/lib/utils"
import type { ArtifactType } from "@/lib/types/artifact-types"
import { getArtifactTypes } from "@/lib/actions/artifact-types"

interface AnimatedArtifactsIconProps {
  className?: string
}

/**
 * AnimatedArtifactsIcon - Cycles through artifact type icons from database
 *
 * Smoothly animates between different artifact type icons to showcase
 * the variety of artifacts that can be collected in Heirlooms.
 *
 * Data Source:
 * - Fetches active artifact types from Supabase on mount
 * - Uses icon_name from database to map to Lucide icons
 * - Falls back to Package icon if no types available
 *
 * Animation:
 * - Changes icon every 4 seconds
 * - Uses true crossfade with two overlapping icons
 * - Respects prefers-reduced-motion
 *
 * Styling:
 * - Inherits color from parent (text-muted-foreground or text-foreground)
 * - No stroke or fill changes - consistent with other bottom nav icons
 *
 * Accessibility:
 * - No rapid flashing (4s interval is very slow)
 * - Respects prefers-reduced-motion preference
 * - Semantic HTML with proper ARIA attributes
 */
export function AnimatedArtifactsIcon({ className }: AnimatedArtifactsIconProps) {
  const [artifactTypes, setArtifactTypes] = useState<ArtifactType[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [nextIndex, setNextIndex] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const transitionTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    async function fetchTypes() {
      const types = await getArtifactTypes()
      setArtifactTypes(types)
    }
    fetchTypes()
  }, [])

  useEffect(() => {
    if (artifactTypes.length <= 1) return

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches

    if (prefersReducedMotion) {
      setCurrentIndex(0)
      return
    }

    const interval = setInterval(() => {
      // Calculate next index
      const next = (currentIndex + 1) % artifactTypes.length
      setNextIndex(next)

      // Start crossfade
      setIsTransitioning(true)

      // After transition completes, update current index
      transitionTimeoutRef.current = setTimeout(() => {
        setCurrentIndex(next)
        setIsTransitioning(false)
      }, 500)
    }, 4000)

    return () => {
      clearInterval(interval)
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current)
      }
    }
  }, [artifactTypes.length, currentIndex])

  const currentType = artifactTypes[currentIndex]
  const nextType = artifactTypes[nextIndex]
  const CurrentIcon = currentType ? getDynamicLucideIcon(currentType.icon_name) : Package
  const NextIcon = nextType ? getDynamicLucideIcon(nextType.icon_name) : Package

  return (
    <div className="relative">
      {/* Current icon - fades out during transition */}
      <CurrentIcon
        aria-label="Artifacts icon"
        className={cn(
          "transition-opacity duration-500 ease-in-out",
          isTransitioning ? "opacity-0" : "opacity-100",
          className,
        )}
      />
      {/* Next icon - fades in during transition, positioned absolutely on top */}
      {isTransitioning && (
        <NextIcon
          aria-hidden="true"
          className={cn(
            "absolute inset-0 transition-opacity duration-500 ease-in-out opacity-100",
            className,
          )}
        />
      )}
    </div>
  )
}
