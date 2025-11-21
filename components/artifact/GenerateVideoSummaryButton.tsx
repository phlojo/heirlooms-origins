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
    } catch (err) {
      console.error("[v0] Generate video summary error:", err)
      const errorMessage = err instanceof Error ? err.message : "Failed to generate video summary"
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
      disabled={isGenerating || !!currentSummary}
      className="gap-2 bg-transparent"
    >
      {isGenerating ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Generating...
        </>
      ) : currentSummary ? (
        <>
          <Sparkles className="h-4 w-4" />
          Summary Generated
        </>
      ) : (
        <>
          <Sparkles className="h-4 w-4" />
          Generate AI Summary
        </>
      )}
    </Button>
  )
}
