"use client"
import { createArtifact } from "@/lib/actions/artifacts"
import { cleanupPendingUploads } from "@/lib/actions/pending-uploads"
import { createArtifactSchema } from "@/lib/schemas"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import type { z } from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useState, useEffect } from "react"
import { ChevronDown, Plus, Trash2, Star } from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { normalizeMediaUrls, isImageUrl, isVideoUrl, isAudioUrl } from "@/lib/media"
import { TranscriptionInput } from "@/components/transcription-input"
import { AddMediaModal } from "@/components/add-media-modal"
import { AudioPlayer } from "@/components/audio-player"
import { getMediumUrl } from "@/lib/cloudinary"
import { GenerateImageCaptionButton } from "@/components/artifact/GenerateImageCaptionButton"
import { GenerateVideoSummaryButton } from "@/components/artifact/GenerateVideoSummaryButton"
import { TranscribeAudioButtonPerMedia } from "@/components/artifact/TranscribeAudioButtonPerMedia"
import { useRouter } from "next/navigation"
import { CollectionSelector } from "@/components/collection-selector"
import ArtifactTypeSelector from "@/components/artifact-type-selector"
import { getCollection } from "@/lib/actions/collections"
import { getArtifactTypes } from "@/lib/actions/artifact-types"

type FormData = z.infer<typeof createArtifactSchema>

interface NewArtifactFormProps {
  collectionId?: string
  userId: string
}

