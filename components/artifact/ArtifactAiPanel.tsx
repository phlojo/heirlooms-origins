"use client"

import { useState } from "react"
import ReactMarkdown from "react-markdown"
import { Loader2, Mic, ImageIcon, FileText, PlayCircle, RefreshCw, ChevronDown, ChevronUp } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { useToast } from "@/hooks/use-toast"
import { fetchJson } from "@/lib/fetchJson"

interface ArtifactAiPanelProps {
  artifactId: string
  analysis_status?: string
  analysis_error?: string | null
  transcript?: string | null
  ai_description?: string | null
  image_captions?: Record<string, string> | null
  onRefresh: () => Promise<void>
}

type LoadingState = "audio" | "images" | "summary" | "run-all" | null

export function ArtifactAiPanel({
  artifactId,
  analysis_status,
  analysis_error,
  transcript,
  ai_description,
  image_captions,
  onRefresh,
}: ArtifactAiPanelProps) {
  const [loading, setLoading] = useState<LoadingState>(null)
  const [transcriptOpen, setTranscriptOpen] = useState(true)
  const [descriptionOpen, setDescriptionOpen] = useState(true)
  const [captionsOpen, setCaptionsOpen] = useState(true)
  const { toast } = useToast()

  const handleAnalysis = async (endpoint: string, loadingKey: LoadingState, successMessage: string) => {
    setLoading(loadingKey)
    try {
      await fetchJson(endpoint, {
        body: { artifactId },
      })
      toast({
        title: "Success",
        description: successMessage,
      })
      await onRefresh()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Analysis failed",
        variant: "destructive",
      })
    } finally {
      setLoading(null)
    }
  }

  const getStatusVariant = (status?: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "done":
        return "default"
      case "processing":
      case "queued":
        return "secondary"
      case "error":
        return "destructive"
      default:
        return "outline"
    }
  }

  const captionEntries = image_captions ? Object.entries(image_captions) : []

  return (
    <div className="space-y-6 rounded-2xl border bg-card p-6 shadow-md">
      {/* Header with Status Badge */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">AI Analysis</h2>
        {analysis_status && <Badge variant={getStatusVariant(analysis_status)}>{analysis_status}</Badge>}
      </div>

      {/* Error Display */}
      {analysis_error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          <p className="font-medium">Analysis Error:</p>
          <p className="mt-1">{analysis_error}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() => handleAnalysis("/api/analyze/audio", "audio", "Audio transcription complete")}
          disabled={loading !== null}
          variant="outline"
          size="sm"
        >
          {loading === "audio" ? <Loader2 className="animate-spin" /> : <Mic />}
          Transcribe Audio
        </Button>

        <Button
          onClick={() => handleAnalysis("/api/analyze/images", "images", "Image captions generated")}
          disabled={loading !== null}
          variant="outline"
          size="sm"
        >
          {loading === "images" ? <Loader2 className="animate-spin" /> : <ImageIcon />}
          Caption Photos
        </Button>

        <Button
          onClick={() => handleAnalysis("/api/analyze/summary", "summary", "Description generated")}
          disabled={loading !== null}
          variant="outline"
          size="sm"
        >
          {loading === "summary" ? <Loader2 className="animate-spin" /> : <FileText />}
          Generate Description
        </Button>

        <Button
          onClick={() => handleAnalysis("/api/analyze/run-all", "run-all", "Full analysis complete")}
          disabled={loading !== null}
          variant="default"
          size="sm"
        >
          {loading === "run-all" ? <Loader2 className="animate-spin" /> : <PlayCircle />}
          Run All
        </Button>
      </div>

      {/* AI Description */}
      {ai_description && (
        <Collapsible open={descriptionOpen} onOpenChange={setDescriptionOpen}>
          <div className="flex items-center justify-between">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="flex-1 justify-between p-0">
                <h3 className="font-medium">AI Description</h3>
                {descriptionOpen ? <ChevronUp /> : <ChevronDown />}
              </Button>
            </CollapsibleTrigger>
            <Button
              onClick={() => handleAnalysis("/api/analyze/summary", "summary", "Description regenerated")}
              disabled={loading !== null}
              variant="ghost"
              size="sm"
              className="ml-2"
            >
              {loading === "summary" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </Button>
          </div>
          <CollapsibleContent className="mt-2">
            <div className="prose prose-sm max-w-none rounded-lg bg-muted/50 p-4 dark:prose-invert">
              <ReactMarkdown>{ai_description}</ReactMarkdown>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Transcript (Collapsible) */}
      {transcript && (
        <Collapsible open={transcriptOpen} onOpenChange={setTranscriptOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-0">
              <h3 className="font-medium">Transcript</h3>
              {transcriptOpen ? <ChevronUp /> : <ChevronDown />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
            <div className="max-h-64 overflow-y-auto rounded-lg bg-muted/50 p-4 text-sm">
              <p className="whitespace-pre-wrap">{transcript}</p>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Image Captions */}
      {captionEntries.length > 0 && (
        <Collapsible open={captionsOpen} onOpenChange={setCaptionsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-0">
              <h3 className="font-medium">Image Captions</h3>
              {captionsOpen ? <ChevronUp /> : <ChevronDown />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
            <ul className="space-y-2">
              {captionEntries.map(([url, caption], index) => (
                <li key={url} className="flex items-start gap-3 rounded-lg bg-muted/50 p-3 text-sm">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                    {index + 1}
                  </span>
                  <p className="flex-1">{caption}</p>
                </li>
              ))}
            </ul>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  )
}
