"use client"

import { useRouter } from "next/navigation"
import { useEffect, useRef } from "react"

interface SwipeNavigationOptions {
  previousUrl?: string | null
  nextUrl?: string | null
  disabled?: boolean
  onNavigate?: () => void
  onSwipeStart?: () => void
}

/**
 * Custom hook to enable swipe gestures for navigation
 * Swipe left → navigate to next item
 * Swipe right → navigate to previous item
 */
export function useSwipeNavigation({
  previousUrl,
  nextUrl,
  disabled = false,
  onNavigate,
  onSwipeStart,
}: SwipeNavigationOptions) {
  const router = useRouter()
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)
  const swipeStarted = useRef(false)

  useEffect(() => {
    if (disabled) return

    const handleTouchStart = (e: TouchEvent) => {
      // Ignore swipes that start within the Flickity gallery
      const target = e.target as HTMLElement
      if (target.closest('.artifact-media-gallery, .flickity-enabled')) {
        touchStartX.current = null
        touchStartY.current = null
        return
      }

      touchStartX.current = e.touches[0].clientX
      touchStartY.current = e.touches[0].clientY
      swipeStarted.current = false
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!swipeStarted.current && touchStartX.current !== null && touchStartY.current !== null) {
        const touchCurrentX = e.touches[0].clientX
        const touchCurrentY = e.touches[0].clientY
        const deltaX = Math.abs(touchCurrentX - touchStartX.current)
        const deltaY = Math.abs(touchCurrentY - touchStartY.current)

        // If user moves more than 10px horizontally, consider it a swipe start
        if (deltaX > 10 && deltaX > deltaY) {
          swipeStarted.current = true
          onSwipeStart?.()
        }
      }
    }

    const handleTouchEnd = (e: TouchEvent) => {
      if (touchStartX.current === null || touchStartY.current === null) return

      const touchEndX = e.changedTouches[0].clientX
      const touchEndY = e.changedTouches[0].clientY

      const deltaX = touchEndX - touchStartX.current
      const deltaY = touchEndY - touchStartY.current

      // Only trigger if horizontal swipe is dominant (not vertical scroll)
      const isHorizontalSwipe = Math.abs(deltaX) > Math.abs(deltaY)
      const meetsThreshold = Math.abs(deltaX) > 75 // 75px threshold

      if (isHorizontalSwipe && meetsThreshold) {
        if (deltaX > 0 && previousUrl) {
          // Swipe right → go to previous
          onNavigate?.()
          router.push(previousUrl)
        } else if (deltaX < 0 && nextUrl) {
          // Swipe left → go to next
          onNavigate?.()
          router.push(nextUrl)
        }
      }

      // Reset
      touchStartX.current = null
      touchStartY.current = null
      swipeStarted.current = false
    }

    document.addEventListener("touchstart", handleTouchStart, { passive: true })
    document.addEventListener("touchmove", handleTouchMove, { passive: true })
    document.addEventListener("touchend", handleTouchEnd, { passive: true })

    return () => {
      document.removeEventListener("touchstart", handleTouchStart)
      document.removeEventListener("touchmove", handleTouchMove)
      document.removeEventListener("touchend", handleTouchEnd)
    }
  }, [previousUrl, nextUrl, disabled, router, onNavigate, onSwipeStart])
}
