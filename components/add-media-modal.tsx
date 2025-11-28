"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Camera, Video, Mic, Upload, FolderOpen } from "lucide-react"
import { AudioRecorder } from "@/components/audio-recorder"
import { generateCloudinarySignature, generateCloudinaryAudioSignature } from "@/lib/actions/cloudinary"
import { trackPendingUpload } from "@/lib/actions/pending-uploads"
import { createUserMediaFromUrl } from "@/lib/actions/media"
import { getFileSizeLimit, formatFileSize } from "@/lib/media"
import { Progress } from "@/components/ui/progress"
import { createClient } from "@/lib/supabase/client"
import { MediaPicker } from "@/components/media-picker"
import { type UserMediaWithDerivatives } from "@/lib/types/media"

// Phase 2: Feature flag for storage backend
const USE_SUPABASE_STORAGE = process.env.NEXT_PUBLIC_USE_SUPABASE_STORAGE === "true"

// Debug: Log storage backend on component mount
if (typeof window !== 'undefined') {
  console.log("[add-media-modal] Storage backend:", USE_SUPABASE_STORAGE ? "Supabase" : "Cloudinary", {
    envVar: process.env.NEXT_PUBLIC_USE_SUPABASE_STORAGE
  })
}

interface AddMediaModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  artifactId: string | null
  userId: string
  onMediaAdded: (urls: string[]) => void
}

type MediaType = "photo" | "video" | "audio" | null
type MediaMode = "upload" | "record" | null
type MediaSource = "new" | "existing" | null

interface UploadProgress {
  currentFile: number
  totalFiles: number
  currentFileName: string
  currentFileProgress: number
  estimatedTimeRemaining: number | null
}

