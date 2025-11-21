"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Sparkles, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { fetchJson } from "@/lib/fetchJson"

interface GenerateImageCaptionButtonProps {
  artifactId?: string
  imageUrl: string
  onCaptionGenerated?: (url: string, caption: string) => void
  currentCaption?: string
}

export function GenerateImageCaptionButton({
  artifactId,
  imageUrl,
  onCaptionGenerated,
  currentCaption,
}: GenerateImageCaptionButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  async function handleGenerate() {
    setIsGenerating(true)
    try {
      const data = await fetchJson("/api/analyze/image-single", {
        body: { artifactId: artifactId || "temp", imageUrl },
      })

      toast({
        title: "Success",
        description: "AI caption generated successfully",
      })

      if (onCaptionGenerated && data.caption) {
        onCaptionGenerated(imageUrl, data.caption)
      } else {
        router.refresh()
      }
    } catch (err) {
      console.error("[v0] Generate caption error:", err)
      const errorMessage = err instanceof Error ? err.message : "Failed to generate caption"
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
      disabled={isGenerating || !!currentCaption}
      className="gap-2 bg-transparent"
    >
      {isGenerating ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Generating...
        </>
      ) : currentCaption ? (
        <>
          <Sparkles className="h-4 w-4" />
          Caption Generated
        </>
      ) : (
        <>
          <Sparkles className="h-4 w-4" />
          Generate AI Caption
        </>
      )}
    </Button>
  )
}
