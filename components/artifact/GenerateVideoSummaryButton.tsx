"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Sparkles, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { fetchJson } from "@/lib/fetchJson"

interface GenerateVideoSummaryButtonProps {
  artifactId?: string
  videoUrl: string
  onSummaryGenerated?: (url: string, summary: string) => void
  currentSummary?: string
}

export function GenerateVideoSummaryButton({
  artifactId,
  videoUrl,
  onSummaryGenerated,
  currentSummary,
}: GenerateVideoSummaryButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  async function handleGenerate() {
    setIsGenerating(true)
    let attempt = 0
    const maxAttempts = 2

    try {
      while (attempt < maxAttempts) {
        attempt++
        try {
          const data = await fetchJson("/api/analyze/video-single", {
            body: { artifactId: artifactId || "temp", videoUrl },
          })

          toast({
            title: "Success",
            description: "AI video summary generated successfully",
          })

          if (onSummaryGenerated && data.summary) {
            onSummaryGenerated(videoUrl, data.summary)
          } else {
            router.refresh()
          }
          return // Success, exit
        } catch (err) {
          console.error(`[v0] Generate video summary error (attempt ${attempt}/${maxAttempts}):`, err)

          // Check if it's a timeout error on first attempt
          const isTimeout = err instanceof Error && err.message.toLowerCase().includes("timeout")

          if (isTimeout && attempt < maxAttempts) {
            console.log("[v0] Timeout on first attempt, retrying (Cloudinary cache should be warmed)...")
            toast({
              title: "Processing...",
              description: "Large video detected. Retrying in a moment...",
            })
            await new Promise(resolve => setTimeout(resolve, 2000)) // Wait 2s before retry
            continue
          }

          // Final error or non-timeout error
          throw err
        }
      }
    } catch (err) {
      console.error("[v0] Generate video summary final error:", err)
      const isTimeout = err instanceof Error && err.message.toLowerCase().includes("timeout")
      const errorMessage = isTimeout
        ? "Video processing timed out. This can happen with large videos. Please try again in a moment - it should work faster the second time."
        : err instanceof Error ? err.message : "Failed to generate video summary"

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleGenerate}
      disabled={isGenerating}
      className="gap-2 bg-transparent"
    >
      {isGenerating ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Generating...
        </>
      ) : (
        <>
          <Sparkles className="h-4 w-4" />
          {currentSummary ? "Regenerate AI Summary" : "Generate AI Summary"}
        </>
      )}
    </Button>
  )
}
