import { AppLayout } from "@/components/app-layout"
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
import { StickyNav } from "@/components/sticky-nav"
import { ArtifactSwipeWrapper } from "@/components/artifact-swipe-wrapper"

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

  const previousUrl = previous ? `/artifacts/${previous.id}` : null
  const nextUrl = next ? `/artifacts/${next.id}` : null

  return (
    <AppLayout user={user}>
      <ArtifactSwipeWrapper previousUrl={previousUrl} nextUrl={nextUrl}>
        <StickyNav
          title={artifact.title}
          backHref={collectionHref}
          backLabel={`${artifact.collection?.title || "Uncategorized"} Collection`}
          previousItem={previous}
          nextItem={next}
          editHref={`/artifacts/${id}/edit`}
          canEdit={canEdit}
          itemType="artifact"
          authorUserId={artifact.user_id}
          authorName={artifact.author_name}
        />

        <div className="space-y-8">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-4">
              {artifact.media_urls && artifact.media_urls.length > 0 ? (
                artifact.media_urls.map((url, index) =>
                  isAudioFile(url) ? (
                    <div key={index} className="space-y-3 px-6 lg:px-8">
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
                      <div className="aspect-square overflow-hidden bg-muted -mx-6 lg:-mx-8">
                        <img
                          src={getDetailUrl(url) || "/placeholder.svg"}
                          alt={`${artifact.title} - Image ${index + 1}`}
                          className="h-full w-full object-cover"
                        />
                      </div>
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
                <div className="aspect-square overflow-hidden bg-muted">
                  <div className="flex h-full items-center justify-center">
                    <p className="text-sm text-muted-foreground">No media available</p>
                  </div>
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
    </AppLayout>
  )
}
