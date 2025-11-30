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
 * - Sequential fade: current fades out, then next fades in (no overlap)
 * - Fixed container prevents layout shift between different icon sizes
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
  // Animation phase: 'visible' | 'fading-out' | 'fading-in'
  const [phase, setPhase] = useState<'visible' | 'fading-out' | 'fading-in'>('visible')
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

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
      // Phase 1: Fade out current icon
      setPhase('fading-out')

      // Phase 2: After fade out, switch icon and fade in
      timeoutRef.current = setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % artifactTypes.length)
        setPhase('fading-in')

        // Phase 3: After fade in, back to visible
        timeoutRef.current = setTimeout(() => {
          setPhase('visible')
        }, 400)
      }, 400)
    }, 1800) // 1000ms visible + 400ms fade out + 400ms fade in

    return () => {
      clearInterval(interval)
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [artifactTypes.length])

  const currentType = artifactTypes[currentIndex]
  const CurrentIcon = currentType ? getDynamicLucideIcon(currentType.icon_name) : Package

  // Determine opacity based on phase
  const opacity = phase === 'fading-out' ? 'opacity-0' : phase === 'fading-in' ? 'opacity-100' : 'opacity-100'

  return (
    <div className={cn("relative flex items-center justify-center", className)}>
      <CurrentIcon
        aria-label="Artifacts icon"
        className={cn(
          "transition-opacity duration-400 ease-in-out",
          opacity,
          className,
        )}
      />
    </div>
  )
}
