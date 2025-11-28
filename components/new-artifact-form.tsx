"use client"
import { createArtifact } from "@/lib/actions/artifacts"
import { cleanupPendingUploads } from "@/lib/actions/pending-uploads"
import { createArtifactSchema } from "@/lib/schemas"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import type { z } from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form"
import { useState, useEffect } from "react"
import { ChevronDown, Trash2, Save, X, Plus, BookImage } from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { normalizeMediaUrls, isAudioUrl, isImageUrl, isVideoUrl } from "@/lib/media"
import { getMediumUrl } from "@/lib/cloudinary"
import { TranscriptionInput } from "@/components/transcription-input"
import { AudioPlayer } from "@/components/audio-player"
import { TranscribeAudioButtonPerMedia } from "@/components/artifact/TranscribeAudioButtonPerMedia"
import { GenerateImageCaptionButton } from "@/components/artifact/GenerateImageCaptionButton"
import { GenerateVideoSummaryButton } from "@/components/artifact/GenerateVideoSummaryButton"
import { ArtifactImageWithViewer } from "@/components/artifact-image-with-viewer"
import { useRouter } from "next/navigation"
import { CollectionSelector } from "@/components/collection-selector"
import ArtifactTypeSelector from "@/components/artifact-type-selector"
import { getArtifactTypes } from "@/lib/actions/artifact-types"
import { SectionTitle } from "@/components/ui/section-title"
import { HelpText } from "@/components/ui/help-text"
import { Separator } from "@/components/ui/separator"
import { NewArtifactGalleryEditor } from "@/components/new-artifact-gallery-editor"
import { AddMediaModal } from "@/components/add-media-modal"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

type FormData = z.infer<typeof createArtifactSchema>

interface NewArtifactFormProps {
  collectionId?: string
  userId: string
}

