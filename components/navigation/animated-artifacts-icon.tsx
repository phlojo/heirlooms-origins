"use client"

import { useEffect, useState } from "react"
import { artifactIconCycle, getArtifactTypeIcon } from "@/config/artifact-types"
import { cn } from "@/lib/utils"

interface AnimatedArtifactsIconProps {
  className?: string
}

/**
 * AnimatedArtifactsIcon - Cycles through artifact type icons
 * 
 * Smoothly animates between different artifact type icons to showcase
 * the variety of artifacts that can be collected in Heirlooms.
 * 
 * Animation:
 * - Changes icon every 4 seconds
 * - Uses opacity cross-fade for smooth transition
 * - Respects prefers-reduced-motion
 * - Continues animating even when tab is active
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
export function AnimatedArtifactsIcon({ 
  className
}: AnimatedArtifactsIconProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)

  useEffect(() => {
    // Respect user's motion preferences
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    
    if (prefersReducedMotion) {
      // If reduced motion is preferred, just show the general icon
      setCurrentIndex(0)
      return
    }

    // Change icon every 4 seconds
    const interval = setInterval(() => {
      setIsTransitioning(true)
      
      // After fade out, change icon
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % artifactIconCycle.length)
        setIsTransitioning(false)
      }, 200) // Half of transition duration
    }, 4000)

    return () => clearInterval(interval)
  }, [])

  const currentType = artifactIconCycle[currentIndex]
  const IconComponent = getArtifactTypeIcon(currentType)

  return (
    <div className="relative" aria-label="Artifacts icon">
      <IconComponent
        className={cn(
          "transition-opacity duration-[400ms] ease-in-out",
          isTransitioning ? "opacity-0" : "opacity-100",
          className,
        )}
      />
    </div>
  )
}
