"use client"

import ReactMarkdown from "react-markdown"

interface ArtifactAiContentProps {
  ai_description?: string | null
}

export function ArtifactAiContent({ ai_description }: ArtifactAiContentProps) {
  // Don't render anything if there's no AI description
  if (!ai_description) {
    return null
  }

  return (
    <div className="space-y-3">
      <h2 className="text-xl font-semibold">AI-Generated Summary</h2>
      <div className="prose prose-sm max-w-none rounded-2xl border bg-card p-6 shadow-md dark:prose-invert">
        <ReactMarkdown>{ai_description}</ReactMarkdown>
      </div>
    </div>
  )
}
