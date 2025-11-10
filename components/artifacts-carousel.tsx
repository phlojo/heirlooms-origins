"use client"

import { useRef, useState, useEffect } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ArtifactCard } from "@/components/artifact-card"

interface Artifact {
  id: string
  title: string
  description: string | null
  media_urls: string[]
  collection_id: string
  user_id: string
  created_at: string
}

interface ArtifactsCarouselProps {
  artifacts: Artifact[]
  canEdit: boolean
}

export function ArtifactsCarousel({ artifacts, canEdit }: ArtifactsCarouselProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const checkScrollability = () => {
    if (!scrollContainerRef.current) return

    const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current
    setCanScrollLeft(scrollLeft > 0)
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10) // 10px threshold
  }

  useEffect(() => {
    checkScrollability()
    const container = scrollContainerRef.current
    if (container) {
      container.addEventListener("scroll", checkScrollability)
      window.addEventListener("resize", checkScrollability)
      return () => {
        container.removeEventListener("scroll", checkScrollability)
        window.removeEventListener("resize", checkScrollability)
      }
    }
  }, [artifacts])

  const scroll = (direction: "left" | "right") => {
    if (!scrollContainerRef.current) return

    const isMobile = window.innerWidth < 1024
    const scrollAmount = isMobile ? scrollContainerRef.current.clientWidth * 0.75 : 340
    const newScrollLeft = scrollContainerRef.current.scrollLeft + (direction === "left" ? -scrollAmount : scrollAmount)

    scrollContainerRef.current.scrollTo({
      left: newScrollLeft,
      behavior: "smooth",
    })
  }

  if (artifacts.length === 0) {
    return (
      <div className="mx-6 rounded-lg border border-dashed p-12 text-center lg:mx-8">
        <p className="text-sm text-muted-foreground">No artifacts in this collection yet.</p>
        {canEdit && (
          <p className="mt-2 text-xs text-muted-foreground">Click "Add Artifact" above to add your first item.</p>
        )}
      </div>
    )
  }

  return (
    <div className="relative w-full overflow-hidden">
      {/* Left Navigation Button */}
      {canScrollLeft && (
        <Button
          variant="outline"
          size="icon"
          className="absolute left-2 top-1/2 z-10 h-10 w-10 -translate-y-1/2 rounded-full bg-background shadow-lg hover:bg-accent lg:left-4"
          onClick={() => scroll("left")}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <ChevronLeft className="h-5 w-5" />
          <span className="sr-only">Scroll left</span>
        </Button>
      )}

      {/* Right Navigation Button */}
      {canScrollRight && (
        <Button
          variant="outline"
          size="icon"
          className="absolute right-2 top-1/2 z-10 h-10 w-10 -translate-y-1/2 rounded-full bg-background shadow-lg hover:bg-accent lg:right-4"
          onClick={() => scroll("right")}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <ChevronRight className="h-5 w-5" />
          <span className="sr-only">Scroll right</span>
        </Button>
      )}

      <div
        ref={scrollContainerRef}
        className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-thin lg:gap-6"
        style={{
          scrollbarWidth: "thin",
          overscrollBehaviorX: "contain",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {artifacts.map((artifact, index) => (
          <div
            key={artifact.id}
            className={`flex-none w-[75vw] snap-start lg:w-80 ${
              index === 0 ? "pl-6 lg:pl-8" : ""
            } ${index === artifacts.length - 1 ? "pr-6 lg:pr-8" : ""}`}
          >
            <ArtifactCard artifact={artifact} />
          </div>
        ))}
      </div>
    </div>
  )
}
