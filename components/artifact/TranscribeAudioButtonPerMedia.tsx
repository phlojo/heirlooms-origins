"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Sparkles, Loader2 } from 'lucide-react'
import { useToast } from "@/hooks/use-toast"
import { useRouter } from 'next/navigation'

interface TranscribeAudioButtonPerMediaProps {
  artifactId: string
  audioUrl: string
}

export function TranscribeAudioButtonPerMedia({ artifactId, audioUrl }: TranscribeAudioButtonPerMediaProps) {
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
        body: JSON.stringify({ artifactId, audioUrl }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to transcribe audio")
      }

      toast({
        title: "Success",
        description: "Audio transcribed successfully",
      })

      router.refresh()
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
      disabled={isLoading}
      variant="outline"
      size="sm"
      className="gap-2 bg-transparent"
    >
      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
      {isLoading ? "Transcribing..." : "AI Transcribe"}
    </Button>
  )
}
