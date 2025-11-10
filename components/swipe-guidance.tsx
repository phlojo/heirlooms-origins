"use client"

import { ArrowLeft, ArrowRight } from "lucide-react"
import { useRouter } from "next/navigation"

interface SwipeGuidanceProps {
  onDismiss: () => void
  previousUrl: string | null
  nextUrl: string | null
}

export function SwipeGuidance({ onDismiss, previousUrl, nextUrl }: SwipeGuidanceProps) {
  const router = useRouter()

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
          <ArrowLeft className="h-5 w-5 flex-shrink-0" />
        </button>
        <span className="text-center px-2">Swipe</span>
        <button
          onClick={handleNext}
          disabled={!nextUrl}
          className={`p-2 rounded-full transition-colors ${
            nextUrl ? "hover:bg-background/20 active:bg-background/30 cursor-pointer" : "opacity-30 cursor-not-allowed"
          }`}
          aria-label="Next"
        >
          <ArrowRight className="h-5 w-5 flex-shrink-0" />
        </button>
      </div>
    </div>
  )
}
