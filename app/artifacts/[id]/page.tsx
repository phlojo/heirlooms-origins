import { AppLayout } from "@/components/app-layout"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Edit, ChevronLeft, ChevronRight } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { getCurrentUser } from "@/lib/supabase/server"
import { getArtifactById, getAdjacentArtifacts } from "@/lib/actions/artifacts"
import { getDetailUrl } from "@/lib/cloudinary"
import { AudioPlayer } from "@/components/audio-player"
import ReactMarkdown from "react-markdown"
import { ArtifactAiPanelWrapper } from "@/components/artifact/ArtifactAiPanelWrapper"
import { GenerateDescriptionButton } from "@/components/artifact/GenerateDescriptionButton"
import { GenerateImageCaptionButton } from "@/components/artifact/GenerateImageCaptionButton"
import { TranscribeAudioButton } from "@/components/artifact/TranscribeAudioButton"

function isAudioFile(url: string): boolean {
  return (
    url.includes("/video/upload/") &&
    (url.includes(".webm") || url.includes(".mp3") || url.includes(".wav") || url.includes(".m4a"))
  )
}

export default async function ArtifactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()

  const { id } = await params
  const artifact = await getArtifactById(id)

  if (!artifact) {
    notFound()
  }

  const canView = artifact.collection?.is_public || (user && artifact.user_id === user.id)
  const canEdit = user && artifact.user_id === user.id

  if (!canView) {
    notFound()
  }

  const { previous, next } = await getAdjacentArtifacts(id, artifact.collection_id)

  const collectionHref = artifact.collection?.slug
    ? `/collections/${artifact.collection.slug}`
    : `/collections/${artifact.collection_id}`

  let fullDescription = artifact.description || "No description provided"

  if (artifact.ai_description) {
    fullDescription += `\n\n${artifact.ai_description}`
  }

  const imageCaptions = artifact.image_captions || {}

  const mediaUrls = artifact.media_urls || []
  const totalMedia = mediaUrls.length
  const audioFiles = mediaUrls.filter((url) => isAudioFile(url)).length
  const imageFiles = totalMedia - audioFiles

  return (
    <AppLayout user={user}>
      <div className="space-y-8">
        <div className="sticky top-16 z-30 -mx-6 bg-background px-6 pb-4 lg:-mx-8 lg:px-8 pt-2.5.5.5.5.5.5 pt-2 pt-2 pt-1 pt-0.5 pt-1.5 pt-2 pt-1.5 pt-5 pt-2 pt-2 pt-0">
          <div className="mb-4 flex items-center gap-2 mt-2 mt-2 mt-1 mt-2.5 mt-2 mt-1.5 mt-px">
            <Button variant="ghost" size="sm" asChild>
              <Link href={collectionHref}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to {artifact.collection?.title || "Uncategorized"} Collection
              </Link>
            </Button>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Button
                variant="ghost"
                size="icon"
                asChild={!!previous}
                disabled={!previous}
                className={`shrink-0 ${!previous ? "opacity-50 pointer-events-none hover:bg-transparent" : ""}`}
              >
                {previous ? (
                  <Link href={`/artifacts/${previous.id}`} title={previous.title}>
                    <ChevronLeft className="h-5 w-5" />
                  </Link>
                ) : (
                  <span>
                    <ChevronLeft className="h-5 w-5" />
                  </span>
                )}
              </Button>
              <h1 className="text-balance text-3xl font-bold tracking-tight min-w-0">{artifact.title}</h1>
              <Button
                variant="ghost"
                size="icon"
                asChild={!!next}
                disabled={!next}
                className={`shrink-0 ${!next ? "opacity-50 pointer-events-none hover:bg-transparent" : ""}`}
              >
                {next ? (
                  <Link href={`/artifacts/${next.id}`} title={next.title}>
                    <ChevronRight className="h-5 w-5" />
                  </Link>
                ) : (
                  <span>
                    <ChevronRight className="h-5 w-5" />
                  </span>
                )}
              </Button>
            </div>
            {canEdit && (
              <Button variant="outline" asChild className="shrink-0 bg-transparent">
                <Link href={`/artifacts/${id}/edit`}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Link>
              </Button>
            )}
          </div>
        </div>

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

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            {artifact.media_urls && artifact.media_urls.length > 0 ? (
              artifact.media_urls.map((url, index) =>
                isAudioFile(url) ? (
                  <div key={index} className="space-y-3">
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
                  <div key={index} className="space-y-2">
                    <div className="aspect-square overflow-hidden border bg-muted">
                      <img
                        src={getDetailUrl(url) || "/placeholder.svg"}
                        alt={`${artifact.title} - Image ${index + 1}`}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="space-y-1">
                      {imageCaptions[url] && (
                        <p className="text-sm text-muted-foreground italic leading-relaxed">{imageCaptions[url]}</p>
                      )}
                      {canEdit && <GenerateImageCaptionButton artifactId={artifact.id} imageUrl={url} />}
                    </div>
                  </div>
                ),
              )
            ) : (
              <div className="aspect-square overflow-hidden border bg-muted">
                <div className="flex h-full items-center justify-center">
                  <p className="text-sm text-muted-foreground">No media available</p>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
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
      </div>
    </AppLayout>
  )
}
