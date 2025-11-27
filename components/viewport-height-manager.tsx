"use client"

import { useEffect } from "react"

/**
 * ViewportHeightManager - Sets --vh CSS variable for iOS Safari
 *
 * iOS Safari has dynamic viewport behavior where the URL bar and toolbar
 * show/hide during scroll, changing the viewport height. This causes issues
 * with 100vh layouts that can result in content being cut off.
 *
 * This component sets a CSS variable --vh based on window.innerHeight,
 * which can be used as: height: calc(var(--vh, 1vh) * 100)
 *
 * The variable updates on:
 * - Initial mount
 * - Window resize
 * - Orientation change
 *
 * Note: We use 100dvh for most layouts (which handles this automatically),
 * but --vh provides additional control for specific components that need it.
 */
export function ViewportHeightManager() {
  useEffect(() => {
    const setVH = () => {
      // Calculate 1% of viewport height
      const vh = window.innerHeight * 0.01
      // Set CSS variable on document root
      document.documentElement.style.setProperty("--vh", `${vh}px`)
    }

    // Set initially
    setVH()

    // Update on resize and orientation change
    window.addEventListener("resize", setVH)
    window.addEventListener("orientationchange", setVH)

    return () => {
      window.removeEventListener("resize", setVH)
      window.removeEventListener("orientationchange", setVH)
    }
  }, [])

  // This component doesn't render anything
  return null
}
