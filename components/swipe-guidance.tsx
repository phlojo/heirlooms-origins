"use client"

import { ArrowLeft, ArrowRight } from "lucide-react"

interface SwipeGuidanceProps {
  onDismiss: () => void
}

export function SwipeGuidance({ onDismiss }: SwipeGuidanceProps) {
  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-500 px-4"
      style={{
        bottom: "calc(var(--bottom-nav-height, 0px) + 24px)",
      }}
      role="status"
      aria-live="polite"
    >
      <div className="bg-foreground text-background px-5 py-3 rounded-full shadow-lg flex items-center justify-center gap-3 text-sm font-medium">
        <ArrowLeft className="h-5 w-5 flex-shrink-0" />
        <span className="text-center">Swipe </span>
        <ArrowRight className="h-5 w-5 flex-shrink-0" />
      </div>
    </div>
  )
}
