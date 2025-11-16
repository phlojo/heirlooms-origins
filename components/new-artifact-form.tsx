"use client"

import type React from "react"
import { createArtifact } from "@/lib/actions/artifacts"
import { generateCloudinarySignature } from "@/lib/actions/cloudinary"
import { createArtifactSchema } from "@/lib/schemas"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import type { z } from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import Link from "next/link"
import { useState, useEffect, useRef } from "react"
import { ChevronDown, Plus, X } from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { AddMediaModal } from "@/components/add-media-modal"
import { normalizeMediaUrls, isAudioUrl, isVideoUrl, isImageUrl } from "@/lib/media"
import { deleteCloudinaryMedia, extractPublicIdFromUrl } from "@/lib/actions/cloudinary"
import MediaImage from "@/components/media-image"
import { TranscriptionInput } from "@/components/transcription-input"
import { useSupabase } from "@/lib/supabase/browser-context"

type FormData = z.infer<typeof createArtifactSchema>

export function NewArtifactForm({
  collectionId,
  userId,
}: {
  collectionId?: string
  userId: string
}) {
  const [error, setError] = useState<string | null>(null)
  const [isAttributesOpen, setIsAttributesOpen] = useState(false)
  const [isAddMediaOpen, setIsAddMediaOpen] = useState(false)
  const [uploadedMediaUrls, setUploadedMediaUrls] = useState<string[]>([])
  const hasNavigatedRef = useRef(false)

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
      if (!hasNavigatedRef.current && uploadedMediaUrls.length > 0) {
        console.log("[v0] Cleaning up abandoned media:", uploadedMediaUrls.length, "files")
        // Cleanup in background - don't await
        uploadedMediaUrls.forEach(async (url) => {
          const publicId = await extractPublicIdFromUrl(url)
          if (publicId) {
            await deleteCloudinaryMedia(publicId)
          }
        })
      }
    }
  }, [uploadedMediaUrls])

  const getMediaUrls = () => {
    const urls = form.getValues("media_urls")
    return Array.isArray(urls) ? urls : []
  }

  const getImageUrls = () => getMediaUrls().filter((url) => isImageUrl(url))
  const getVideoUrls = () => getMediaUrls().filter((url) => isVideoUrl(url))
  const getAudioUrls = () => getMediaUrls().filter((url) => isAudioUrl(url))

  const handleCaptionGenerated = (imageUrl: string, caption: string) => {
    console.log("[v0] Caption generated for", imageUrl, ":", caption)
    // Could store captions in form state if needed for display before submission
  }

  async function onSubmit(data: FormData) {
    console.log("[v0] Form submit triggered with data:", data)
    const normalizedUrls = normalizeMediaUrls(data.media_urls || [])
    console.log("[v0] Normalized URLs (order preserved):", normalizedUrls)

    const submitData = {
      ...data,
      media_urls: normalizedUrls,
    }

    setError(null)

    try {
      hasNavigatedRef.current = true // Mark as navigating to prevent cleanup
      const result = await createArtifact(submitData)
      console.log("[v0] Create artifact result:", result)

      if (result?.error) {
        hasNavigatedRef.current = false // Reset if error
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
    } catch (error) {
      hasNavigatedRef.current = false // Reset if error
      console.log("[v0] Create artifact error:", error)
      if (error instanceof Error && error.message === "NEXT_REDIRECT") {
        return
      }
      setError(error instanceof Error ? error.message : "An unexpected error occurred")
    }
  }

  const uploadedImages = getImageUrls()
  const uploadedVideos = getVideoUrls()
  const uploadedAudio = getAudioUrls()
  const totalMediaCount = uploadedImages.length + uploadedVideos.length + uploadedAudio.length

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-0">
        <div className="px-6 lg:px-8 pb-6 border-b">
          <h1 className="text-3xl font-bold tracking-tight mb-6">New Artifact</h1>
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Title</FormLabel>
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
        </div>

        <div className="px-6 lg:px-8 py-6 border-b">
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
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
        </div>

        <div className="px-6 lg:px-8 py-6 border-b">
          <Collapsible open={isAttributesOpen} onOpenChange={setIsAttributesOpen}>
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="flex w-full items-center justify-between text-left group py-1"
              >
                <h2 className="text-xl font-semibold">Attributes</h2>
                <ChevronDown
                  className={`h-5 w-5 text-muted-foreground transition-all group-hover:text-foreground ${
                    isAttributesOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-6 pt-6">
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
        </div>

        <div className="py-6 border-b">
          <div className="px-6 lg:px-8 flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Media Items</h2>
            <Button
              type="button"
              className="bg-purple-600 hover:bg-purple-700 text-white"
              size="sm"
              onClick={() => setIsAddMediaOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Media
            </Button>
          </div>

          <AddMediaModal
            open={isAddMediaOpen}
            onOpenChange={setIsAddMediaOpen}
            artifactId={null}
            userId={userId}
            onMediaAdded={(newUrls) => {
              console.log("[v0] onMediaAdded called with newUrls:", newUrls)
              const currentUrls = getMediaUrls()
              console.log("[v0] Current media_urls:", currentUrls)
              const combined = normalizeMediaUrls([...currentUrls, ...newUrls])
              console.log("[v0] Combined and normalized (order preserved):", combined)
              form.setValue("media_urls", combined)
              // Track for cleanup
              setUploadedMediaUrls(prev => [...prev, ...newUrls])
            }}
          />

          {totalMediaCount === 0 ? (
            <div className="px-6 lg:px-8">
              <div className="rounded-lg border-2 border-dashed border-muted-foreground/25 p-12 text-center">
                <p className="text-sm text-muted-foreground">
                  No media items yet. Click "Add Media" to upload photos, videos, or audio.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              {getMediaUrls().map((url) => {
                const isImage = isImageUrl(url)
                const isVideo = isVideoUrl(url)
                const isAudio = isAudioUrl(url)

                return (
                  <div key={url}>
                    {isImage && (
                      <>
                        <MediaImage
                          src={url}
                          alt="Photo"
                          className="w-full h-auto"
                        />
                        <div className="px-6 lg:px-8 pt-3 flex items-center justify-between">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Photo
                          </p>
                          <GenerateImageCaptionButton
                            artifactId="temp" 
                            imageUrl={url}
                            onCaptionGenerated={handleCaptionGenerated}
                          />
                        </div>
                      </>
                    )}
                    {isVideo && (
                      <>
                        <video
                          src={url}
                          controls
                          className="w-full h-auto bg-black"
                          crossOrigin="anonymous"
                        />
                        <div className="px-6 lg:px-8 pt-3">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Video
                          </p>
                        </div>
                      </>
                    )}
                    {isAudio && (
                      <div className="px-6 lg:px-8">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                          Audio
                        </p>
                        <audio
                          src={url}
                          controls
                          className="w-full"
                          crossOrigin="anonymous"
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="px-6 lg:px-8 py-6 border-b">
          <p className="text-sm text-muted-foreground italic">
            Provenance details will be available after creation
          </p>
        </div>

        <input type="hidden" {...form.register("collectionId")} value={collectionId || ""} />

        <div className="px-6 lg:px-8 py-6">
          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 mb-6">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <div className="flex gap-3">
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Creating..." : "Create Artifact"}
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link href="/collections">Cancel</Link>
            </Button>
          </div>
        </div>
      </form>
    </Form>
  )
}
