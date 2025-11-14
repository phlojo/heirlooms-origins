"use client"

import { useState } from "react"
import Link from "next/link"
import { getDetailUrl } from "@/lib/cloudinary"
import { AudioPlayer } from "@/components/audio-player"
import ReactMarkdown from "react-markdown"
import { ArtifactAiPanelWrapper } from "@/components/artifact/ArtifactAiPanelWrapper"
import { GenerateDescriptionButton } from "@/components/artifact/GenerateDescriptionButton"
import { GenerateImageCaptionButton } from "@/components/artifact/GenerateImageCaptionButton"
import { GenerateVideoSummaryButton } from "@/components/artifact/GenerateVideoSummaryButton"
import { TranscribeAudioButtonPerMedia } from "@/components/artifact/TranscribeAudioButtonPerMedia"
import { ArtifactStickyNav } from "@/components/artifact-sticky-nav"
import { ArtifactSwipeWrapper } from "@/components/artifact-swipe-wrapper"
import { ArtifactImageWithViewer } from "@/components/artifact-image-with-viewer"
import { Author } from "@/components/author"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible"
import { AddMediaModal } from "@/components/add-media-modal"
import { Edit, ChevronDown, Plus, Save, X, Trash2 } from 'lucide-react'
import { updateArtifact, deleteMediaFromArtifact } from "@/lib/actions/artifacts"
import { useRouter } from 'next/navigation'

