"use client"

import type React from "react"
import { createArtifact } from "@/lib/actions/artifacts"
import { createArtifactSchema } from "@/lib/schemas"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import type { z } from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { useState, useEffect, useRef } from "react"
import { ChevronDown, Plus, Trash2, Star } from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { normalizeMediaUrls, isImageUrl, isVideoUrl } from "@/lib/media"
import { TranscriptionInput } from "@/components/transcription-input"
import { AddMediaModal } from "@/components/add-media-modal"
import { AudioPlayer } from "@/components/audio-player"
import { getDetailUrl } from "@/lib/cloudinary"
import { deleteCloudinaryMedia, extractPublicIdFromUrl } from "@/lib/actions/cloudinary"

type FormData = z.infer<typeof createArtifactSchema>

interface NewArtifactFormProps {
  collectionId?: string
  userId: string
}

export function NewArtifactForm({ collectionId, userId }: NewArtifactFormProps) {
  const [error, setError] = useState<string | null>(null)
  const [isAttributesOpen, setIsAttributesOpen] = useState(false)
  const [isProvenanceOpen, setIsProvenanceOpen] = useState(false)
  const [isAddMediaOpen, setIsAddMediaOpen] = useState(false)
  const [selectedThumbnailUrl, setSelectedThumbnailUrl] = useState<string | null>(null)
  
  const [uploadedMediaUrls, setUploadedMediaUrls] = useState<string[]>([])
  const artifactCreatedRef = useRef(false)

  const form = useForm<FormData>({
    resolver: zodResolver(createArtifactSchema),
    defaultValues: {
      title: "",
      description: "",
      collectionId: collectionId || "",
      year_acquired: undefined,
      origin: "",
      media_urls: [],
    },
  })

  useEffect(() => {
    return () => {
      if (!artifactCreatedRef.current && uploadedMediaUrls.length > 0) {
        console.log("[v0] Component unmounting with abandoned uploads, cleaning up", uploadedMediaUrls.length, "files")
        
        uploadedMediaUrls.forEach(async (url) => {
          const publicId = await extractPublicIdFromUrl(url)
          if (publicId) {
            console.log("[v0] Deleting abandoned upload:", publicId)
            await deleteCloudinaryMedia(publicId)
          }
        })
      }
    }
  }, [uploadedMediaUrls])

  const handleMediaAdded = (newUrls: string[]) => {
    const currentUrls = form.getValues("media_urls") || []
    const combinedUrls = [...currentUrls, ...newUrls]
    const uniqueUrls = Array.from(new Set(combinedUrls))
    form.setValue("media_urls", normalizeMediaUrls(uniqueUrls))
    
    setUploadedMediaUrls((prev) => {
      const allUrls = [...prev, ...newUrls]
      return Array.from(new Set(allUrls))
    })
    
    if (!selectedThumbnailUrl && newUrls.length > 0) {
      const firstVisual = newUrls.find(url => isImageUrl(url) || isVideoUrl(url))
      if (firstVisual) {
        setSelectedThumbnailUrl(firstVisual)
      }
    }
  }

  const handleDeleteMedia = (urlToDelete: string) => {
    if (!confirm("Are you sure you want to delete this media item?")) return
    const currentUrls = form.getValues("media_urls") || []
    form.setValue("media_urls", normalizeMediaUrls(currentUrls.filter(url => url !== urlToDelete)))
    
    setUploadedMediaUrls((prev) => prev.filter(url => url !== urlToDelete))
    
    if (selectedThumbnailUrl === urlToDelete) {
      const remainingUrls = currentUrls.filter(url => url !== urlToDelete)
      const newThumbnail = remainingUrls.find(url => isImageUrl(url) || isVideoUrl(url))
      setSelectedThumbnailUrl(newThumbnail || null)
    }
  }

  const handleSelectThumbnail = (url: string) => {
    setSelectedThumbnailUrl(url)
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
    }

    setError(null)

    try {
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
      } else {
        artifactCreatedRef.current = true
      }
    } catch (error) {
      if (error instanceof Error && error.message === "NEXT_REDIRECT") {
        artifactCreatedRef.current = true
        return
      }
      setError(error instanceof Error ? error.message : "An unexpected error occurred")
    }
  }

  const uploadedMedia = form.watch("media_urls") || []
  const audioFiles = uploadedMedia.filter((url) => isAudioFile(url))
  const videoFiles = uploadedMedia.filter((url) => isVideoFile(url))
  const imageFiles = uploadedMedia.filter((url) => !isAudioFile(url) && !isVideoFile(url))

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <section className="space-y-2 px-6 lg:px-8">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-lg font-semibold">Title</FormLabel>
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

        <section className="space-y-2 px-6 lg:px-8">
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-lg font-semibold">Description</FormLabel>
                <FormControl>
                  <TranscriptionInput
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Tell the story of this artifact..."
                    type="textarea"
                    fieldType="description"
                    userId={userId}
                    entityType="artifact"
                    rows={6}
                  />
                </FormControl>
                <FormDescription>
                  Write a personal description of this artifact and what it means to you
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </section>

        <section className="space-y-2 px-6 lg:px-8">
          <Collapsible open={isAttributesOpen} onOpenChange={setIsAttributesOpen}>
            <CollapsibleTrigger className="flex w-full items-center justify-between hover:opacity-80 transition-opacity">
              <h2 className="text-lg font-semibold text-foreground">Attributes</h2>
              <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${isAttributesOpen ? 'rotate-180' : ''}`} />
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-4">
              <FormField
                control={form.control}
                name="year_acquired"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Year Acquired</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="e.g., 1950"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                        value={field.value ?? ""}
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
                    <FormLabel>Origin</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Paris, France" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CollapsibleContent>
          </Collapsible>
        </section>

        <section className="space-y-6 my-6">
          <div className="flex items-center justify-between px-6 lg:px-8">
            <h2 className="text-lg font-semibold text-foreground">Media Items</h2>
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
                if (isAudioFile(url)) {
                  return (
                    <div key={url} className="space-y-3 px-6 lg:px-8">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold">Audio Recording {audioFiles.length > 1 ? `${audioFiles.indexOf(url) + 1}` : ''}</h3>
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
                      <AudioPlayer src={url} title="Audio Recording" />
                    </div>
                  )
                } else if (isVideoFile(url)) {
                  const isSelectedThumbnail = selectedThumbnailUrl === url
                  return (
                    <div key={url} className="space-y-3">
                      <div className="flex items-center justify-between px-6 lg:px-8">
                        <h3 className="text-sm font-semibold">Video {videoFiles.length > 1 ? `${videoFiles.indexOf(url) + 1}` : ''}</h3>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSelectThumbnail(url)}
                            className={isSelectedThumbnail ? "text-yellow-500" : "text-muted-foreground hover:text-yellow-500"}
                            title="Set as thumbnail"
                          >
                            <Star className={`h-4 w-4 ${isSelectedThumbnail ? "fill-current" : ""}`} />
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
                    </div>
                  )
                } else {
                  const isSelectedThumbnail = selectedThumbnailUrl === url
                  return (
                    <div key={url} className="space-y-3">
                      <div className="flex items-center justify-between px-6 lg:px-8">
                        <h3 className="text-sm font-semibold">Photo {imageFiles.length > 1 ? `${imageFiles.indexOf(url) + 1}` : ''}</h3>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSelectThumbnail(url)}
                            className={isSelectedThumbnail ? "text-yellow-500" : "text-muted-foreground hover:text-yellow-500"}
                            title="Set as thumbnail"
                          >
                            <Star className={`h-4 w-4 ${isSelectedThumbnail ? "fill-current" : ""}`} />
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
                      <div className="w-full max-w-full overflow-hidden">
                        <img
                          src={getDetailUrl(url) || url}
                          alt={`Photo ${imageFiles.indexOf(url) + 1}`}
                          className="w-full h-auto"
                          crossOrigin="anonymous"
                        />
                      </div>
                    </div>
                  )
                }
              })}
            </div>
          ) : (
            <div className="min-h-[200px] rounded-lg border bg-muted/30 flex items-center justify-center mx-6 lg:mx-8">
              <p className="text-sm text-muted-foreground">No media available. Click "Add Media" to get started.</p>
            </div>
          )}
        </section>

        <section className="space-y-2 px-6 lg:px-8">
          <Collapsible open={isProvenanceOpen} onOpenChange={setIsProvenanceOpen}>
            <CollapsibleTrigger className="flex w-full items-center justify-between hover:opacity-80 transition-opacity">
              <h2 className="text-lg font-semibold text-foreground">Provenance</h2>
              <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${isProvenanceOpen ? 'rotate-180' : ''}`} />
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

        <input type="hidden" {...form.register("collectionId")} value={collectionId || ""} />

        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 mx-6 lg:mx-8">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <div className="flex gap-3 px-6 lg:px-8 pb-[240px]">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Creating..." : "Create Artifact"}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/collections">Cancel</Link>
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
