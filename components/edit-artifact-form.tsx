"use client"

import type React from "react"
import { updateArtifact } from "@/lib/actions/artifacts"
import { generateCloudinarySignature, extractPublicIdFromUrl } from "@/lib/actions/cloudinary"
import { trackPendingUpload, markUploadsAsSaved, cleanupPendingUploads } from "@/lib/actions/pending-uploads"
import { updateArtifactSchema } from "@/lib/schemas"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import type { z } from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { TranscriptionInput } from "@/components/transcription-input"
import { useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from "react"
import { X, Upload, ImageIcon, Loader2, Star } from 'lucide-react'
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle2 } from 'lucide-react'
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
import { normalizeMediaUrls, getFileSizeLimit, formatFileSize, isImageUrl, isVideoUrl } from "@/lib/media"

type FormData = z.infer<typeof updateArtifactSchema>

interface EditArtifactFormProps {
  artifact: {
    id: string
    title: string
    description?: string
    year_acquired?: number
    origin?: string
    media_urls?: string[]
    thumbnail_url?: string | null
  }
  userId: string
}

export function EditArtifactForm({ artifact, userId }: EditArtifactFormProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false)
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null)
  const [selectedThumbnailUrl, setSelectedThumbnailUrl] = useState<string | null>(artifact.thumbnail_url || null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const newlyUploadedUrlsRef = useRef<string[]>([])

  const form = useForm<FormData>({
    resolver: zodResolver(updateArtifactSchema),
    defaultValues: {
      id: artifact.id,
      title: artifact.title,
      description: artifact.description || "",
      year_acquired: artifact.year_acquired,
      origin: artifact.origin || "",
      media_urls: artifact.media_urls || [],
      thumbnail_url: artifact.thumbnail_url || null,
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
        e.returnValue = ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges, success])

  const handleCancel = async () => {
    if (hasUnsavedChanges) {
      setShowUnsavedDialog(true)
      setPendingNavigation('back')
    } else {
      router.back()
    }
  }

  const handleConfirmNavigation = async () => {
    console.log("[v0] User confirmed cancel - cleaning up pending uploads")
    
    const result = await cleanupPendingUploads()
    if (result.error) {
      console.error("[v0] Cleanup failed:", result.error)
    } else {
      console.log(`[v0] Cleanup complete: ${result.deletedCount} files deleted`)
    }
    
    setShowUnsavedDialog(false)
    if (pendingNavigation === 'back') {
      router.back()
    } else if (pendingNavigation) {
      router.push(pendingNavigation)
    }
    setPendingNavigation(null)
  }

  const handleCancelNavigation = () => {
    setShowUnsavedDialog(false)
    setPendingNavigation(null)
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    const oversizedFiles = files.filter((file) => {
      const limit = getFileSizeLimit(file)
      return file.size > limit
    })

    if (oversizedFiles.length > 0) {
      const fileErrors = oversizedFiles.map((f) => 
        `${f.name} (${formatFileSize(f.size)}, max: ${formatFileSize(getFileSizeLimit(f))})`
      ).join(", ")
      setError(`The following files are too large: ${fileErrors}`)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
      return
    }

    const totalSize = files.reduce((sum, file) => sum + file.size, 0)
    const MAX_TOTAL_SIZE = 1000 * 1024 * 1024

    if (totalSize > MAX_TOTAL_SIZE) {
      setError("Total file size exceeds 1GB. Please upload fewer or smaller files.")
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
      return
    }

    const handleMediaUpload = async (files: FileList | null) => {
      if (!files) return

      const currentUrls = form.getValues("media_urls") || []
      const newUrls: string[] = []

      try {
        setIsUploading(true)
        setError("")

        const uploadPromises = Array.from(files).map(async (file) => {
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
          newUrls.push(data.secure_url)
          
          console.log('[v0] EDIT FORM: Uploaded file to Cloudinary:', data.secure_url)
          
          const resourceType = file.type.startsWith('image/') ? 'image' 
            : file.type.startsWith('video/') ? 'video' 
            : 'raw'
          
          console.log('[v0] EDIT FORM: Tracking upload with resourceType:', resourceType)
          const trackResult = await trackPendingUpload(data.secure_url, resourceType)
          
          if (trackResult.error) {
            console.error('[v0] EDIT FORM: Failed to track upload:', trackResult.error)
          } else {
            console.log('[v0] EDIT FORM: Successfully tracked upload in pending_uploads table')
          }
        })

        await Promise.all(uploadPromises)

        form.setValue("media_urls", [...currentUrls, ...newUrls])
        newlyUploadedUrlsRef.current.push(...newUrls)
        setHasUnsavedChanges(true)
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to upload images. Please try with smaller files or fewer images at once.",
        )
      } finally {
        setIsUploading(false)
        if (fileInputRef.current) {
          fileInputRef.current.value = ""
        }
      }
    }

    await handleMediaUpload(files)
  }

  const removeImage = (index: number): void => {
    const currentUrls = form.getValues("media_urls")
    const urlsArray = Array.isArray(currentUrls) ? currentUrls : []
    const urlToRemove = urlsArray[index]
    const newImages = urlsArray.filter((_, i) => i !== index)
    form.setValue("media_urls", normalizeMediaUrls(newImages))
    
    if (selectedThumbnailUrl === urlToRemove) {
      const newThumbnail = newImages.find(url => isImageUrl(url) || isVideoUrl(url))
      setSelectedThumbnailUrl(newThumbnail || null)
    }
  }

  const handleSelectThumbnail = (url: string) => {
    setSelectedThumbnailUrl(url)
    setHasUnsavedChanges(true)
  }

  const onSubmit = async (values: FormData) => {
    try {
      setError(null)

      const submitValues = {
        ...values,
        thumbnail_url: selectedThumbnailUrl,
      }

      const result = await updateArtifact(submitValues, artifact.media_urls || [])

      if (result.error) {
        setError(result.error)
      } else {
        console.log('[v0] EDIT FORM: Artifact updated successfully, pending uploads cleaned up server-side')
        
        setSuccess(true)
        setHasUnsavedChanges(false)
        
        setTimeout(() => {
          router.push(`/artifacts/${result.slug}`)
        }, 1500)
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to update artifact. Please try again later.",
      )
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
                    placeholder="Tell the story of this heirloom"
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
                    onChange={handleUpload}
                    className="hidden"
                    disabled={isUploading}
                    ref={fileInputRef}
                  />
                </label>
              </Button>
              <FormDescription className="!mt-0">Upload photos (max 15MB per file, 30MB total)</FormDescription>
            </div>

            {uploadedImages.length > 0 && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {uploadedImages.map((url) => {
                  const canBeThumbnail = isImageUrl(url) || isVideoUrl(url)
                  const isSelectedThumbnail = selectedThumbnailUrl === url
                  
                  return (
                    <div key={url} className="group relative aspect-square overflow-hidden rounded-lg border bg-muted">
                      <img
                        src={url || "/placeholder.svg"}
                        alt={`Upload ${url}`}
                        className="h-full w-full object-cover"
                      />
                      {canBeThumbnail && (
                        <button
                          type="button"
                          onClick={() => handleSelectThumbnail(url)}
                          className={`absolute left-2 top-2 rounded-full p-1.5 shadow-md transition-all ${
                            isSelectedThumbnail 
                              ? "bg-yellow-500 text-white scale-110" 
                              : "bg-white/90 text-gray-600 hover:bg-yellow-100 hover:text-yellow-600"
                          }`}
                          title={isSelectedThumbnail ? "Selected as thumbnail" : "Set as thumbnail"}
                        >
                          <Star className={`h-4 w-4 ${isSelectedThumbnail ? "fill-current" : ""}`} />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => removeImage(uploadedImages.indexOf(url))}
                        className="absolute right-2 top-2 rounded-full bg-destructive p-1.5 text-destructive-foreground shadow-md transition-transform hover:scale-110"
                        title="Delete this photo"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}

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
              onClick={handleCancel}
              disabled={form.formState.isSubmitting || isUploading}
              className="flex-1"
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
            <AlertDialogCancel onClick={handleCancelNavigation}>Stay on Page</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmNavigation}>Leave Without Saving</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
