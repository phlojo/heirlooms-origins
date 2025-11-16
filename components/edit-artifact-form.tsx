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
import { useRouter } from 'next/navigation'
import { useState, useEffect } from "react"
import { X, Upload, ImageIcon, Loader2 } from 'lucide-react'
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle2 } from 'lucide-react'
import { useToast } from "@/hooks/use-toast"
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
import { normalizeMediaUrls, getFileSizeLimit, formatFileSize } from "@/lib/media"

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
  const [isUploading, setIsUploading] = useState(false)
  const [success, setSuccess] = useState(false)
  const { toast } = useToast()
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false)
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null)

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

  useEffect(() => {
    const subscription = form.watch(() => {
      setHasUnsavedChanges(true)
    })
    return () => subscription.unsubscribe()
  }, [form])

  useEffect(() => {
    const currentUrls = form.getValues("media_urls") || []
    const originalUrls = artifact.media_urls || []
    if (JSON.stringify(originalUrls) !== JSON.stringify(currentUrls)) {
      setHasUnsavedChanges(true)
    }
  }, [form.watch("media_urls"), artifact.media_urls])

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges && !success) {
        e.preventDefault()
        e.returnValue = ""
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [hasUnsavedChanges, success])

  const handleNavigation = (path: string) => {
    if (hasUnsavedChanges && !success) {
      setPendingNavigation(path)
      setShowUnsavedDialog(true)
    } else {
      router.push(path)
    }
  }

  const confirmNavigation = () => {
    if (pendingNavigation) {
      router.push(pendingNavigation)
    }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
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
    const MAX_TOTAL_SIZE = 1000 * 1024 * 1024 // 1GB total for batch uploads

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
        console.log("[v0] Uploading file:", file.name, "Size:", file.size)

        const signatureResult = await generateCloudinarySignature(userId, file.name)

        if (signatureResult.error || !signatureResult.signature) {
          throw new Error(signatureResult.error || "Failed to generate upload signature")
        }

        console.log("[v0] Using public_id:", signatureResult.publicId)

        const formData = new FormData()
        formData.append("file", file)
        formData.append("api_key", signatureResult.apiKey!)
        formData.append("timestamp", signatureResult.timestamp!.toString())
        formData.append("signature", signatureResult.signature)
        formData.append("public_id", signatureResult.publicId!)

        // Add eager transformation if provided
        if (signatureResult.eager) {
          formData.append("eager", signatureResult.eager)
        }

        const uploadUrl = `https://api.cloudinary.com/v1_1/${signatureResult.cloudName}/image/upload`

        console.log("[v0] Uploading to Cloudinary:", uploadUrl)

        const response = await fetch(uploadUrl, {
          method: "POST",
          body: formData,
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.error("[v0] Cloudinary upload failed:", {
            status: response.status,
            statusText: response.statusText,
            body: errorText,
          })

          let errorData
          try {
            errorData = JSON.parse(errorText)
          } catch {
            throw new Error(`Upload failed (${response.status}): ${errorText.substring(0, 100)}`)
          }

          throw new Error(`Failed to upload ${file.name}: ${errorData.error?.message || "Unknown error"}`)
        }

        const data = await response.json()
        console.log("[v0] Successfully uploaded to Cloudinary:", data.secure_url, "public_id:", data.public_id)
        urls.push(data.secure_url)
      }

      const currentUrls = form.getValues("media_urls") || []
      const urlsArray = Array.isArray(currentUrls) ? currentUrls : []
      form.setValue("media_urls", normalizeMediaUrls([...urlsArray, ...urls]))
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
    const currentUrls = form.getValues("media_urls")
    const urlsArray = Array.isArray(currentUrls) ? currentUrls : []
    const newImages = urlsArray.filter((_, i) => i !== index)
    form.setValue("media_urls", normalizeMediaUrls(newImages))
  }

  async function onSubmit(data: FormData) {
    setError(null)

    const normalizedUrls = normalizeMediaUrls(data.media_urls || [])

    const submitData = {
      ...data,
      media_urls: normalizedUrls,
      year_acquired: data.year_acquired || undefined,
    }

    console.log("[v0] Submitting artifact update with", normalizedUrls.length, "media URLs")

    const result = await updateArtifact(submitData, artifact.media_urls || [])

    if (result?.success) {
      setSuccess(true)
      setHasUnsavedChanges(false)
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

  const uploadedImages = form.watch("media_urls") || []

  return (
    <>
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
                {uploadedImages.map((url) => (
                  <div key={url} className="group relative aspect-square overflow-hidden rounded-lg border bg-muted">
                    <img
                      src={url || "/placeholder.svg"}
                      alt={`Upload ${url}`}
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(uploadedImages.indexOf(url))}
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
              onClick={() => handleNavigation(`/artifacts/${artifact.id}`)}
              disabled={form.formState.isSubmitting || isUploading}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Form>

      <AlertDialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Are you sure you want to leave? Your changes will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingNavigation(null)}>Stay on Page</AlertDialogCancel>
            <AlertDialogAction onClick={confirmNavigation}>Leave Without Saving</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
