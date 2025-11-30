"use client"

import type React from "react"
import { useState, useEffect } from "react"

import { useSwipeNavigation } from "@/hooks/use-swipe-navigation"
import { SwipeGuidance } from "@/components/swipe-guidance"

const STORAGE_KEY = "heirlooms_swipe_guidance_dismissed_artifact"

interface ArtifactSwipeWrapperProps {
  previousUrl: string | null
  nextUrl: string | null
  children: React.ReactNode
  disableSwipe?: boolean
}

export function ArtifactSwipeWrapper({ previousUrl, nextUrl, children, disableSwipe }: ArtifactSwipeWrapperProps) {
  // showIntro = true means show the full intro widget (first time user)
  // showIntro = false means show mini widget (returning user or after first swipe)
  const [showIntro, setShowIntro] = useState(false)
  const [hasMounted, setHasMounted] = useState(false)

  useEffect(() => {
    setHasMounted(true)
    // Check if user has dismissed intro before
    const hasSeenIntro = localStorage.getItem(STORAGE_KEY)
    const hasNavigation = previousUrl !== null || nextUrl !== null

    // Show intro only if never seen and there's navigation available
    setShowIntro(!hasSeenIntro && hasNavigation)
  }, [previousUrl, nextUrl])

  const handleDismissIntro = () => {
    setShowIntro(false)
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, "true")
    }
  }

  const handleSwipeStart = () => {
    if (showIntro) {
      handleDismissIntro()
    }
  }

  useSwipeNavigation({
    previousUrl: disableSwipe ? null : previousUrl,
    nextUrl: disableSwipe ? null : nextUrl,
    onNavigate: handleDismissIntro,
    onSwipeStart: handleSwipeStart,
  })

  // Check if there's any navigation available
  const hasNavigation = previousUrl !== null || nextUrl !== null

  return (
    <>
      {children}
      {/* Show widget only when not disabled and navigation exists */}
      {!disableSwipe && hasNavigation && hasMounted && (
        showIntro ? (
          // Full intro widget with animated text
          <SwipeGuidance
            onDismiss={handleDismissIntro}
            previousUrl={previousUrl}
            nextUrl={nextUrl}
          />
        ) : (
          // Mini persistent widget
          <SwipeGuidance
            onDismiss={() => {}}
            previousUrl={previousUrl}
            nextUrl={nextUrl}
            mini
          />
        )
      )}
    </>
  )
}
