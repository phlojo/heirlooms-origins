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
import { useState } from "react"
import { ChevronDown, Upload, X, ImageIcon } from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { normalizeMediaUrls, getFileSizeLimit, formatFileSize } from "@/lib/media"
import MediaImage from "@/components/media-image"
import { TranscriptionInput } from "@/components/transcription-input"
import { generateCloudinarySignature } from "@/lib/actions/cloudinary"

type FormData = z.infer<typeof createArtifactSchema>

interface NewArtifactFormProps {
  collectionId?: string
  userId: string
}

export function NewArtifactForm({ collectionId, userId }: NewArtifactFormProps) {
  const [error, setError] = useState<string | null>(null)
  const [isAttributesOpen, setIsAttributesOpen] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

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

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const files = e.target.files
    if (!files || files.length === 0) return

    const oversizedFiles = Array.from(files).filter((file) => {
      const limit = getFileSizeLimit(file)
      return file.size > limit
    })

    if (oversizedFiles.length > 0) {
      const fileErrors = oversizedFiles.map((f) => 
        `${f.name} (${formatFileSize(f.size)}, max: ${formatFileSize(getFileSizeLimit(f))})`
      ).join(", ")
      setError(`The following files are too large: ${fileErrors}`)
      e.target.value = ""
      return
    }

    const totalSize = Array.from(files).reduce((sum, file) => sum + file.size, 0)
    const MAX_TOTAL_SIZE = 1000 * 1024 * 1024

    if (totalSize > MAX_TOTAL_SIZE) {
      setError("Total file size exceeds 1GB. Please upload fewer or smaller files.")
      e.target.value = ""
      return
    }

    setIsUploading(true)
    setError(null)

    try {
      const urls: string[] = []

      for (const file of Array.from(files)) {
        const signatureResult = await generateCloudinarySignature(userId, file.name)

        if (signatureResult.error || !signatureResult.signature) {
          throw new Error(signatureResult.error || "Failed to generate upload signature")
        }

        const formData = new FormData()
        formData.append("file", file)
        formData.append("api_key", signatureResult.apiKey!)
        formData.append("timestamp", signatureResult.timestamp!.toString())
        formData.append("signature", signatureResult.signature)
        formData.append("public_id", signatureResult.publicId!)

        if (signatureResult.eager) {
          formData.append("eager", signatureResult.eager)
        }

        const uploadUrl = `https://api.cloudinary.com/v1_1/${signatureResult.cloudName}/image/upload`

        const response = await fetch(uploadUrl, {
          method: "POST",
          body: formData,
        })

        if (!response.ok) {
          const errorText = await response.text()

          let errorData
          try {
            errorData = JSON.parse(errorText)
          } catch {
            throw new Error(`Upload failed (${response.status}): ${errorText.substring(0, 100)}`)
          }

          throw new Error(`Failed to upload ${file.name}: ${errorData.error?.message || "Unknown error"}`)
        }

        const data = await response.json()
        urls.push(data.secure_url)
      }

      const currentUrls = form.getValues("media_urls") || []
      const urlsArray = Array.isArray(currentUrls) ? currentUrls : []
      form.setValue("media_urls", normalizeMediaUrls([...urlsArray, ...urls]))
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to upload images. Please try with smaller files or fewer images at once.",
      )
    } finally {
      setIsUploading(false)
      e.target.value = ""
    }
  }

  function removeImage(index: number): void {
    const currentUrls = form.getValues("media_urls")
    const urlsArray = Array.isArray(currentUrls) ? currentUrls : []
    const newImages = urlsArray.filter((_, i) => i !== index)
    form.setValue("media_urls", normalizeMediaUrls(newImages))
  }

  async function onSubmit(data: FormData): Promise<void> {
    const normalizedUrls = normalizeMediaUrls(data.media_urls || [])

    const submitData = {
      ...data,
      media_urls: normalizedUrls,
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
      }
    } catch (error) {
      if (error instanceof Error && error.message === "NEXT_REDIRECT") {
        return
      }
      setError(error instanceof Error ? error.message : "An unexpected error occurred")
    }
  }

  const uploadedImages = form.watch("media_urls") || []

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

        <div className="px-6 lg:px-8 py-6 border-b">
          <div className="space-y-3">
            <FormLabel>Photos</FormLabel>

            <div className="flex items-center gap-3">
              <Button type="button" variant="outline" disabled={isUploading} asChild>
                <label className="cursor-pointer">
                  <Upload className="mr-2 h-4 w-4" />
                  {isUploading ? "Uploading..." : "Upload Photos"}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={isUploading}
                  />
                </label>
              </Button>
              <FormDescription className="!mt-0">Upload photos (max 50MB per file, 1GB total)</FormDescription>
            </div>

            {uploadedImages.length > 0 && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {uploadedImages.map((url, index) => (
                  <div key={url} className="group relative aspect-square overflow-hidden rounded-lg border bg-muted">
                    <MediaImage
                      src={url}
                      alt={`Upload ${index + 1}`}
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute right-2 top-2 rounded-full bg-destructive p-1.5 text-destructive-foreground shadow-md transition-transform hover:scale-110"
                      aria-label="Remove photo"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {uploadedImages.length === 0 && !isUploading && (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
                <ImageIcon className="mb-2 h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No photos uploaded yet</p>
              </div>
            )}
          </div>
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
            <Button type="submit" disabled={form.formState.isSubmitting || isUploading}>
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
