"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Sparkles, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

interface TranscribeAudioButtonPerMediaProps {
  artifactId?: string
  audioUrl: string
  onTranscriptGenerated?: (url: string, transcript: string) => void
  currentTranscript?: string
}

export function TranscribeAudioButtonPerMedia({
  artifactId,
  audioUrl,
  onTranscriptGenerated,
  currentTranscript,
}: TranscribeAudioButtonPerMediaProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const handleTranscribe = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/analyze/audio-per-media", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ artifactId: artifactId || "temp", audioUrl }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to transcribe audio")
      }

      const data = await response.json()
      if (onTranscriptGenerated && data.transcript) {
        onTranscriptGenerated(audioUrl, data.transcript)
      }

      toast({
        title: "Success",
        description: "Audio transcribed successfully",
      })

      if (!onTranscriptGenerated) {
        router.refresh()
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to transcribe audio",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      onClick={handleTranscribe}
      disabled={isLoading || !!currentTranscript}
      variant="outline"
      size="sm"
      className="gap-2 bg-transparent"
    >
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Transcribing...
        </>
      ) : currentTranscript ? (
        <>
          <Sparkles className="h-4 w-4" />
          Transcribed
        </>
      ) : (
        <>
          <Sparkles className="h-4 w-4" />
          AI Transcribe
        </>
      )}
    </Button>
  )
}
