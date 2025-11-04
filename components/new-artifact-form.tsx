"use client"

import type React from "react"
import { createArtifact } from "@/lib/actions/artifacts"
import { generateCloudinarySignature, generateCloudinaryAudioSignature } from "@/lib/actions/cloudinary"
import { createArtifactSchema } from "@/lib/schemas"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import type { z } from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import Link from "next/link"
import { useState } from "react"
import { X, Upload, ImageIcon } from "lucide-react"
import { AudioRecorder } from "@/components/audio-recorder"

type FormData = z.infer<typeof createArtifactSchema>

export function NewArtifactForm({
  collectionId,
  userId,
}: {
  collectionId?: string
  userId: string
}) {
  const [error, setError] = useState<string | null>(null)
  const [uploadedImages, setUploadedImages] = useState<string[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [isUploadingAudio, setIsUploadingAudio] = useState(false)

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

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return

    const MAX_FILE_SIZE = 15 * 1024 * 1024 // 15MB per file
    const oversizedFiles = Array.from(files).filter((file) => file.size > MAX_FILE_SIZE)

    if (oversizedFiles.length > 0) {
      const fileNames = oversizedFiles.map((f) => f.name).join(", ")
      setError(`The following files are too large (max 15MB): ${fileNames}`)
      e.target.value = ""
      return
    }

    const totalSize = Array.from(files).reduce((sum, file) => sum + file.size, 0)
    const MAX_TOTAL_SIZE = 30 * 1024 * 1024 // 30MB total

    if (totalSize > MAX_TOTAL_SIZE) {
      setError("Total file size exceeds 30MB. Please upload fewer or smaller images.")
      e.target.value = ""
      return
    }

    setIsUploading(true)
    setError(null)

    try {
      const urls: string[] = []

      // Upload files one at a time to avoid overwhelming the server
      for (const file of Array.from(files)) {
        console.log("[v0] Uploading file:", file.name, "Size:", file.size)

        // Get signature from server
        const signatureResult = await generateCloudinarySignature(userId, file.name)

        if (signatureResult.error || !signatureResult.signature) {
          throw new Error(signatureResult.error || "Failed to generate upload signature")
        }

        // Upload directly to Cloudinary from client
        const formData = new FormData()
        formData.append("file", file)
        formData.append("api_key", signatureResult.apiKey!)
        formData.append("timestamp", signatureResult.timestamp!.toString())
        formData.append("signature", signatureResult.signature)
        formData.append("public_id", signatureResult.publicId!)

        const uploadUrl = `https://api.cloudinary.com/v1_1/${signatureResult.cloudName}/image/upload`

        console.log("[v0] Uploading to Cloudinary:", uploadUrl)

        const response = await fetch(uploadUrl, {
          method: "POST",
          body: formData,
        })

        if (!response.ok) {
          const errorData = await response.json()
          console.error("[v0] Cloudinary upload error:", errorData)
          throw new Error(`Failed to upload ${file.name}: ${errorData.error?.message || "Unknown error"}`)
        }

        const data = await response.json()
        console.log("[v0] Successfully uploaded to Cloudinary:", data.secure_url)
        urls.push(data.secure_url)
      }

      const newImages = [...uploadedImages, ...urls]
      setUploadedImages(newImages)
      form.setValue("media_urls", newImages)
    } catch (err) {
      console.error("[v0] Upload error:", err)
      setError(
        err instanceof Error
          ? err.message
          : "Failed to upload images. Please try with smaller files or fewer images at once.",
      )
    } finally {
      setIsUploading(false)
      // Reset file input
      e.target.value = ""
    }
  }

  function removeImage(index: number) {
    const newImages = uploadedImages.filter((_, i) => i !== index)
    setUploadedImages(newImages)
    form.setValue("media_urls", newImages)
  }

  async function handleAudioRecorded(audioBlob: Blob, fileName: string) {
    setIsUploadingAudio(true)
    setError(null)

    try {
      console.log("[v0] Uploading audio:", fileName, "Size:", audioBlob.size)

      const signatureResult = await generateCloudinaryAudioSignature(userId, fileName)

      if (signatureResult.error || !signatureResult.signature) {
        throw new Error(signatureResult.error || "Failed to generate upload signature")
      }

      const formData = new FormData()
      formData.append("file", audioBlob, fileName)
      formData.append("public_id", signatureResult.publicId!)
      formData.append("timestamp", signatureResult.timestamp!.toString())
      formData.append("api_key", signatureResult.apiKey!)
      formData.append("signature", signatureResult.signature)

      const uploadUrl = `https://api.cloudinary.com/v1_1/${signatureResult.cloudName}/video/upload`

      console.log("[v0] Uploading audio to Cloudinary:", uploadUrl)
      console.log("[v0] Upload params:", {
        publicId: signatureResult.publicId,
        timestamp: signatureResult.timestamp,
        signature: signatureResult.signature,
      })

      const response = await fetch(uploadUrl, {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error("[v0] Cloudinary audio upload error:", errorData)
        throw new Error(`Failed to upload audio: ${errorData.error?.message || "Unknown error"}`)
      }

      const data = await response.json()
      console.log("[v0] Successfully uploaded audio to Cloudinary:", data.secure_url)

      setAudioUrl(data.secure_url)
      const newMediaUrls = [...uploadedImages, data.secure_url]
      form.setValue("media_urls", newMediaUrls)
    } catch (err) {
      console.error("[v0] Audio upload error:", err)
      setError(err instanceof Error ? err.message : "Failed to upload audio. Please try again.")
    } finally {
      setIsUploadingAudio(false)
    }
  }

  function removeAudio() {
    setAudioUrl(null)
    form.setValue("media_urls", uploadedImages)
  }

  async function onSubmit(data: FormData) {
    console.log("[v0] Submitting artifact:", data)
    setError(null)
    const result = await createArtifact(data)

    if (result?.error) {
      console.log("[v0] Artifact creation error:", result)
      if (result.fieldErrors) {
        // Set field-specific errors
        Object.entries(result.fieldErrors).forEach(([field, messages]) => {
          if (messages && messages.length > 0) {
            form.setError(field as keyof FormData, {
              type: "server",
              message: messages[0],
            })
          }
        })
      } else {
        // Set general error if no field-specific errors
        setError(result.error)
      }
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="Enter artifact title" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea placeholder="Tell the story of this heirloom" rows={4} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="year_acquired"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Year Acquired (Optional)</FormLabel>
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
              <FormLabel>Origin (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Paris, France" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {!collectionId && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
            <p className="text-sm text-destructive">
              Artifacts must be associated with a collection. Please navigate to a collection and use the "Add Artifact"
              button.
            </p>
          </div>
        )}

        <input type="hidden" {...form.register("collectionId")} value={collectionId || ""} />

        <div className="space-y-3">
          <FormLabel>Photos</FormLabel>

          {/* Upload button */}
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
            <FormDescription className="!mt-0">Upload photos (max 15MB per file, 30MB total)</FormDescription>
          </div>

          {/* Image previews */}
          {uploadedImages.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {uploadedImages.map((url, index) => (
                <div key={index} className="group relative aspect-square overflow-hidden rounded-lg border bg-muted">
                  <img
                    src={url || "/placeholder.svg"}
                    alt={`Upload ${index + 1}`}
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute right-1 top-1 rounded-full bg-destructive p-1 text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {uploadedImages.length === 0 && !isUploading && (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
              <ImageIcon className="mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No photos uploaded yet</p>
            </div>
          )}
        </div>

        {/* Audio recording section */}
        <div className="space-y-3">
          <FormLabel>Audio Recording (Optional)</FormLabel>
          <FormDescription>Record audio to accompany this artifact</FormDescription>

          {!audioUrl && (
            <AudioRecorder onAudioRecorded={handleAudioRecorded} disabled={isUploadingAudio || isUploading} />
          )}

          {isUploadingAudio && (
            <div className="rounded-lg border border-dashed p-4 text-center">
              <p className="text-sm text-muted-foreground">Uploading audio...</p>
            </div>
          )}

          {audioUrl && !isUploadingAudio && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 rounded-lg border p-3">
                <audio src={audioUrl} controls className="flex-1" />
                <Button type="button" variant="ghost" size="icon" onClick={removeAudio}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Audio recording attached</p>
            </div>
          )}
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <div className="flex gap-3">
          <Button
            type="submit"
            disabled={form.formState.isSubmitting || !collectionId || isUploading || isUploadingAudio}
          >
            {form.formState.isSubmitting ? "Creating..." : "Create Artifact"}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/collections">Cancel</Link>
          </Button>
        </div>
      </form>
    </Form>
  )
}
