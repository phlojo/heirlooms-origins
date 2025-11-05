"use client"

import { useState } from "react"
import ReactMarkdown from "react-markdown"
import { ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

interface ArtifactAiContentProps {
  transcript?: string | null
  ai_description?: string | null
  image_captions?: Record<string, string> | null
}

export function ArtifactAiContent({ transcript, ai_description, image_captions }: ArtifactAiContentProps) {
  const [transcriptOpen, setTranscriptOpen] = useState(false)
  const captionEntries = image_captions ? Object.entries(image_captions) : []

  // Don't render anything if there's no AI content
  if (!transcript && !ai_description && captionEntries.length === 0) {
    return null
  }

  return (
    <div className="space-y-6">
      {/* AI Description */}
      {ai_description && (
        <div className="space-y-3">
          <h2 className="text-xl font-semibold">AI-Generated Summary</h2>
          <div className="prose prose-sm max-w-none rounded-2xl border bg-card p-6 shadow-md dark:prose-invert">
            <ReactMarkdown>{ai_description}</ReactMarkdown>
          </div>
        </div>
      )}

      {/* Transcript (Collapsible) */}
      {transcript && (
        <div className="space-y-3">
          <Collapsible open={transcriptOpen} onOpenChange={setTranscriptOpen}>
            <div className="rounded-2xl border bg-card p-6 shadow-md">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between p-0 hover:bg-transparent">
                  <h2 className="text-xl font-semibold">Transcript</h2>
                  {transcriptOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4">
                <div className="max-h-96 overflow-y-auto rounded-lg bg-muted/50 p-4 text-sm leading-relaxed">
                  <p className="whitespace-pre-wrap">{transcript}</p>
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        </div>
      )}

      {/* Image Captions */}
      {captionEntries.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xl font-semibold">Image Descriptions</h2>
          <div className="rounded-2xl border bg-card p-6 shadow-md">
            <ul className="space-y-3">
              {captionEntries.map(([url, caption], index) => (
                <li key={url} className="flex items-start gap-3 rounded-lg bg-muted/50 p-4 text-sm">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {index + 1}
                  </span>
                  <p className="flex-1 leading-relaxed">{caption}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