export { NewArtifactForm }
export default function NewArtifactForm({ collectionId, userId }: NewArtifactFormProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isAttributesOpen, setIsAttributesOpen] = useState(false)
  const [isProvenanceOpen, setIsProvenanceOpen] = useState(false)
  const [isAddMediaOpen, setIsAddMediaOpen] = useState(false)
  const [selectedThumbnailUrl, setSelectedThumbnailUrl] = useState<string | null>(null)
  const [collectionPrimaryTypeId, setCollectionPrimaryTypeId] = useState<string | null>(null)
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null)
  const [artifactTypes, setArtifactTypes] = useState<any[]>([])
  const [isTypesOpen, setIsTypesOpen] = useState(false)

  const [imageCaptions, setImageCaptions] = useState<Record<string, string>>({})
  const [videoSummaries, setVideoSummaries] = useState<Record<string, string>>({})
  const [audioTranscripts, setAudioTranscripts] = useState<Record<string, string>>({})

  console.log("[v0] NewArtifactForm - Initialized with collectionId:", collectionId, "userId:", userId)

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

  useEffect(() => {
    const fetchCollectionType = async () => {
      const selectedCollectionId = form.watch("collectionId")
      if (selectedCollectionId) {
        const collection = await getCollection(selectedCollectionId)
        if (collection?.primary_type_id) {
          setCollectionPrimaryTypeId(collection.primary_type_id)
        } else {
          setCollectionPrimaryTypeId(null)
        }
      }
    }

    fetchCollectionType()
  }, [form.watch("collectionId")])

  useEffect(() => {
    async function loadTypes() {
      const types = await getArtifactTypes()
      console.log("[v0] Loaded artifact types:", types)
      setArtifactTypes(types)
    }
    loadTypes()
  }, [])

  const handleCancel = async () => {
    console.log("[v0] User clicked cancel - cleaning up pending uploads")

    const result = await cleanupPendingUploads()
    if (result.error) {
      console.error("[v0] Cleanup failed:", result.error)
    } else {
      console.log(`[v0] Cleanup complete: ${result.deletedCount} files deleted`)
    }

    router.back()
  }

  const handleMediaAdded = (newUrls: string[]) => {
    const currentUrls = form.getValues("media_urls") || []
    const combinedUrls = [...currentUrls, ...newUrls]
    const uniqueUrls = Array.from(new Set(combinedUrls))
    form.setValue("media_urls", normalizeMediaUrls(uniqueUrls))

    if (!selectedThumbnailUrl && newUrls.length > 0) {
      const firstVisual = newUrls.find((url) => isImageUrl(url) || isVideoUrl(url))
      if (firstVisual) {
        setSelectedThumbnailUrl(firstVisual)
      }
    }
  }

  const handleDeleteMedia = (urlToDelete: string) => {
    if (!confirm("Are you sure you want to delete this media item?")) return
    const currentUrls = form.getValues("media_urls") || []
    form.setValue("media_urls", normalizeMediaUrls(currentUrls.filter((url) => url !== urlToDelete)))

    if (selectedThumbnailUrl === urlToDelete) {
      const remainingUrls = currentUrls.filter((url) => url !== urlToDelete)
      const newThumbnail = remainingUrls.find((url) => isImageUrl(url) || isVideoUrl(url))
      setSelectedThumbnailUrl(newThumbnail || null)
    }
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

    const submitData = {
      ...data,
      media_urls: normalizedUrls,
      thumbnail_url: selectedThumbnailUrl,
      image_captions: Object.keys(imageCaptions).length > 0 ? imageCaptions : undefined,
      video_summaries: Object.keys(videoSummaries).length > 0 ? videoSummaries : undefined,
      audio_transcripts: Object.keys(audioTranscripts).length > 0 ? audioTranscripts : undefined,
      type_id: selectedTypeId,
    }

    setError(null)

    const result = await createArtifact(submitData)

    if (result?.error) {
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

  const uploadedMedia = form.watch("media_urls") || []
  const audioFiles = uploadedMedia.filter((url) => isAudioUrl(url))
  const videoFiles = uploadedMedia.filter((url) => isVideoUrl(url))
  const imageFiles = uploadedMedia.filter((url) => isImageUrl(url))

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        <section className="space-y-2">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">Title</FormLabel>
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

        <section className="space-y-2">
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">Description</FormLabel>
                <FormControl>
                  <TranscriptionInput
                    value={field.value}
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
                  disabled={form.formState.isSubmitting}
                />
                <FormDescription>Choose which collection this artifact belongs to</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </section>

        {artifactTypes.length > 0 && (
          <ArtifactTypeSelector
            types={artifactTypes}
            selectedTypeId={selectedTypeId}
            onSelectType={setSelectedTypeId}
            required={false}
            defaultOpen={true}
            storageKey="artifactTypeSelector_new_open"
          />
        )}

        <section className="space-y-2">
          <Collapsible open={isAttributesOpen} onOpenChange={setIsAttributesOpen}>
            <CollapsibleTrigger className="flex w-full items-center justify-between hover:opacity-80 transition-opacity">
              <h2 className="text-sm font-medium text-foreground">Attributes</h2>
              <ChevronDown
                className={`h-5 w-5 text-muted-foreground transition-transform ${isAttributesOpen ? "rotate-180" : ""}`}
              />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2 space-y-3 rounded-lg border bg-card p-4">
                <FormField
                  control={form.control}
                  name="year_acquired"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Year Acquired</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="2020"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => {
                            const val = e.target.value
                            field.onChange(val === "" ? undefined : Number(val))
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="origin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Origin</FormLabel>
                      <FormControl>
                        <Input placeholder="Where did this come from?" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-foreground">Media Items</h2>
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

          {uploadedMedia.length > 0 ? (
            <div className="space-y-6">
              {uploadedMedia.map((url, idx) => {
                if (isAudioUrl(url)) {
                  return (
                    <div key={url} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold">
                          Audio {audioFiles.length > 1 ? `${audioFiles.indexOf(url) + 1}` : ""}
                        </h3>
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
                        {audioTranscripts[url] && (
                          <div className="rounded-lg border bg-muted/30 p-4">
                            <h4 className="text-sm font-semibold mb-2">Transcript</h4>
                            <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap italic">
                              {audioTranscripts[url]}
                            </div>
                          </div>
                        )}
                        <TranscribeAudioButtonPerMedia
                          audioUrl={url}
                          onTranscriptGenerated={handleAudioTranscriptGenerated}
                          currentTranscript={audioTranscripts[url]}
                        />
                      </div>
                    </div>
                  )
                }

                if (isVideoUrl(url)) {
                  return (
                    <div key={url} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold">
                          Video {videoFiles.length > 1 ? `${videoFiles.indexOf(url) + 1}` : ""}
                        </h3>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSelectThumbnail(url)}
                            className={
                              selectedThumbnailUrl === url
                                ? "text-yellow-500"
                                : "text-muted-foreground hover:text-foreground"
                            }
                            title="Set as thumbnail"
                          >
                            <Star className={`h-4 w-4 ${selectedThumbnailUrl === url ? "fill-current" : ""}`} />
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
                      <div className="space-y-3">
                        <video
                          src={url}
                          controls
                          className="w-full rounded shadow-md"
                          preload="metadata"
                          playsInline
                        />
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-purple-600">Caption</label>
                          <TranscriptionInput
                            value={videoSummaries[url] || ""}
                            onChange={(value) => {
                              setVideoSummaries((prev) => ({
                                ...prev,
                                [url]: value,
                              }))
                            }}
                            placeholder="Add caption..."
                            type="textarea"
                            fieldType="description"
                            userId={userId}
                            entityType="artifact"
                            rows={2}
                            className="text-sm italic"
                          />
                        </div>
                        <GenerateVideoSummaryButton
                          videoUrl={url}
                          onSummaryGenerated={handleVideoSummaryGenerated}
                          currentSummary={videoSummaries[url]}
                        />
                      </div>
                    </div>
                  )
                }

                if (isImageUrl(url)) {
                  return (
                    <div key={url} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold">
                          Image {imageFiles.length > 1 ? `${imageFiles.indexOf(url) + 1}` : ""}
                        </h3>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSelectThumbnail(url)}
                            className={
                              selectedThumbnailUrl === url
                                ? "text-yellow-500"
                                : "text-muted-foreground hover:text-foreground"
                            }
                            title="Set as thumbnail"
                          >
                            <Star className={`h-4 w-4 ${selectedThumbnailUrl === url ? "fill-current" : ""}`} />
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
                      <div className="space-y-3">
                        <img
                          src={getMediumUrl(url, null) || "/placeholder.svg"}
                          alt={`Artifact media ${idx + 1}`}
                          className="w-full rounded shadow-md"
                        />
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-purple-600">Caption</label>
                          <TranscriptionInput
                            value={imageCaptions[url] || ""}
                            onChange={(value) => {
                              setImageCaptions((prev) => ({
                                ...prev,
                                [url]: value,
                              }))
                            }}
                            placeholder="Add caption..."
                            type="textarea"
                            fieldType="description"
                            userId={userId}
                            entityType="artifact"
                            rows={2}
                            className="text-sm italic"
                          />
                        </div>
                        <GenerateImageCaptionButton
                          imageUrl={url}
                          onCaptionGenerated={handleCaptionGenerated}
                          currentCaption={imageCaptions[url]}
                        />
                      </div>
                    </div>
                  )
                }

                return null
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center rounded-lg border border-dashed p-12">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">No media added yet</p>
                <p className="text-xs text-muted-foreground mt-1">Click "Add Media" to get started</p>
              </div>
            </div>
          )}
        </section>

        <section className="space-y-2">
          <Collapsible open={isProvenanceOpen} onOpenChange={setIsProvenanceOpen}>
            <CollapsibleTrigger className="flex w-full items-center justify-between hover:opacity-80 transition-opacity">
              <h2 className="text-sm font-medium text-foreground">Provenance</h2>
              <ChevronDown
                className={`h-5 w-5 text-muted-foreground transition-transform ${isProvenanceOpen ? "rotate-180" : ""}`}
              />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2 rounded-lg border bg-card p-4">
                <p className="text-sm text-muted-foreground italic">
                  Provenance details will be available after creation
                </p>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </section>

        <div className="flex gap-3 pb-[240px]">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Creating..." : "Create Artifact"}
          </Button>
          <Button type="button" variant="outline" onClick={handleCancel} disabled={form.formState.isSubmitting}>
            Cancel
          </Button>
        </div>
      </form>

      <AddMediaModal
        open={isAddMediaOpen}
        onOpenChange={setIsAddMediaOpen}
        artifactId={null}
        userId={userId}
        onMediaAdded={handleMediaAdded}
      />
    </Form>
  )
}