export { NewArtifactForm }
export default function NewArtifactForm({ collectionId, userId }: NewArtifactFormProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isAttributesOpen, setIsAttributesOpen] = useState(false)
  const [isAddMediaOpen, setIsAddMediaOpen] = useState(false)
  const [selectedThumbnailUrl, setSelectedThumbnailUrl] = useState<string | null>(null)
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null)
  const [artifactTypes, setArtifactTypes] = useState<any[]>([])
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [deleteMediaDialogOpen, setDeleteMediaDialogOpen] = useState(false)
  const [mediaToDelete, setMediaToDelete] = useState<string | null>(null)
  const [isImageFullscreen, setIsImageFullscreen] = useState(false)

  const [imageCaptions, setImageCaptions] = useState<Record<string, string>>({})
  const [videoSummaries, setVideoSummaries] = useState<Record<string, string>>({})
  const [audioTranscripts, setAudioTranscripts] = useState<Record<string, string>>({})

  // Separate state for gallery URLs vs media block URLs
  const [galleryUrls, setGalleryUrls] = useState<string[]>([])
  const [mediaBlockUrls, setMediaBlockUrls] = useState<string[]>([])

  const form = useForm<FormData>({
    resolver: zodResolver(createArtifactSchema),
    defaultValues: {
      title: "",
      description: "",
      collectionId: collectionId || "",
      year_acquired: undefined,
      origin: "",
      media_urls: [],
      type_id: undefined,
    },
  })

  // Keep form.media_urls in sync with combined gallery + media block URLs
  useEffect(() => {
    const combinedUrls = [...galleryUrls, ...mediaBlockUrls]
    const uniqueUrls = Array.from(new Set(combinedUrls))
    form.setValue("media_urls", normalizeMediaUrls(uniqueUrls))
  }, [galleryUrls, mediaBlockUrls, form])

  useEffect(() => {
    async function loadTypes() {
      const types = await getArtifactTypes()
      console.log("[v0] Loaded artifact types:", types)
      setArtifactTypes(types)
    }
    loadTypes()
  }, [])

  // Check if form has any data entered
  const hasFormData = () => {
    const title = form.getValues("title") || ""
    const description = form.getValues("description") || ""
    return title.trim() !== "" || description.trim() !== "" || galleryUrls.length > 0 || mediaBlockUrls.length > 0
  }

  const handleCancel = () => {
    if (hasFormData()) {
      setCancelDialogOpen(true)
    } else {
      confirmCancel()
    }
  }

  const confirmCancel = async () => {
    setCancelDialogOpen(false)
    console.log("[v0] User confirmed cancel - cleaning up pending uploads")

    const result = await cleanupPendingUploads()
    if (result.error) {
      console.error("[v0] Cleanup failed:", result.error)
    } else {
      console.log(`[v0] Cleanup complete: ${result.deletedCount} files deleted`)
    }

    router.back()
  }

  // Handler for gallery media changes (from NewArtifactGalleryEditor)
  const handleGalleryUrlsChange = (urls: string[]) => {
    console.log("[v0] Gallery URLs changed:", urls.length, urls)
    setGalleryUrls(urls)
    // Auto-select first visual as thumbnail if none selected
    if (!selectedThumbnailUrl && urls.length > 0) {
      const firstVisual = urls.find((url) => isImageUrl(url) || isVideoUrl(url))
      if (firstVisual) {
        setSelectedThumbnailUrl(firstVisual)
      }
    }
  }

  // Handler for adding media blocks (from AddMediaModal)
  const handleMediaBlocksAdded = (newUrls: string[]) => {
    console.log("[v0] Media Blocks added:", newUrls.length, newUrls)
    const combinedUrls = [...mediaBlockUrls, ...newUrls]
    const uniqueUrls = Array.from(new Set(combinedUrls))
    console.log("[v0] Media Blocks after combining:", uniqueUrls.length, uniqueUrls)
    setMediaBlockUrls(uniqueUrls)

    // Auto-select first visual as thumbnail if none selected
    if (!selectedThumbnailUrl && newUrls.length > 0) {
      const firstVisual = newUrls.find((url) => isImageUrl(url) || isVideoUrl(url))
      if (firstVisual) {
        setSelectedThumbnailUrl(firstVisual)
      }
    }
  }

  const handleDeleteMedia = (urlToDelete: string) => {
    setMediaToDelete(urlToDelete)
    setDeleteMediaDialogOpen(true)
  }

  const confirmDeleteMedia = () => {
    if (!mediaToDelete) return

    // Remove from media blocks
    setMediaBlockUrls((prev) => prev.filter((url) => url !== mediaToDelete))

    // Clean up associated metadata
    setImageCaptions((prev) => {
      const updated = { ...prev }
      delete updated[mediaToDelete]
      return updated
    })
    setVideoSummaries((prev) => {
      const updated = { ...prev }
      delete updated[mediaToDelete]
      return updated
    })
    setAudioTranscripts((prev) => {
      const updated = { ...prev }
      delete updated[mediaToDelete]
      return updated
    })

    // Update thumbnail if deleted
    if (selectedThumbnailUrl === mediaToDelete) {
      const remainingUrls = [...galleryUrls, ...mediaBlockUrls.filter((url) => url !== mediaToDelete)]
      const newThumbnail = remainingUrls.find((url) => isImageUrl(url) || isVideoUrl(url))
      setSelectedThumbnailUrl(newThumbnail || null)
    }

    setDeleteMediaDialogOpen(false)
    setMediaToDelete(null)
  }

  const handleSelectThumbnail = (url: string) => {
    setSelectedThumbnailUrl(url)
  }

  const handleCaptionGenerated = (url: string, caption: string) => {
    setImageCaptions((prev) => ({ ...prev, [url]: caption }))
  }

  const handleVideoSummaryGenerated = (url: string, summary: string) => {
    setVideoSummaries((prev) => ({ ...prev, [url]: summary }))
  }

  const handleAudioTranscriptGenerated = (url: string, transcript: string) => {
    setAudioTranscripts((prev) => ({ ...prev, [url]: transcript }))
  }

  async function onSubmit(data: FormData): Promise<void> {
    const normalizedUrls = normalizeMediaUrls(data.media_urls || [])

    if (normalizedUrls.length === 0) {
      setError("Please add at least one media item to your artifact.")
      return
    }

    // Use selected thumbnail or first visual media
    const thumbnailUrl = selectedThumbnailUrl || normalizedUrls.find((url) => isImageUrl(url) || isVideoUrl(url))

    const submitData = {
      ...data,
      media_urls: normalizedUrls,
      thumbnail_url: thumbnailUrl || null,
      image_captions: Object.keys(imageCaptions).length > 0 ? imageCaptions : undefined,
      video_summaries: Object.keys(videoSummaries).length > 0 ? videoSummaries : undefined,
      audio_transcripts: Object.keys(audioTranscripts).length > 0 ? audioTranscripts : undefined,
      type_id: selectedTypeId,
      // Pass gallery URLs separately so createArtifact can create artifact_media links
      gallery_urls: galleryUrls,
    }

    setError(null)
    setIsSubmitting(true)

    const result = await createArtifact(submitData)

    if (result?.error) {
      setIsSubmitting(false)
      if (result.fieldErrors) {
        Object.entries(result.fieldErrors).forEach(([field, messages]) => {
          if (messages && Array.isArray(messages) && messages.length > 0) {
            form.setError(field as keyof FormData, {
              type: "server",
              message: messages[0],
            })
          }
        })
        const errorSummary = Object.entries(result.fieldErrors)
          .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(", ") : messages}`)
          .join("; ")
        setError(`Validation errors: ${errorSummary}`)
      } else {
        setError(result.error)
      }
    }
  }

  // Filter media block URLs by type for display
  const audioFiles = mediaBlockUrls.filter((url) => isAudioUrl(url))
  const videoFiles = mediaBlockUrls.filter((url) => isVideoUrl(url))
  const imageFiles = mediaBlockUrls.filter((url) => isImageUrl(url))

  // Debug logging
  console.log("[v0] Render - galleryUrls:", galleryUrls.length, "mediaBlockUrls:", mediaBlockUrls.length)

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pb-48">
        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Title Section */}
        <section className="space-y-2">
          <SectionTitle>Title</SectionTitle>
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <TranscriptionInput
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Enter artifact title"
                    type="input"
                    fieldType="title"
                    userId={userId}
                    entityType="artifact"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </section>

        {/* Gallery Section */}
        <NewArtifactGalleryEditor
          mediaUrls={galleryUrls}
          onMediaUrlsChange={handleGalleryUrlsChange}
          userId={userId}
        />

        {/* Description Section */}
        <section className="space-y-4 py-4">
          <SectionTitle>Description</SectionTitle>
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <TranscriptionInput
                    value={field.value || ""}
                    onChange={field.onChange}
                    placeholder="Tell the story of this artifact..."
                    type="textarea"
                    fieldType="description"
                    userId={userId}
                    entityType="artifact"
                    rows={4}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </section>

        {/* Collection Section */}
        <section className="space-y-2">
          <FormField
            control={form.control}
            name="collectionId"
            render={({ field }) => (
              <FormItem>
                <CollectionSelector
                  userId={userId}
                  value={field.value}
                  onChange={field.onChange}
                  disabled={isSubmitting}
                />
                <HelpText>Choose which collection this artifact belongs to</HelpText>
                <FormMessage />
              </FormItem>
            )}
          />
        </section>

        {/* Type Section */}
        {artifactTypes.length > 0 && (
          <>
            <div className="pt-4" />
            <ArtifactTypeSelector
              types={artifactTypes}
              selectedTypeId={selectedTypeId}
              onSelectType={setSelectedTypeId}
              required={false}
              defaultOpen={true}
              storageKey="artifactTypeSelector_new_open"
            />
          </>
        )}

        {/* Attributes Section */}
        <section className="mb-0">
          <Collapsible open={isAttributesOpen} onOpenChange={setIsAttributesOpen}>
            <div className="rounded-md border border-input bg-transparent dark:bg-input/30 shadow-xs">
              <CollapsibleTrigger className="flex w-full items-center justify-between px-3 py-2 hover:opacity-80 transition-opacity">
                <SectionTitle className="pl-0">Attributes</SectionTitle>
                <ChevronDown
                  className={`h-4 w-4 text-muted-foreground opacity-50 transition-transform ${isAttributesOpen ? "rotate-180" : ""}`}
                />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-3 pb-3">
                  <p className="text-sm text-muted-foreground italic">
                    No attributes added yet. Future updates will include fields for make, model, year, measurements,
                    materials, and condition.
                  </p>
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        </section>

        <Separator className="my-4" />

        {/* Media Blocks Section */}
        <section className="space-y-6 mb-6 overflow-x-hidden">
          <div className="flex items-center justify-between">
            <div>
              <SectionTitle>Media Blocks</SectionTitle>
              <HelpText className="mt-0.5">
                Additional media with captions and AI analysis
              </HelpText>
            </div>
            <Button
              type="button"
              onClick={() => setIsAddMediaOpen(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white"
              size="sm"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Media
            </Button>
          </div>

          {mediaBlockUrls.length > 0 ? (
            <div className="space-y-6">
              {mediaBlockUrls.map((url) => {
                if (isAudioUrl(url)) {
                  const transcript = audioTranscripts[url]
                  return (
                    <div key={url} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <SectionTitle as="h3">
                          Audio{audioFiles.length > 1 ? ` ${audioFiles.indexOf(url) + 1}` : ""}
                        </SectionTitle>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteMedia(url)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="space-y-3">
                        <AudioPlayer src={url} title="Audio Recording" />
                        <div className="mt-3">
                          <TranscribeAudioButtonPerMedia
                            audioUrl={url}
                            onTranscriptGenerated={handleAudioTranscriptGenerated}
                            currentTranscript={transcript}
                          />
                        </div>
                        {transcript && (
                          <div className="rounded-lg border bg-muted/30 p-4 mt-3">
                            <h4 className="text-sm font-semibold mb-2">Transcript</h4>
                            <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap italic">
                              {transcript}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                } else if (isVideoUrl(url)) {
                  const summary = videoSummaries[url]
                  const isSelectedThumbnail = selectedThumbnailUrl === url
                  return (
                    <div key={url} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <SectionTitle as="h3">
                          Video{videoFiles.length > 1 ? ` ${videoFiles.indexOf(url) + 1}` : ""}
                        </SectionTitle>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSelectThumbnail(url)}
                            className={
                              isSelectedThumbnail ? "text-yellow-500" : "text-muted-foreground hover:text-yellow-500"
                            }
                            title="Set as thumbnail"
                          >
                            <BookImage className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteMedia(url)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="w-full max-w-full overflow-hidden overflow-x-hidden">
                        <video src={url} controls className="w-full max-w-full h-auto rounded shadow-md" style={{ maxHeight: "70vh" }}>
                          Your browser does not support the video tag.
                        </video>
                      </div>
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <SectionTitle as="label" variant="purple">Caption</SectionTitle>
                          <TranscriptionInput
                            value={summary || ""}
                            onChange={(newSummary) => {
                              setVideoSummaries((prev) => ({
                                ...prev,
                                [url]: newSummary,
                              }))
                            }}
                            placeholder="Add a caption for this video..."
                            type="textarea"
                            fieldType="description"
                            userId={userId}
                            entityType="artifact"
                            rows={3}
                            className="text-base md:text-sm italic"
                          />
                        </div>
                        <GenerateVideoSummaryButton
                          videoUrl={url}
                          onSummaryGenerated={handleVideoSummaryGenerated}
                          currentSummary={summary}
                        />
                      </div>
                    </div>
                  )
                } else {
                  // Image
                  const caption = imageCaptions[url]
                  const isSelectedThumbnail = selectedThumbnailUrl === url
                  return (
                    <div key={url} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <SectionTitle as="h3">
                          Photo{imageFiles.length > 1 ? ` ${imageFiles.indexOf(url) + 1}` : ""}
                        </SectionTitle>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSelectThumbnail(url)}
                            className={
                              isSelectedThumbnail ? "text-yellow-500" : "text-muted-foreground hover:text-yellow-500"
                            }
                            title="Set as thumbnail"
                          >
                            <BookImage className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteMedia(url)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <ArtifactImageWithViewer
                        src={getMediumUrl(url, null) || url}
                        alt={`New artifact - Image ${imageFiles.indexOf(url) + 1}`}
                        setIsImageFullscreen={setIsImageFullscreen}
                      />
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <SectionTitle as="label" variant="purple">Caption</SectionTitle>
                          <TranscriptionInput
                            value={caption || ""}
                            onChange={(newCaption) => {
                              setImageCaptions((prev) => ({
                                ...prev,
                                [url]: newCaption,
                              }))
                            }}
                            placeholder="Add a caption for this image..."
                            type="textarea"
                            fieldType="description"
                            userId={userId}
                            entityType="artifact"
                            rows={3}
                            className="text-base md:text-sm italic"
                          />
                        </div>
                        <GenerateImageCaptionButton
                          imageUrl={url}
                          onCaptionGenerated={handleCaptionGenerated}
                          currentCaption={caption}
                        />
                      </div>
                    </div>
                  )
                }
              })}
            </div>
          ) : (
            <div className="min-h-[120px] rounded-lg border border-dashed bg-muted/30 flex items-center justify-center">
              <p className="text-sm text-muted-foreground">No media blocks added yet</p>
            </div>
          )}
        </section>
      </form>

      {/* Sticky Save/Cancel Module */}
      <div className="fixed bottom-[calc(120px+env(safe-area-inset-bottom))] left-0 right-0 flex justify-center pointer-events-none z-40">
        <div className="pointer-events-auto bg-card/95 backdrop-blur-sm border rounded-3xl shadow-lg p-4 mx-4 w-auto">
          <div className="flex items-center gap-3">
            <Button
              onClick={form.handleSubmit(onSubmit)}
              disabled={isSubmitting}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Save className="mr-2 h-4 w-4" />
              {isSubmitting ? "Creating..." : "Create Artifact"}
            </Button>
            <Button onClick={handleCancel} variant="outline" disabled={isSubmitting}>
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
          </div>
        </div>
      </div>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard Changes?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. If you cancel now, all changes will be lost and any uploaded media will be deleted. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Editing</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmCancel}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Discard Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Media Confirmation Dialog */}
      <AlertDialog open={deleteMediaDialogOpen} onOpenChange={setDeleteMediaDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Media?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">
                This will remove the media from your artifact.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Media</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteMedia}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove Media
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Media Modal for Media Blocks */}
      <AddMediaModal
        open={isAddMediaOpen}
        onOpenChange={setIsAddMediaOpen}
        artifactId={null}
        userId={userId}
        onMediaAdded={handleMediaBlocksAdded}
      />
    </Form>
  )
}
