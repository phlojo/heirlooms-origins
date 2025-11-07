"use client"

import type React from "react"

import { updateArtifact } from "@/lib/actions/artifacts"
import { generateCloudinarySignature } from "@/lib/actions/cloudinary"
import { updateArtifactSchema } from "@/lib/schemas"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import type { z } from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { X, Upload, ImageIcon, Loader2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

type FormData = z.infer<typeof updateArtifactSchema>

interface EditArtifactFormProps {
  artifact: {
    id: string
    title: string
    description?: string
    year_acquired?: number
    origin?: string
    media_urls?: string[]
  }
  userId: string
}

export function EditArtifactForm({ artifact, userId }: EditArtifactFormProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [uploadedImages, setUploadedImages] = useState<string[]>(artifact.media_urls || [])
  const [isUploading, setIsUploading] = useState(false)
  const [success, setSuccess] = useState(false)
  const { toast } = useToast()

  const form = useForm<FormData>({
    resolver: zodResolver(updateArtifactSchema),
    defaultValues: {
      id: artifact.id,
      title: artifact.title,
      description: artifact.description || "",
      year_acquired: artifact.year_acquired,
      origin: artifact.origin || "",
      media_urls: artifact.media_urls || [],
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

        const uploadUrl = `https://api.cloudinary.com/v1_1/${signatureResult.cloudName}/image/upload`

        const response = await fetch(uploadUrl, {
          method: "POST",
          body: formData,
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(`Failed to upload ${file.name}: ${errorData.error?.message || "Unknown error"}`)
        }

        const data = await response.json()
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
      e.target.value = ""
    }
  }

  function removeImage(index: number) {
    const newImages = uploadedImages.filter((_, i) => i !== index)
    setUploadedImages(newImages)
    form.setValue("media_urls", newImages)
  }

  async function onSubmit(data: FormData) {
    setError(null)

    const submitData = {
      ...data,
      year_acquired: data.year_acquired || undefined,
    }

    const result = await updateArtifact(submitData, artifact.media_urls || [])

    if (result?.success) {
      setSuccess(true)
      // Redirect after a short delay to show success message
      setTimeout(() => {
        router.push(`/artifacts/${artifact.id}`)
        router.refresh()
      }, 1500)
    } else if (result?.error) {
      if (result.fieldErrors) {
        Object.entries(result.fieldErrors).forEach(([field, messages]) => {
          if (messages && messages.length > 0) {
            form.setError(field as keyof FormData, {
              type: "server",
              message: messages[0],
            })
          }
        })
      } else {
        setError(result.error)
      }
    }
  }

  if (success) {
    return (
      <Alert className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950">
        <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
        <AlertDescription className="text-green-800 dark:text-green-200">
          <strong className="font-semibold">Artifact updated successfully!</strong>
          <p className="mt-1">Redirecting...</p>
        </AlertDescription>
      </Alert>
    )
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

        <div className="space-y-3">
          <FormLabel>Photos</FormLabel>

          {/* Upload button */}
          <div className="flex items-center gap-3">
            <label className="cursor-pointer">
              <Button type="button" variant="outline" disabled={isUploading} asChild>
                <span>
                  <Upload className="mr-2 h-4 w-4" />
                  {isUploading ? "Uploading..." : "Upload Photos"}
                </span>
              </Button>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="hidden"
                disabled={isUploading}
              />
            </label>
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
                    className="absolute right-2 top-2 rounded-full bg-destructive p-1.5 text-destructive-foreground shadow-md transition-transform hover:scale-110"
                    title="Delete this photo"
                  >
                    <X className="h-4 w-4" />
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

        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <div className="flex gap-3">
          <Button type="submit" disabled={form.formState.isSubmitting || isUploading}>
            {form.formState.isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/artifacts/${artifact.id}`)}
            disabled={form.formState.isSubmitting || isUploading}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  )
}