interface ArtifactSwipeContentProps {
  artifact: any
  previous: any
  next: any
  currentPosition: number | null
  totalCount: number
  collectionHref: string
  canEdit: boolean
  isEditMode?: boolean
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
  isEditMode = false,
  previousUrl,
  nextUrl,
}: ArtifactSwipeContentProps) {
  const [isImageFullscreen, setIsImageFullscreen] = useState(false)
  const [isAttributesOpen, setIsAttributesOpen] = useState(false)
  const [isProvenanceOpen, setIsProvenanceOpen] = useState(false)
  const [isAddMediaOpen, setIsAddMediaOpen] = useState(false)
  
  const [editTitle, setEditTitle] = useState(artifact.title)
  const [editDescription, setEditDescription] = useState(artifact.description || "")
  const [isSaving, setIsSaving] = useState(false)
  
  const router = useRouter()
  
  const imageCaptions = artifact.image_captions || {}
  const videoSummaries = artifact.video_summaries || {}
  const audioTranscripts = artifact.audio_transcripts || {}
  
  const mediaUrls = Array.from(new Set(artifact.media_urls || []))
  
  const totalMedia = mediaUrls.length
  const audioFiles = mediaUrls.filter((url) => isAudioFile(url)).length
  const videoFiles = mediaUrls.filter((url) => isVideoFile(url)).length
  const imageFiles = totalMedia - audioFiles - videoFiles

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await updateArtifact(
        {
          id: artifact.id,
          title: editTitle,
          description: editDescription,
          media_urls: artifact.media_urls || [],
        },
        artifact.media_urls || []
      )
      router.push(`/artifacts/${artifact.id}`)
    } catch (error) {
      console.error("[v0] Failed to save artifact:", error)
      alert("Failed to save changes. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteMedia = async (urlToDelete: string) => {
    if (!confirm("Are you sure you want to delete this media item?")) return
    
    try {
      await deleteMediaFromArtifact(artifact.id, urlToDelete)
      router.refresh()
    } catch (error) {
      console.error("[v0] Failed to delete media:", error)
      alert("Failed to delete media. Please try again.")
    }
  }

  const handleMediaAdded = async (newUrls: string[]) => {
    try {
      const currentUrls = artifact.media_urls || []
      const combinedUrls = [...currentUrls, ...newUrls]
      const uniqueUrls = Array.from(new Set(combinedUrls))

      await updateArtifact(
        {
          id: artifact.id,
          title: artifact.title,
          description: artifact.description,
          media_urls: uniqueUrls,
        },
        artifact.media_urls || []
      )

      router.refresh()
    } catch (error) {
      console.error("[v0] Failed to add media:", error)
    }
  }

  return (
    <ArtifactSwipeWrapper previousUrl={previousUrl} nextUrl={nextUrl} disableSwipe={isImageFullscreen}>
      <ArtifactStickyNav
        title={isEditMode ? editTitle : artifact.title}
        backHref={collectionHref}
        backLabel={`${artifact.collection?.title || "Uncategorized"} Collection`}
        previousItem={previous}
        nextItem={next}
        editHref={`/artifacts/${artifact.id}/edit`}
        canEdit={canEdit}
        isEditMode={isEditMode}
        authorUserId={artifact.user_id}
        authorName={artifact.author_name}
        collectionId={artifact.collection_id}
        collectionSlug={artifact.collection?.slug}
        collectionName={artifact.collection?.title}
        currentPosition={currentPosition}
        totalCount={totalCount}
      />

      <div className={`flex items-center py-4 px-6 lg:px-8 ${canEdit || artifact.user_id ? "justify-between" : "justify-center"}`}>
        <div className="flex items-center gap-2">
          {canEdit && !isEditMode && (
            <Button asChild className="bg-purple-600 hover:bg-purple-700 text-white">
              <Link href={`/artifacts/${artifact.id}/edit`}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Artifact
              </Link>
            </Button>
          )}
          {isEditMode && (
            <>
              <Button 
                onClick={handleSave} 
                disabled={isSaving}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
              <Button 
                asChild
                variant="outline"
              >
                <Link href={`/artifacts/${artifact.id}`}>
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Link>
              </Button>
            </>
          )}
        </div>
        {artifact.user_id && <Author userId={artifact.user_id} authorName={artifact.author_name} size="sm" />}
      </div>

      {isEditMode && canEdit && (
        <div className="px-6 lg:px-8 mb-6">
          <ArtifactAiPanelWrapper
            artifactId={artifact.id}
            analysis_status={artifact.analysis_status}
            analysis_error={artifact.analysis_error}
            transcript={artifact.transcript}
            ai_description={artifact.ai_description}
            image_captions={artifact.image_captions}
          />
        </div>
      )}

      <div className="space-y-6 px-6 lg:px-8">
        {isEditMode && (
          <section className="space-y-2">
            <label htmlFor="title" className="text-sm font-semibold">Title</label>
            <Input
              id="title"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="Enter artifact title"
              className="text-lg font-semibold"
            />
          </section>
        )}

        {/* Description Section */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Description</h2>
          {isEditMode ? (
            <Textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              placeholder="Enter artifact description"
              className="min-h-[120px] text-sm"
            />
          ) : (
            <div className="text-pretty text-muted-foreground prose prose-sm max-w-none dark:prose-invert">
              <ReactMarkdown>
                {artifact.description || "No description provided"}
              </ReactMarkdown>
              {artifact.ai_description && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-xs font-semibold text-purple-600 mb-2">AI-Enhanced Description</p>
                  <ReactMarkdown>{artifact.ai_description}</ReactMarkdown>
                </div>
              )}
            </div>
          )}
          {isEditMode && (
            <div>
              <GenerateDescriptionButton artifactId={artifact.id} />
            </div>
          )}
        </section>

        {/* Attributes Section */}
        <section>
          <Collapsible open={isAttributesOpen} onOpenChange={setIsAttributesOpen}>
            <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border bg-card p-4 hover:bg-accent transition-colors">
              <h2 className="text-xl font-semibold">Attributes</h2>
              <ChevronDown className={`h-5 w-5 transition-transform ${isAttributesOpen ? 'rotate-180' : ''}`} />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2 rounded-lg border bg-card p-4">
                <p className="text-sm text-muted-foreground italic">
                  No attributes added yet. Future updates will include fields for make, model, year, measurements, materials, and condition.
                </p>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </section>
      </div>

      {/* Media Items Section */}
      <section className="space-y-6 my-6">
        <div className="flex items-center justify-between px-6 lg:px-8">
          <h2 className="text-xl font-semibold">Media Items</h2>
          {isEditMode && canEdit && (
            <Button
              onClick={() => setIsAddMediaOpen(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white"
              size="sm"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Media
            </Button>
          )}
        </div>
        
        {mediaUrls.length > 0 ? (
          <div className="space-y-6">
            {mediaUrls.map((url, index) => {
              if (isAudioFile(url)) {
                const transcript = audioTranscripts[url]
                return (
                  <div key={url} className="space-y-3 px-6 lg:px-8">
                    <div className="rounded-lg border bg-card p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold">Audio Recording {audioFiles > 1 ? `${index + 1}` : ''}</h3>
                        {isEditMode && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteMedia(url)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <AudioPlayer src={url} title="Audio Recording" />
                      
                      {isEditMode && (
                        <div className="mt-3">
                          <TranscribeAudioButtonPerMedia artifactId={artifact.id} audioUrl={url} />
                        </div>
                      )}

                      {transcript && (
                        <div className="rounded-lg border bg-muted/30 p-4 mt-3">
                          <h4 className="text-sm font-semibold mb-2">Transcript</h4>
                          <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                            {transcript}
                          </div>
                        </div>
                      )}
                      {!transcript && isEditMode && (
                        <div className="rounded-lg border bg-muted/30 p-4 mt-3">
                          <h4 className="text-sm font-semibold mb-2">Transcript</h4>
                          <p className="text-sm text-muted-foreground italic">
                            No transcript available yet. Click "AI Transcribe" above to generate one.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )
              } else if (isVideoFile(url)) {
                const summary = videoSummaries[url]
                return (
                  <div key={url} className="space-y-3">
                    <div className="flex items-center justify-between px-6 lg:px-8">
                      <h3 className="text-sm font-semibold">Video {videoFiles > 1 ? `${index + 1}` : ''}</h3>
                      {isEditMode && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteMedia(url)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <video 
                      src={url} 
                      controls 
                      className="w-full"
                      style={{ maxHeight: '70vh' }}
                    >
                      Your browser does not support the video tag.
                    </video>
                    <div className="px-6 lg:px-8 space-y-3">
                      {summary && (
                        <div className="rounded-lg border bg-muted/30 p-3">
                          <h4 className="text-xs font-semibold mb-1 text-purple-600">AI Summary</h4>
                          <p className="text-sm text-foreground leading-relaxed">{summary}</p>
                        </div>
                      )}
                      {isEditMode && <GenerateVideoSummaryButton artifactId={artifact.id} videoUrl={url} />}
                    </div>
                  </div>
                )
              } else {
                const caption = imageCaptions[url]
                return (
                  <div key={url} className="space-y-3">
                    <div className="flex items-center justify-between px-6 lg:px-8">
                      <h3 className="text-sm font-semibold">Photo {imageFiles > 1 ? `${index + 1}` : ''}</h3>
                      {isEditMode && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteMedia(url)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <ArtifactImageWithViewer
                      src={getDetailUrl(url) || "/placeholder.svg"}
                      alt={`${artifact.title} - Image ${index + 1}`}
                      setIsImageFullscreen={setIsImageFullscreen}
                    />
                    <div className="px-6 lg:px-8 space-y-3">
                      {caption && (
                        <div className="rounded-lg border bg-muted/30 p-3">
                          <h4 className="text-xs font-semibold mb-1 text-purple-600">AI Caption</h4>
                          <p className="text-sm text-foreground leading-relaxed">{caption}</p>
                        </div>
                      )}
                      {isEditMode && <GenerateImageCaptionButton artifactId={artifact.id} imageUrl={url} />}
                    </div>
                  </div>
                )
              }
            })}
          </div>
        ) : (
          <div className="min-h-[200px] rounded-lg border bg-muted/30 flex items-center justify-center mx-6 lg:mx-8">
            <p className="text-sm text-muted-foreground">No media available</p>
          </div>
        )}
      </section>

      {/* Provenance Section */}
      <div className="px-6 lg:px-8">
        <section className="pb-8">
          <Collapsible open={isProvenanceOpen} onOpenChange={setIsProvenanceOpen}>
            <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border bg-card p-4 hover:bg-accent transition-colors">
              <h2 className="text-xl font-semibold">Provenance</h2>
              <ChevronDown className={`h-5 w-5 transition-transform ${isProvenanceOpen ? 'rotate-180' : ''}`} />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2 rounded-lg border bg-card p-4">
                <dl className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Collection</dt>
                    <dd className="font-medium">
                      <Link href={collectionHref} className="text-primary hover:underline">
                        {artifact.collection?.title || "Unknown"}
                      </Link>
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Created</dt>
                    <dd className="font-medium">{new Date(artifact.created_at).toLocaleDateString()}</dd>
                  </div>
                  {artifact.updated_at && artifact.updated_at !== artifact.created_at && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Last Modified</dt>
                      <dd className="font-medium">{new Date(artifact.updated_at).toLocaleDateString()}</dd>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Total Media Items</dt>
                    <dd className="font-medium">
                      {totalMedia} {totalMedia === 1 ? "file" : "files"}
                    </dd>
                  </div>
                  {imageFiles > 0 && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Photos</dt>
                      <dd className="font-medium">{imageFiles}</dd>
                    </div>
                  )}
                  {videoFiles > 0 && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Videos</dt>
                      <dd className="font-medium">{videoFiles}</dd>
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
                      <dt className="text-muted-foreground">AI Transcription</dt>
                      <dd className="font-medium text-green-600">Available</dd>
                    </div>
                  )}
                  {artifact.ai_description && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">AI Description</dt>
                      <dd className="font-medium text-green-600">Generated</dd>
                    </div>
                  )}
                  {imageCaptions && Object.keys(imageCaptions).length > 0 && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">AI Image Captions</dt>
                      <dd className="font-medium text-green-600">{Object.keys(imageCaptions).length}</dd>
                    </div>
                  )}
                </dl>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </section>
      </div>

      {isEditMode && canEdit && (
        <AddMediaModal
          open={isAddMediaOpen}
          onOpenChange={setIsAddMediaOpen}
          artifactId={artifact.id}
          userId={artifact.user_id}
          onMediaAdded={handleMediaAdded}
        />
      )}
    </ArtifactSwipeWrapper>
  )
}

function isAudioFile(url: string): boolean {
  return (
    url.includes("/video/upload/") &&
    (url.includes(".webm") || url.includes(".mp3") || url.includes(".wav") || url.includes(".m4a"))
  )
}

function isVideoFile(url: string): boolean {
  const lower = url.toLowerCase()
  return (
    url.includes("/video/upload/") &&
    (lower.includes(".mp4") || lower.includes(".mov") || lower.includes(".avi")) &&
    !isAudioFile(url)
  )
}
