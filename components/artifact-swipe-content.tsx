"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { getDetailUrl } from "@/lib/cloudinary"
import { AudioPlayer } from "@/components/audio-player"
import ReactMarkdown from "react-markdown"
import { ArtifactStickyNav } from "@/components/artifact-sticky-nav"
import { ArtifactSwipeWrapper } from "@/components/artifact-swipe-wrapper"
import { ArtifactImageWithViewer } from "@/components/artifact-image-with-viewer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible"
import { AddMediaModal } from "@/components/add-media-modal"
import { ChevronDown, Plus, Save, X, Trash2, Loader2, Pencil, Share2, BarChart3, MessageSquare } from 'lucide-react'
import { updateArtifact, deleteMediaFromArtifact, deleteArtifact } from "@/lib/actions/artifacts"
import { useRouter } from 'next/navigation'
import { GenerateImageCaptionButton } from "@/components/artifact/GenerateImageCaptionButton"
import { GenerateVideoSummaryButton } from "@/components/artifact/GenerateVideoSummaryButton"
import { TranscribeAudioButtonPerMedia } from "@/components/artifact/TranscribeAudioButtonPerMedia"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

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
  const [originalState] = useState({
    title: artifact.title,
    description: artifact.description || "",
    media_urls: artifact.media_urls || [],
    image_captions: artifact.image_captions || {},
    audio_transcripts: artifact.audio_transcripts || {},
  })
  
  const [isImageFullscreen, setIsImageFullscreen] = useState(false)
  const [isAttributesOpen, setIsAttributesOpen] = useState(false)
  const [isProvenanceOpen, setIsProvenanceOpen] = useState(false)
  const [isAddMediaOpen, setIsAddMediaOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [comingSoonOpen, setComingSoonOpen] = useState(false)
  const [comingSoonFeature, setComingSoonFeature] = useState("")
  
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  
  const [editingCaption, setEditingCaption] = useState<string | null>(null)
  const [editCaptionText, setEditCaptionText] = useState<string>("")
  const [isSavingCaption, setIsSavingCaption] = useState(false)
  
  const [editTitle, setEditTitle] = useState(artifact.title)
  const [editDescription, setEditDescription] = useState(artifact.description || "")
  const [editMediaUrls, setEditMediaUrls] = useState<string[]>(artifact.media_urls || [])
  const [editImageCaptions, setEditImageCaptions] = useState<Record<string, string>>(artifact.image_captions || {})
  
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  
  const router = useRouter()
  
  const imageCaptions = isEditMode ? editImageCaptions : (artifact.image_captions || {})
  const audioTranscripts = artifact.audio_transcripts || {}
  const mediaUrls = isEditMode ? Array.from(new Set(editMediaUrls)) : Array.from(new Set(artifact.media_urls || []))
  
  const hasUnsavedChanges = isEditMode && (
    editTitle !== originalState.title ||
    editDescription !== originalState.description ||
    JSON.stringify(editMediaUrls) !== JSON.stringify(originalState.media_urls) ||
    JSON.stringify(editImageCaptions) !== JSON.stringify(originalState.image_captions)
  )

  useEffect(() => {
    if (!isEditMode || !hasUnsavedChanges) return

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isEditMode, hasUnsavedChanges])
  
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
          media_urls: editMediaUrls,
          image_captions: editImageCaptions,
        },
        originalState.media_urls
      )
      router.push(`/artifacts/${artifact.slug}`)
      router.refresh()
    } catch (error) {
      console.error("[v0] Failed to save artifact:", error)
      alert("Failed to save changes. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteMedia = async (urlToDelete: string) => {
    if (!confirm("Are you sure you want to delete this media item?")) return
    
    if (isEditMode) {
      // Remove from local state
      setEditMediaUrls(prev => prev.filter(url => url !== urlToDelete))
      // Remove caption if exists
      setEditImageCaptions(prev => {
        const updated = { ...prev }
        delete updated[urlToDelete]
        return updated
      })
    } else {
      // Immediate delete in view mode (shouldn't happen but kept for safety)
      try {
        await deleteMediaFromArtifact(artifact.id, urlToDelete)
        router.refresh()
      } catch (error) {
        console.error("[v0] Failed to delete media:", error)
        alert("Failed to delete media. Please try again.")
      }
    }
  }

  const handleDeleteArtifact = async () => {
    setIsDeleting(true)
    try {
      const result = await deleteArtifact(artifact.id)
      if (result.success) {
        router.push(collectionHref)
        router.refresh()
      } else {
        alert(result.error || "Failed to delete artifact")
        setIsDeleting(false)
        setDeleteDialogOpen(false)
      }
    } catch (error) {
      console.error("[v0] Failed to delete artifact:", error)
      alert("Failed to delete artifact. Please try again.")
      setIsDeleting(false)
      setDeleteDialogOpen(false)
    }
  }

  const handleMediaAdded = async (newUrls: string[]) => {
    if (isEditMode) {
      // Add to local state
      const combinedUrls = [...editMediaUrls, ...newUrls]
      const uniqueUrls = Array.from(new Set(combinedUrls))
      setEditMediaUrls(uniqueUrls)
    } else {
      // Immediate save in view mode (shouldn't happen but kept for safety)
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
  }

  const handleComingSoon = (feature: string) => {
    setComingSoonFeature(feature)
    setComingSoonOpen(true)
  }

  const handleStartEditCaption = (url: string, currentCaption: string) => {
    setEditingCaption(url)
    setEditCaptionText(currentCaption)
  }

  const handleSaveCaption = async (url: string) => {
    if (isEditMode) {
      // Save to local state
      setEditImageCaptions(prev => ({
        ...prev,
        [url]: editCaptionText
      }))
      setEditingCaption(null)
      setEditCaptionText("")
    } else {
      // Immediate save in view mode (shouldn't happen but kept for safety)
      setIsSavingCaption(true)
      try {
        const { updateMediaCaption } = await import("@/lib/actions/artifacts")
        const result = await updateMediaCaption(artifact.id, url, editCaptionText)
        if (result.success) {
          setEditingCaption(null)
          router.refresh()
        } else {
          alert(result.error || "Failed to update caption")
        }
      } catch (error) {
        console.error("[v0] Failed to update caption:", error)
        alert("Failed to update caption. Please try again.")
      } finally {
        setIsSavingCaption(false)
      }
    }
  }

  const handleCancelEditCaption = () => {
    setEditingCaption(null)
    setEditCaptionText("")
  }

  const handleCancel = () => {
    if (hasUnsavedChanges) {
      setCancelDialogOpen(true)
    } else {
      router.push(`/artifacts/${artifact.slug}`)
    }
  }

  const handleConfirmCancel = () => {
    setEditTitle(originalState.title)
    setEditDescription(originalState.description)
    setEditMediaUrls(originalState.media_urls)
    setEditImageCaptions(originalState.image_captions)
    setCancelDialogOpen(false)
    router.push(`/artifacts/${artifact.slug}`)
  }

  const handleCaptionGenerated = (url: string, newCaption: string) => {
    if (isEditMode) {
      setEditImageCaptions(prev => ({
        ...prev,
        [url]: newCaption
      }))
    }
  }

  return (
    <ArtifactSwipeWrapper 
      previousUrl={isEditMode ? null : previousUrl} 
      nextUrl={isEditMode ? null : nextUrl} 
      disableSwipe={isImageFullscreen || isEditMode}
    >
      <ArtifactStickyNav
        title={isEditMode ? editTitle : artifact.title}
        backHref={collectionHref}
        backLabel={`${artifact.collection?.title || "Uncategorized"} Collection`}
        previousItem={previous}
        nextItem={next}
        editHref={`/artifacts/${artifact.slug}/edit`}
        canEdit={canEdit}
        isEditMode={isEditMode}
        authorUserId={isEditMode ? undefined : artifact.user_id}
        authorName={isEditMode ? undefined : artifact.author_name}
        collectionId={artifact.collection_id}
        collectionSlug={artifact.collection?.slug}
        collectionName={artifact.collection?.title}
        currentPosition={currentPosition}
        totalCount={totalCount}
      />

      <div className={`space-y-6 px-6 lg:px-8 ${isEditMode ? 'pt-4' : 'pt-2'}`}>
        {!isEditMode && canEdit && (
          <div className="flex items-center justify-between gap-3">
            <Button asChild className="bg-purple-600 hover:bg-purple-700 text-white">
              <Link href={`/artifacts/${artifact.slug}/edit`}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit Artifact
              </Link>
            </Button>
            
            <div className="flex items-center gap-2">
              <Button
                onClick={() => handleComingSoon("Share")}
                variant="outline"
                size="icon"
                className="rounded-lg"
              >
                <Share2 className="h-4 w-4" />
              </Button>
              <Button
                onClick={() => handleComingSoon("Analytics")}
                variant="outline"
                size="icon"
                className="rounded-lg"
              >
                <BarChart3 className="h-4 w-4" />
              </Button>
              <Button
                onClick={() => handleComingSoon("Comments")}
                variant="outline"
                size="icon"
                className="rounded-lg"
              >
                <MessageSquare className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {isEditMode && (
          <section className="space-y-2">
            <label htmlFor="title" className="text-lg font-semibold text-foreground">Title</label>
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
          {isEditMode && <h2 className="text-lg font-semibold text-foreground">Description</h2>}
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
        </section>

        {/* Attributes Section */}
        <section className="space-y-2">
          <Collapsible open={isAttributesOpen} onOpenChange={setIsAttributesOpen}>
            <CollapsibleTrigger className="flex w-full items-center justify-between hover:opacity-80 transition-opacity">
              <h2 className="text-lg font-semibold text-foreground">Attributes</h2>
              <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${isAttributesOpen ? 'rotate-180' : ''}`} />
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
        {isEditMode && (
          <div className="flex items-center justify-between px-6 lg:px-8">
            <h2 className="text-lg font-semibold text-foreground">Media Items</h2>
            {canEdit && (
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
        )}
        
        {mediaUrls.length > 0 ? (
          <div className="space-y-6">
            {mediaUrls.map((url) => {
              if (isAudioFile(url)) {
                const transcript = audioTranscripts[url]
                return (
                  <div key={url} className="space-y-3 px-6 lg:px-8">
                    {isEditMode && (
                      <h3 className="text-sm font-semibold mb-3">Audio Recording {audioFiles > 1 ? `${mediaUrls.indexOf(url) + 1}` : ''}</h3>
                    )}
                    {isEditMode && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteMedia(url)}
                        className="absolute top-2 right-2 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
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
                  </div>
                )
              } else if (isVideoFile(url)) {
                const caption = imageCaptions[url]
                const isEditingThisCaption = editingCaption === url
                return (
                  <div key={url} className="space-y-3">
                    {isEditMode && (
                      <div className="flex items-center justify-between px-6 lg:px-8">
                        <h3 className="text-sm font-semibold">Video {videoFiles > 1 ? `${mediaUrls.indexOf(url) + 1}` : ''}</h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteMedia(url)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                    <div className="w-full max-w-full overflow-hidden">
                      <video 
                        src={url} 
                        controls 
                        className="w-full max-w-full h-auto"
                        style={{ maxHeight: '70vh' }}
                      >
                        Your browser does not support the video tag.
                      </video>
                    </div>
                    <div className="px-6 lg:px-8 space-y-3">
                      {caption && (
                        <div className="rounded-lg border bg-muted/30 p-3">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="text-xs font-semibold text-purple-600">AI Caption</h4>
                            {isEditMode && !isEditingThisCaption && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => handleStartEditCaption(url, caption)}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                          {isEditingThisCaption ? (
                            <div className="space-y-2">
                              <Textarea
                                value={editCaptionText}
                                onChange={(e) => setEditCaptionText(e.target.value)}
                                className="text-sm min-h-[80px]"
                              />
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleSaveCaption(url)}
                                  disabled={isSavingCaption}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  {isSavingCaption ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={handleCancelEditCaption}
                                  disabled={isSavingCaption}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-foreground leading-relaxed">{caption}</p>
                          )}
                        </div>
                      )}
                      {isEditMode && (
                        <GenerateVideoSummaryButton 
                          artifactId={artifact.id} 
                          videoUrl={url}
                          onCaptionGenerated={handleCaptionGenerated}
                        />
                      )}
                    </div>
                  </div>
                )
              } else {
                const caption = imageCaptions[url]
                const isEditingThisCaption = editingCaption === url
                return (
                  <div key={url} className="space-y-3">
                    {isEditMode && (
                      <div className="flex items-center justify-between px-6 lg:px-8">
                        <h3 className="text-sm font-semibold">Photo {imageFiles > 1 ? `${mediaUrls.indexOf(url) + 1}` : ''}</h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteMedia(url)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                    <ArtifactImageWithViewer
                      src={getDetailUrl(url) || "/placeholder.svg"}
                      alt={`${artifact.title} - Image ${mediaUrls.indexOf(url) + 1}`}
                      setIsImageFullscreen={setIsImageFullscreen}
                    />
                    <div className="px-6 lg:px-8 space-y-3">
                      {caption && (
                        <div className="rounded-lg border bg-muted/30 p-3">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="text-xs font-semibold text-purple-600">AI Caption</h4>
                            {isEditMode && !isEditingThisCaption && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => handleStartEditCaption(url, caption)}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                          {isEditingThisCaption ? (
                            <div className="space-y-2">
                              <Textarea
                                value={editCaptionText}
                                onChange={(e) => setEditCaptionText(e.target.value)}
                                className="text-sm min-h-[80px]"
                              />
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleSaveCaption(url)}
                                  disabled={isSavingCaption}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  {isSavingCaption ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={handleCancelEditCaption}
                                  disabled={isSavingCaption}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-foreground leading-relaxed">{caption}</p>
                          )}
                        </div>
                      )}
                      {isEditMode && (
                        <GenerateImageCaptionButton 
                          artifactId={artifact.id} 
                          imageUrl={url}
                          onCaptionGenerated={handleCaptionGenerated}
                        />
                      )}
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
      <div className="px-6 lg:px-8 pb-[240px]">
        <section className="pb-8">
          <Collapsible open={isProvenanceOpen} onOpenChange={setIsProvenanceOpen}>
            <CollapsibleTrigger className="flex w-full items-center justify-between hover:opacity-80 transition-opacity">
              <h2 className="text-lg font-semibold text-foreground">Provenance</h2>
              <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${isProvenanceOpen ? 'rotate-180' : ''}`} />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2 rounded-lg border bg-card p-4">
                <dl className="space-y-3 text-sm">
                  {artifact.author_name && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Author</dt>
                      <dd className="font-medium">{artifact.author_name}</dd>
                    </div>
                  )}
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

        {isEditMode && canEdit && (
          <section className="border-t pt-6 pb-8">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-destructive">Danger Zone</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Permanently delete this artifact. This action cannot be undone and all media will be lost.
                </p>
              </div>

              <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" type="button" disabled={isDeleting}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Artifact
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Artifact</AlertDialogTitle>
                    <AlertDialogDescription className="space-y-3">
                      <p>
                        You are about to permanently delete <strong>"{artifact.title}"</strong>.
                      </p>
                      <p className="text-destructive font-medium">
                        All media files ({totalMedia} {totalMedia === 1 ? 'file' : 'files'}) will be permanently deleted from storage.
                      </p>
                      <p className="text-xs text-muted-foreground">This action cannot be undone.</p>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={(e) => {
                        e.preventDefault()
                        handleDeleteArtifact()
                      }}
                      disabled={isDeleting}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {isDeleting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        "Delete Artifact"
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </section>
        )}
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

      {/* Coming Soon Dialog */}
      <Dialog open={comingSoonOpen} onOpenChange={setComingSoonOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{comingSoonFeature}</DialogTitle>
            <DialogDescription>
              This feature is coming soon! We're working hard to bring you the ability to {comingSoonFeature.toLowerCase()} your artifacts.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      {/* Save Module */}
      {isEditMode && canEdit && (
        <div className="fixed bottom-[calc(120px+env(safe-area-inset-bottom))] left-0 right-0 flex justify-center pointer-events-none z-40">
          <div className="pointer-events-auto bg-card/95 backdrop-blur-sm border rounded-3xl shadow-lg p-4 mx-4 w-auto">
            <div className="flex items-center gap-3">
              <Button 
                onClick={handleSave} 
                disabled={isSaving}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
              <Button 
                onClick={handleCancel}
                variant="outline"
                disabled={isSaving}
              >
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard Changes?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. If you cancel now, all changes will be lost. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Editing</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmCancel}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Discard Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
