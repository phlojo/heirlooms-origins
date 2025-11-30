"use client"

import { useState, useEffect } from "react"
import { StepBack, StepForward } from "lucide-react"
import { useRouter } from "next/navigation"

const CYCLE_WORDS = ["Swipe", "to Navigate", "Artifacts"]
const CYCLE_INTERVAL = 2500

interface SwipeGuidanceProps {
  onDismiss: () => void
  previousUrl: string | null
  nextUrl: string | null
  /** Mini mode: smaller, no text, semi-transparent - always visible after intro */
  mini?: boolean
}

export function SwipeGuidance({ onDismiss, previousUrl, nextUrl, mini = false }: SwipeGuidanceProps) {
  const router = useRouter()
  const [wordIndex, setWordIndex] = useState(0)
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    // Only run text animation in intro mode
    if (mini) return

    const interval = setInterval(() => {
      // Fade out
      setIsVisible(false)
      // After fade out, change word and fade in
      setTimeout(() => {
        setWordIndex((prev) => (prev + 1) % CYCLE_WORDS.length)
        setIsVisible(true)
      }, 400)
    }, CYCLE_INTERVAL)
    return () => clearInterval(interval)
  }, [mini])

  const handlePrevious = () => {
    if (previousUrl) {
      router.push(previousUrl)
    }
  }

  const handleNext = () => {
    if (nextUrl) {
      router.push(nextUrl)
    }
  }

  // Mini mode: smaller, no text, semi-transparent black with white/gray icons
  if (mini) {
    return (
      <div
        className="fixed left-1/2 -translate-x-1/2 z-50 px-4"
        style={{
          bottom: "calc(var(--bottom-nav-height, 0px) + 16px)",
        }}
        role="navigation"
        aria-label="Navigate between artifacts"
      >
        <div className="bg-black/50 backdrop-blur-sm px-2 py-1 rounded-full shadow-md flex items-center justify-center gap-1">
          <button
            onClick={handlePrevious}
            disabled={!previousUrl}
            className={`p-1.5 rounded-full transition-colors ${
              previousUrl
                ? "text-white/80 hover:text-white hover:bg-white/20 active:bg-white/30 cursor-pointer"
                : "text-white/30 cursor-not-allowed"
            }`}
            aria-label="Previous artifact"
          >
            <StepBack className="h-3.5 w-3.5 flex-shrink-0" />
          </button>
          <button
            onClick={handleNext}
            disabled={!nextUrl}
            className={`p-1.5 rounded-full transition-colors ${
              nextUrl
                ? "text-white/80 hover:text-white hover:bg-white/20 active:bg-white/30 cursor-pointer"
                : "text-white/30 cursor-not-allowed"
            }`}
            aria-label="Next artifact"
          >
            <StepForward className="h-3.5 w-3.5 flex-shrink-0" />
          </button>
        </div>
      </div>
    )
  }

  // Intro mode: full size with animated text
  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-500 px-4"
      style={{
        bottom: "calc(var(--bottom-nav-height, 0px) + 24px)",
      }}
      role="navigation"
      aria-live="polite"
    >
      <div className="bg-foreground text-background px-3 py-2 rounded-full shadow-lg flex items-center justify-center gap-2 text-sm font-medium">
        <button
          onClick={handlePrevious}
          disabled={!previousUrl}
          className={`p-2 rounded-full transition-colors ${
            previousUrl
              ? "hover:bg-background/20 active:bg-background/30 cursor-pointer"
              : "opacity-30 cursor-not-allowed"
          }`}
          aria-label="Previous"
        >
          <StepBack className="h-5 w-5 flex-shrink-0" />
        </button>
        <span
          className={`text-center w-24 transition-opacity duration-400 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
        >
          {CYCLE_WORDS[wordIndex]}
        </span>
        <button
          onClick={handleNext}
          disabled={!nextUrl}
          className={`p-2 rounded-full transition-colors ${
            nextUrl ? "hover:bg-background/20 active:bg-background/30 cursor-pointer" : "opacity-30 cursor-not-allowed"
          }`}
          aria-label="Next"
        >
          <StepForward className="h-5 w-5 flex-shrink-0" />
        </button>
      </div>
    </div>
  )
}
