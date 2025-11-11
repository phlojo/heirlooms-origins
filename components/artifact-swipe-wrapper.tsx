"use client"

import type React from "react"
import { useState } from "react"

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
  const [showGuidance, setShowGuidance] = useState(() => {
    if (typeof window === "undefined") return false
    return !localStorage.getItem(STORAGE_KEY) && (previousUrl !== null || nextUrl !== null)
  })

  const handleDismiss = () => {
    setShowGuidance(false)
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, "true")
    }
  }

  const handleSwipeStart = () => {
    if (showGuidance) {
      handleDismiss()
    }
  }

  useSwipeNavigation({
    previousUrl: disableSwipe ? null : previousUrl,
    nextUrl: disableSwipe ? null : nextUrl,
    onNavigate: handleDismiss,
    onSwipeStart: handleSwipeStart,
  })

  return (
    <>
      {children}
      {!disableSwipe && showGuidance && (
        <SwipeGuidance onDismiss={handleDismiss} previousUrl={previousUrl} nextUrl={nextUrl} />
      )}
    </>
  )
}