export function AddMediaModal({ open, onOpenChange, artifactId, userId, onMediaAdded }: AddMediaModalProps) {
  const [mediaSource, setMediaSource] = useState<MediaSource>(null)
  const [selectedType, setSelectedType] = useState<MediaType>(null)
  const [selectedMode, setSelectedMode] = useState<MediaMode>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null)

  const cameraInputRef = useRef<HTMLInputElement>(null)
  const videoCameraInputRef = useRef<HTMLInputElement>(null)

  const handleReset = () => {
    setMediaSource(null)
    setSelectedType(null)
    setSelectedMode(null)
    setError(null)
    setUploadProgress(null)
  }

  const handleClose = () => {
    handleReset()
    onOpenChange(false)
  }

  const handleTypeSelect = (type: MediaType) => {
    setSelectedType(type)
    setSelectedMode(null)
    setError(null)
  }

  const handleBack = () => {
    if (selectedMode) {
      setSelectedMode(null)
    } else if (selectedType) {
      setSelectedType(null)
    } else if (mediaSource) {
      setMediaSource(null)
    }
  }

  const handleExistingMediaSelected = (selectedMedia: UserMediaWithDerivatives[]) => {
    // Extract URLs from selected media
    const urls = selectedMedia.map((m) => m.public_url)
    onMediaAdded(urls)
    handleClose()
  }

  /**
   * Phase 2: Upload a single file to either Supabase or Cloudinary
   * Routes based on USE_SUPABASE_STORAGE feature flag
   */
  const uploadSingleFile = async (
    file: File,
    onProgress?: (percent: number) => void
  ): Promise<string> => {
    if (USE_SUPABASE_STORAGE) {
      // Phase 2: Direct client-side upload to Supabase Storage
      // Bypasses Next.js entirely to avoid FormData/body parsing issues
      console.log("[v0] Phase 2: Uploading to Supabase Storage (client-side):", {
        name: file.name,
        size: file.size,
        type: file.type,
        sizeMB: (file.size / (1024 * 1024)).toFixed(2) + 'MB',
        artifactId: artifactId || "temp"
      })

      const supabase = createClient()

      // Generate unique filename with timestamp
      const timestamp = Date.now()
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_")
      const folder = artifactId ? `${userId}/${artifactId}` : `${userId}/temp`
      const filePath = `${folder}/${timestamp}-${sanitizedName}`

      console.log("[v0] Uploading to path:", filePath)

      // Upload directly to Supabase Storage from client
      const { data, error: uploadError } = await supabase.storage
        .from("heirlooms-media")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        })

      if (uploadError) {
        console.error("[v0] Supabase upload failed:", uploadError)
        const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2)

        if (uploadError.message?.toLowerCase().includes('payload') ||
            uploadError.message?.toLowerCase().includes('too large') ||
            uploadError.message?.toLowerCase().includes('size')) {
          throw new Error(`File "${file.name}" (${fileSizeMB}MB) exceeds the 50MB limit. Please reduce file size.`)
        }
        throw new Error(uploadError.message || "Upload failed")
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("heirlooms-media")
        .getPublicUrl(data.path)

      console.log("[v0] Supabase upload successful:", publicUrl)

      // Report progress as complete since Supabase client doesn't support progress events
      if (onProgress) {
        onProgress(100)
      }

      return publicUrl
    } else {
      // Current behavior: Upload to Cloudinary with client-side direct upload
      console.log("[v0] Uploading to Cloudinary:", file.name)

      let uploadUrl: string
      let signatureResult: any

      if (selectedType === "audio" || file.type.startsWith("audio/")) {
        signatureResult = await generateCloudinaryAudioSignature(userId, file.name)
        uploadUrl = `https://api.cloudinary.com/v1_1/${signatureResult.cloudName}/video/upload`
      } else if (selectedType === "video" || file.type.startsWith("video/")) {
        signatureResult = await generateCloudinarySignature(userId, file.name)
        uploadUrl = `https://api.cloudinary.com/v1_1/${signatureResult.cloudName}/video/upload`
      } else {
        signatureResult = await generateCloudinarySignature(userId, file.name)
        uploadUrl = `https://api.cloudinary.com/v1_1/${signatureResult.cloudName}/image/upload`
      }

      if (signatureResult.error || !signatureResult.signature) {
        throw new Error(signatureResult.error || "Failed to generate upload signature")
      }

      const formData = new FormData()
      formData.append("file", file)
      formData.append("api_key", signatureResult.apiKey!)
      formData.append("timestamp", signatureResult.timestamp!.toString())
      formData.append("signature", signatureResult.signature)
      formData.append("public_id", signatureResult.publicId!)

      if (selectedType === "audio" || file.type.startsWith("audio/")) {
        formData.append("resource_type", "video")
      } else if (selectedType === "video" || file.type.startsWith("video/")) {
        formData.append("resource_type", "video")
      }

      if (signatureResult.eager) {
        formData.append("eager", signatureResult.eager)
      }

      return new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest()

        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable && onProgress) {
            const percentComplete = (event.loaded / event.total) * 100
            onProgress(percentComplete)
          }
        })

        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const data = JSON.parse(xhr.responseText)
              resolve(data.secure_url)
            } catch (err) {
              reject(new Error("Failed to parse upload response"))
            }
          } else {
            try {
              const errorData = JSON.parse(xhr.responseText)
              reject(new Error(errorData.error?.message || errorData.message || "Unknown error"))
            } catch {
              reject(new Error(`Upload failed (${xhr.status})`))
            }
          }
        })

        xhr.addEventListener("error", () => {
          reject(new Error("Network error during upload"))
        })

        xhr.open("POST", uploadUrl)
        xhr.send(formData)
      })
    }
  }

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const oversizedFiles = Array.from(files).filter((file) => {
      const limit = getFileSizeLimit(file)
      return file.size > limit
    })

    if (oversizedFiles.length > 0) {
      const fileErrors = oversizedFiles
        .map((f) => `${f.name} (${formatFileSize(f.size)}, max: ${formatFileSize(getFileSizeLimit(f))})`)
        .join(", ")
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
      const filesArray = Array.from(files)
      const startTime = Date.now()

      for (let i = 0; i < filesArray.length; i++) {
        const file = filesArray[i]
        const fileStartTime = Date.now()

        setUploadProgress({
          currentFile: i + 1,
          totalFiles: filesArray.length,
          currentFileName: file.name,
          currentFileProgress: 0,
          estimatedTimeRemaining: null,
        })

        console.log("[v0] Uploading file:", file.name, file.type, formatFileSize(file.size))

        // Phase 2: Upload via helper that routes to correct backend
        const secureUrl = await uploadSingleFile(file, (percentComplete) => {
          // Calculate estimated time remaining based on current file progress
          const elapsed = Date.now() - fileStartTime
          const uploadSpeed = (percentComplete / 100) * file.size / elapsed // bytes per ms
          const remaining = file.size - (percentComplete / 100) * file.size
          const estimatedMs = remaining / uploadSpeed

          // Calculate overall time remaining including remaining files
          const filesRemaining = filesArray.length - (i + 1)
          const avgFileSize = totalSize / filesArray.length
          const avgTimePerFile = elapsed / (percentComplete / 100)
          const totalEstimatedMs = estimatedMs + filesRemaining * avgTimePerFile

          setUploadProgress({
            currentFile: i + 1,
            totalFiles: filesArray.length,
            currentFileName: file.name,
            currentFileProgress: Math.round(percentComplete),
            estimatedTimeRemaining: Math.round(totalEstimatedMs / 1000), // convert to seconds
          })
        })
        urls.push(secureUrl)

        const resourceType =
          selectedType === "audio" || file.type.startsWith("audio/")
            ? "raw"
            : selectedType === "video" || file.type.startsWith("video/")
              ? "video"
              : "image"
        await trackPendingUpload(secureUrl, resourceType)

        // Create user_media record immediately so media appears in Media Picker
        // This allows reusing media across artifacts even before current artifact is saved
        const mediaResult = await createUserMediaFromUrl(secureUrl, userId)
        if (mediaResult.error) {
          console.warn("[v0] Failed to create user_media record (non-fatal):", mediaResult.error)
        } else {
          console.log("[v0] Created user_media record for:", secureUrl)
        }
      }

      console.log("[v0] All uploads complete, URLs:", urls)
      onMediaAdded(urls)
      handleClose()
    } catch (err) {
      console.error("[v0] Upload error:", err)
      setError(err instanceof Error ? err.message : "Failed to upload files. Please try again.")
    } finally {
      setIsUploading(false)
      setUploadProgress(null)
      e.target.value = ""
    }
  }

  const handleAudioRecorded = async (audioBlob: Blob, fileName: string) => {
    setIsUploading(true)
    setError(null)
    setUploadProgress({
      currentFile: 1,
      totalFiles: 1,
      currentFileName: fileName,
      currentFileProgress: 0,
      estimatedTimeRemaining: null,
    })

    try {
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
      formData.append("resource_type", "video")

      const uploadUrl = `https://api.cloudinary.com/v1_1/${signatureResult.cloudName}/video/upload`

      const uploadPromise = new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        const startTime = Date.now()

        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            const percentComplete = (event.loaded / event.total) * 100
            const elapsed = Date.now() - startTime
            const uploadSpeed = event.loaded / elapsed
            const remaining = event.total - event.loaded
            const estimatedMs = remaining / uploadSpeed

            setUploadProgress({
              currentFile: 1,
              totalFiles: 1,
              currentFileName: fileName,
              currentFileProgress: Math.round(percentComplete),
              estimatedTimeRemaining: Math.round(estimatedMs / 1000),
            })
          }
        })

        xhr.addEventListener("load", async () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const data = JSON.parse(xhr.responseText)
              console.log("[v0] Upload successful!")
              console.log("[v0] Response data:", {
                public_id: data.public_id,
                secure_url: data.secure_url,
                format: data.format,
                resource_type: data.resource_type,
                width: data.width,
                height: data.height,
              })
              resolve(data.secure_url)
            } catch (err) {
              reject(new Error("Failed to parse upload response"))
            }
          } else {
            try {
              const errorData = JSON.parse(xhr.responseText)
              reject(new Error(`Failed to upload audio: ${errorData.error?.message || "Unknown error"}`))
            } catch {
              reject(new Error(`Audio upload failed (${xhr.status}): ${xhr.responseText.substring(0, 100)}`))
            }
          }
        })

        xhr.addEventListener("error", () => {
          reject(new Error("Network error while uploading audio"))
        })

        xhr.open("POST", uploadUrl)
        xhr.send(formData)
      })

      const secureUrl = await uploadPromise

      await trackPendingUpload(secureUrl, "raw")

      // Create user_media record immediately so media appears in Media Picker
      const mediaResult = await createUserMediaFromUrl(secureUrl, userId)
      if (mediaResult.error) {
        console.warn("[v0] Failed to create user_media record for audio (non-fatal):", mediaResult.error)
      } else {
        console.log("[v0] Created user_media record for audio:", secureUrl)
      }

      onMediaAdded([secureUrl])
      handleClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload audio. Please try again.")
    } finally {
      setIsUploading(false)
      setUploadProgress(null)
    }
  }

  const handleCameraCapture = () => {
    if (cameraInputRef.current) {
      cameraInputRef.current.click()
    }
  }

  const handleVideoCameraCapture = () => {
    if (videoCameraInputRef.current) {
      videoCameraInputRef.current.click()
    }
  }

  const formatTimeRemaining = (seconds: number): string => {
    if (seconds < 60) {
      return `${seconds}s`
    } else if (seconds < 3600) {
      const mins = Math.floor(seconds / 60)
      const secs = seconds % 60
      return `${mins}m ${secs}s`
    } else {
      const hours = Math.floor(seconds / 3600)
      const mins = Math.floor((seconds % 3600) / 60)
      return `${hours}h ${mins}m`
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Media</DialogTitle>
          <DialogDescription>
            {!mediaSource && "Choose how to add media"}
            {mediaSource === "new" && !selectedType && "Step 1: Choose the type of media to add"}
            {mediaSource === "new" && selectedType && !selectedMode && "Step 2: Choose how to add your media"}
            {mediaSource === "new" && selectedMode === "upload" && "Select files to upload"}
            {mediaSource === "new" && selectedMode === "record" && "Record your media"}
            {mediaSource === "existing" && "Select from your media library"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Step 0: Choose Source (New or Existing) */}
          {!mediaSource && (
            <div className="grid gap-3">
              <Button
                variant="outline"
                className="h-auto flex-col gap-2 py-6 bg-transparent"
                onClick={() => setMediaSource("new")}
              >
                <Upload className="h-8 w-8" />
                <div className="text-center">
                  <div className="font-semibold">Upload New</div>
                  <div className="text-xs text-muted-foreground">Take or upload new photos, videos, or audio</div>
                </div>
              </Button>

              <Button
                variant="outline"
                className="h-auto flex-col gap-2 py-6 bg-transparent"
                onClick={() => setMediaSource("existing")}
              >
                <FolderOpen className="h-8 w-8" />
                <div className="text-center">
                  <div className="font-semibold">Select Existing</div>
                  <div className="text-xs text-muted-foreground">Choose from previously uploaded media</div>
                </div>
              </Button>
            </div>
          )}

          {/* Existing Media Picker */}
          {mediaSource === "existing" && (
            <MediaPicker
              onSelect={handleExistingMediaSelected}
              multiSelect={true}
              excludeUrls={[]} // Could pass artifact's existing media to exclude
            />
          )}

          {/* Step 1: Choose Media Type (only for "new" source) */}
          {mediaSource === "new" && !selectedType && (
            <div className="grid gap-3">
              <Button
                variant="outline"
                className="h-auto flex-col gap-2 py-6 bg-transparent"
                onClick={() => handleTypeSelect("photo")}
              >
                <Camera className="h-8 w-8" />
                <div className="text-center">
                  <div className="font-semibold">Photo</div>
                  <div className="text-xs text-muted-foreground">Upload or take photos</div>
                </div>
              </Button>

              <Button
                variant="outline"
                className="h-auto flex-col gap-2 py-6 bg-transparent"
                onClick={() => handleTypeSelect("video")}
              >
                <Video className="h-8 w-8" />
                <div className="text-center">
                  <div className="font-semibold">Video</div>
                  <div className="text-xs text-muted-foreground">Upload or record videos (up to 50MB)</div>
                </div>
              </Button>

              <Button
                variant="outline"
                className="h-auto flex-col gap-2 py-6 bg-transparent"
                onClick={() => handleTypeSelect("audio")}
              >
                <Mic className="h-8 w-8" />
                <div className="text-center">
                  <div className="font-semibold">Audio</div>
                  <div className="text-xs text-muted-foreground">Upload or record audio</div>
                </div>
              </Button>
            </div>
          )}

          {/* Step 2: Choose Upload or Capture/Record */}
          {mediaSource === "new" && selectedType && !selectedMode && (
            <div className="grid gap-3">
              <Button variant="outline" className="h-auto flex-col gap-2 py-6 bg-transparent" asChild>
                <label className="cursor-pointer">
                  <Upload className="h-8 w-8" />
                  <div className="text-center">
                    <div className="font-semibold">
                      Upload {selectedType === "photo" ? "Photos" : selectedType === "video" ? "Videos" : "Audio Files"}
                    </div>
                    <div className="text-xs text-muted-foreground">Choose multiple files from your device</div>
                  </div>
                  <input
                    type="file"
                    accept={selectedType === "photo" ? "image/*" : selectedType === "video" ? "video/*" : "audio/*"}
                    multiple
                    onChange={handleMediaUpload}
                    className="hidden"
                    disabled={isUploading}
                  />
                </label>
              </Button>

              {selectedType === "photo" ? (
                <>
                  <Button
                    variant="outline"
                    className="h-auto flex-col gap-2 py-6 bg-transparent"
                    onClick={handleCameraCapture}
                    disabled={isUploading}
                  >
                    <Camera className="h-8 w-8" />
                    <div className="text-center">
                      <div className="font-semibold">Take Photo</div>
                      <div className="text-xs text-muted-foreground">Use your device camera</div>
                    </div>
                  </Button>
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleMediaUpload}
                    className="hidden"
                    disabled={isUploading}
                  />
                </>
              ) : selectedType === "video" ? (
                <>
                  <Button
                    variant="outline"
                    className="h-auto flex-col gap-2 py-6 bg-transparent"
                    onClick={handleVideoCameraCapture}
                    disabled={isUploading}
                  >
                    <Video className="h-8 w-8" />
                    <div className="text-center">
                      <div className="font-semibold">Record Video</div>
                      <div className="text-xs text-muted-foreground">Use your device camera</div>
                    </div>
                  </Button>
                  <input
                    ref={videoCameraInputRef}
                    type="file"
                    accept="video/*"
                    capture="environment"
                    onChange={handleMediaUpload}
                    className="hidden"
                    disabled={isUploading}
                  />
                </>
              ) : (
                <Button
                  variant="outline"
                  className="h-auto flex-col gap-2 py-6 bg-transparent"
                  onClick={() => setSelectedMode("record")}
                >
                  <Mic className="h-8 w-8" />
                  <div className="text-center">
                    <div className="font-semibold">Record Audio</div>
                    <div className="text-xs text-muted-foreground">Use your device microphone</div>
                  </div>
                </Button>
              )}

              <Button variant="ghost" onClick={handleBack}>
                Back
              </Button>
            </div>
          )}

          {/* Recording UI for Audio */}
          {mediaSource === "new" && selectedMode === "record" && selectedType === "audio" && (
            <>
              <AudioRecorder onAudioRecorded={handleAudioRecorded} disabled={isUploading} />
              <Button variant="ghost" onClick={handleBack} className="w-full">
                Back
              </Button>
            </>
          )}

          {/* Error Display */}
          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Upload Progress - Enhanced with detailed progress tracking */}
          {isUploading && uploadProgress && (
            <div className="rounded-lg border border-dashed p-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Uploading file {uploadProgress.currentFile} of {uploadProgress.totalFiles}
                </span>
                {uploadProgress.estimatedTimeRemaining !== null && (
                  <span className="text-muted-foreground">
                    ~{formatTimeRemaining(uploadProgress.estimatedTimeRemaining)} remaining
                  </span>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium truncate max-w-[200px]">{uploadProgress.currentFileName}</span>
                  <span className="text-muted-foreground">{uploadProgress.currentFileProgress}%</span>
                </div>
                <Progress value={uploadProgress.currentFileProgress} className="h-2" />
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
