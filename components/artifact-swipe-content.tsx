"use client"

import { useState } from "react"
import Link from "next/link"
import { getDetailUrl } from "@/lib/cloudinary"
import { AudioPlayer } from "@/components/audio-player"
import ReactMarkdown from "react-markdown"
import { ArtifactAiPanelWrapper } from "@/components/artifact/ArtifactAiPanelWrapper"
import { GenerateDescriptionButton } from "@/components/artifact/GenerateDescriptionButton"
import { GenerateImageCaptionButton } from "@/components/artifact/GenerateImageCaptionButton"
import { TranscribeAudioButton } from "@/components/artifact/TranscribeAudioButton"
import { ArtifactStickyNav } from "@/components/artifact-sticky-nav"
import { ArtifactSwipeWrapper } from "@/components/artifact-swipe-wrapper"
import { ArtifactImageWithViewer } from "@/components/artifact-image-with-viewer"
import { Author } from "@/components/author"
import { Button } from "@/components/ui/button"
import { Edit } from "lucide-react"

interface ArtifactSwipeContentProps {
  artifact: any
  previous: any
  next: any
  currentPosition: number | null
  totalCount: number
  collectionHref: string
  canEdit: boolean
  previousUrl: string | null
  nextUrl: string | null
}

export function ArtifactSwipeContent({
  artifact,
  previous,
  next,
  currentPosition,
  totalCount,
  collectionHref,
  canEdit,
  previousUrl,
  nextUrl,
}: ArtifactSwipeContentProps) {
  const [isImageFullscreen, setIsImageFullscreen] = useState(false)
  const imageCaptions = artifact.image_captions || {}
  let fullDescription = artifact.description || "No description provided"
  if (artifact.ai_description) {
    fullDescription += `\n\n${artifact.ai_description}`
  }

  const mediaUrls = Array.from(new Set(artifact.media_urls || []))
  const totalMedia = mediaUrls.length
  const audioFiles = mediaUrls.filter((url) => isAudioFile(url)).length
  const imageFiles = totalMedia - audioFiles

  if (artifact.media_urls && artifact.media_urls.length !== mediaUrls.length) {
    console.log(
      "[v0] Duplicate URLs detected in artifact:",
      artifact.id,
      "Original count:",
      artifact.media_urls.length,
      "Unique count:",
      mediaUrls.length,
    )
  }

  return (
    <ArtifactSwipeWrapper previousUrl={previousUrl} nextUrl={nextUrl} disableSwipe={isImageFullscreen}>
      <ArtifactStickyNav
        title={artifact.title}
        backHref={collectionHref}
        backLabel={`${artifact.collection?.title || "Uncategorized"} Collection`}
        previousItem={previous}
        nextItem={next}
        editHref={`/artifacts/${artifact.id}/edit`}
        canEdit={canEdit}
        authorUserId={artifact.user_id}
        authorName={artifact.author_name}
        collectionId={artifact.collection_id}
        collectionSlug={artifact.collection?.slug}
        collectionName={artifact.collection?.title}
        currentPosition={currentPosition}
        totalCount={totalCount}
      />

      <div className={`flex items-center py-4 px-6 lg:px-8 ${canEdit ? "justify-between" : "justify-center"}`}>
        {canEdit && (
          <Button asChild className="bg-purple-600 hover:bg-purple-700 text-white">
            <Link href={`/artifacts/${artifact.id}/edit`}>
              <Edit className="mr-2 h-4 w-4" />
              Edit Artifact
            </Link>
          </Button>
        )}
        {artifact.user_id && <Author userId={artifact.user_id} authorName={artifact.author_name} size="sm" />}
      </div>

      <div className="space-y-8">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            {mediaUrls.length > 0 ? (
              mediaUrls.map((url, index) =>
                isAudioFile(url) ? (
                  <div key={url} className="space-y-3 px-6 lg:px-8">
                    <AudioPlayer src={url} title="Audio Recording" />
                    {canEdit && <TranscribeAudioButton artifactId={artifact.id} audioUrl={url} />}

                    <div className="rounded-lg border bg-muted/30 p-4">
                      <h3 className="text-sm font-semibold mb-2">Transcript</h3>
                      {artifact.transcript ? (
                        <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                          {artifact.transcript}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">
                          No transcript available yet. Click the "AI Transcribe Audio" button above to generate a
                          transcript of this audio recording.
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div key={url} className="space-y-2">
                    <ArtifactImageWithViewer
                      src={getDetailUrl(url) || "/placeholder.svg"}
                      alt={`${artifact.title} - Image ${index + 1}`}
                      setIsImageFullscreen={setIsImageFullscreen}
                    />
                    <div className="space-y-1 px-6 lg:px-8">
                      {imageCaptions[url] && (
                        <p className="text-sm text-muted-foreground italic leading-relaxed">{imageCaptions[url]}</p>
                      )}
                      {canEdit && <GenerateImageCaptionButton artifactId={artifact.id} imageUrl={url} />}
                    </div>
                  </div>
                ),
              )
            ) : (
              <div className="min-h-[400px] overflow-hidden bg-muted flex items-center justify-center">
                <p className="text-sm text-muted-foreground">No media available</p>
              </div>
            )}
          </div>

          <div className="space-y-6 px-6 lg:px-8">
            {canEdit && (
              <ArtifactAiPanelWrapper
                artifactId={artifact.id}
                analysis_status={artifact.analysis_status}
                analysis_error={artifact.analysis_error}
                transcript={artifact.transcript}
                ai_description={artifact.ai_description}
                image_captions={artifact.image_captions}
              />
            )}
          </div>
        </div>

        <div className="px-6 lg:px-8">
          <div className="space-y-6">
            <div className="text-pretty text-muted-foreground prose prose-sm max-w-none dark:prose-invert">
              <ReactMarkdown>{fullDescription}</ReactMarkdown>
            </div>
            {canEdit && (
              <div>
                <GenerateDescriptionButton artifactId={artifact.id} />
              </div>
            )}
          </div>
        </div>

        <div className="px-6 lg:px-8">
          <div className="rounded-2xl border bg-card p-6 shadow-md">
            <h2 className="text-xl font-semibold">Details</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Collection</dt>
                <dd className="font-medium">
                  <Link href={collectionHref} className="text-primary hover:underline">
                    {artifact.collection?.title || "Unknown"}
                  </Link>
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Added</dt>
                <dd className="font-medium">{new Date(artifact.created_at).toLocaleDateString()}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Total Media</dt>
                <dd className="font-medium">
                  {totalMedia} {totalMedia === 1 ? "file" : "files"}
                </dd>
              </div>
              {imageFiles > 0 && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Photos/Videos</dt>
                  <dd className="font-medium">{imageFiles}</dd>
                </div>
              )}
              {audioFiles > 0 && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Audio Recordings</dt>
                  <dd className="font-medium">{audioFiles}</dd>
                </div>
              )}
              {artifact.transcript && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Transcription</dt>
                  <dd className="font-medium text-green-600">Available</dd>
                </div>
              )}
              {artifact.ai_description && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">AI Description</dt>
                  <dd className="font-medium text-green-600">Generated</dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      </div>
    </ArtifactSwipeWrapper>
  )
}

function isAudioFile(url: string): boolean {
  return (
    url.includes("/video/upload/") &&
    (url.includes(".webm") || url.includes(".mp3") || url.includes(".wav") || url.includes(".m4a"))
  )
}
