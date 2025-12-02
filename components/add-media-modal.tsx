"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Camera, Video, Mic, Upload, FolderOpen, ArrowLeft, X, Square, Trash2, MonitorSmartphone } from "lucide-react"
// Note: AudioRecorder component is no longer used - recording is now inline
import { generateCloudinarySignature, generateCloudinaryAudioSignature } from "@/lib/actions/cloudinary"
import { trackPendingUpload } from "@/lib/actions/pending-uploads"
import { createUserMediaFromUrl } from "@/lib/actions/media"
import { getFileSizeLimit, formatFileSize } from "@/lib/media"
import { Progress } from "@/components/ui/progress"
import { createClient } from "@/lib/supabase/client"
import { MediaPicker } from "@/components/media-picker"
import { toast } from "sonner"
import { type UserMediaWithDerivatives } from "@/lib/types/media"

// Phase 2: Feature flag for storage backend
const USE_SUPABASE_STORAGE = process.env.NEXT_PUBLIC_USE_SUPABASE_STORAGE === "true"

// Debug: Log storage backend on component mount
if (typeof window !== 'undefined') {
  console.log("[add-media-modal] Storage backend:", USE_SUPABASE_STORAGE ? "Supabase" : "Cloudinary", {
    envVar: process.env.NEXT_PUBLIC_USE_SUPABASE_STORAGE
  })
}

type MediaType = "image" | "video" | "audio"

interface AddMediaModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  artifactId: string | null
  userId: string
  onMediaAdded: (urls: string[]) => void
  initialSource?: "new" | "existing" | null
  initialAction?: "upload" | "camera" | "video" | "audio" | null
  /** Restrict which media types can be selected/uploaded. Defaults to all types. */
  allowedMediaTypes?: MediaType[]
}

type MediaSource = "existing" | null

interface UploadProgress {
  currentFile: number
  totalFiles: number
  currentFileName: string
  currentFileProgress: number
  estimatedTimeRemaining: number | null
}

export function AddMediaModal({
  open,
  onOpenChange,
  artifactId,
  userId,
  onMediaAdded,
  initialSource = null,
  initialAction = null,
  allowedMediaTypes = ["image", "video", "audio"],
}: AddMediaModalProps) {
  // Helper to check if a media type is allowed
  const isTypeAllowed = (type: MediaType) => allowedMediaTypes.includes(type)
  const allowsAudio = isTypeAllowed("audio")
  const allowsVideo = isTypeAllowed("video")
  const allowsImages = isTypeAllowed("image")
  const [mediaSource, setMediaSource] = useState<MediaSource>(initialSource === "existing" ? "existing" : null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null)
  const [pendingAction, setPendingAction] = useState<"upload" | "camera" | "video" | "audio" | null>(null)

  // Inline audio recording state
  const [isRecording, setIsRecording] = useState(false)
  const [audioURL, setAudioURL] = useState<string | null>(null)
  const [recordingTime, setRecordingTime] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const cameraInputRef = useRef<HTMLInputElement>(null)
  const videoCameraInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Sync mediaSource with initialSource when modal opens
  useEffect(() => {
    if (open && initialSource === "existing") {
      setMediaSource("existing")
    }
  }, [open, initialSource])

  // Trigger initial action when modal opens
  useEffect(() => {
    if (open && initialAction) {
      setPendingAction(initialAction)
    }
  }, [open, initialAction])

  // Execute pending action after refs are available
  useEffect(() => {
    if (pendingAction && open) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        switch (pendingAction) {
          case "upload":
            fileInputRef.current?.click()
            break
          case "camera":
            cameraInputRef.current?.click()
            break
          case "video":
            videoCameraInputRef.current?.click()
            break
          case "audio":
            startRecording()
            break
        }
        setPendingAction(null)
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [pendingAction, open])

  const handleReset = () => {
    setMediaSource(null)
    setError(null)
    setUploadProgress(null)
    // Reset audio recording state
    setIsRecording(false)
    setAudioURL(null)
    setRecordingTime(0)
    audioChunksRef.current = []
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  const handleClose = () => {
    // Stop any active recording before closing
    if (isRecording && mediaRecorderRef.current) {
      mediaRecorderRef.current.stop()
    }
    handleReset()
    onOpenChange(false)
  }

  const handleBack = () => {
    if (mediaSource) {
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

      if (file.type.startsWith("audio/")) {
        signatureResult = await generateCloudinaryAudioSignature(userId, file.name)
        uploadUrl = `https://api.cloudinary.com/v1_1/${signatureResult.cloudName}/video/upload`
      } else if (file.type.startsWith("video/")) {
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

      if (file.type.startsWith("audio/") || file.type.startsWith("video/")) {
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

        const resourceType = file.type.startsWith("audio/")
          ? "raw"
          : file.type.startsWith("video/")
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

      // Check if this was a camera capture (single file from capture input)
      const isCameraCapture = e.target === cameraInputRef.current || e.target === videoCameraInputRef.current

      if (isCameraCapture) {
        // Show success toast - modal will close due to iOS browser behavior
        const mediaType = e.target === cameraInputRef.current ? "Photo" : "Video"
        toast.success(`${mediaType} added to gallery`)
      }
      // Close modal after any upload
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

  // Inline audio recording functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

      // Try formats in order of compatibility (MP4/AAC works best on iOS)
      let mediaRecorder: MediaRecorder
      let actualMimeType = "audio/webm" // fallback
      let fileExtension = "webm"

      const formats = [
        { mimeType: "audio/mp4", extension: "m4a" },
        { mimeType: "audio/webm;codecs=opus", extension: "webm" },
        { mimeType: "audio/webm", extension: "webm" },
      ]

      for (const format of formats) {
        if (MediaRecorder.isTypeSupported(format.mimeType)) {
          try {
            mediaRecorder = new MediaRecorder(stream, { mimeType: format.mimeType })
            actualMimeType = format.mimeType
            fileExtension = format.extension
            console.log("[v0] Using audio format:", format.mimeType)
            break
          } catch (e) {
            console.log("[v0] Format not supported:", format.mimeType)
          }
        }
      }

      // If no format worked, use browser default
      if (!mediaRecorder!) {
        mediaRecorder = new MediaRecorder(stream)
        actualMimeType = mediaRecorder.mimeType || "audio/webm"
        fileExtension = actualMimeType.includes("mp4") ? "m4a" : "webm"
        console.log("[v0] Using browser default format:", actualMimeType)
      }

      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      // Store these for use in onstop
      const capturedMimeType = actualMimeType
      const capturedExtension = fileExtension

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data)
        }
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: capturedMimeType })
        const url = URL.createObjectURL(audioBlob)
        setAudioURL(url)

        // Generate filename with timestamp and correct extension
        const fileName = `recording_${Date.now()}.${capturedExtension}`

        // Auto-upload the recording
        handleAudioUpload(audioBlob, fileName)

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
      setRecordingTime(0)

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1)
      }, 1000)
    } catch (error) {
      console.error("[v0] Error starting recording:", error)
      setError("Failed to access microphone. Please check your permissions.")
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)

      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }

  const clearRecording = () => {
    setAudioURL(null)
    setRecordingTime(0)
    audioChunksRef.current = []
  }

  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const handleAudioUpload = async (audioBlob: Blob, fileName: string) => {
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
      let secureUrl: string

      if (USE_SUPABASE_STORAGE) {
        // Phase 2: Upload to Supabase Storage
        console.log("[v0] Uploading audio recording to Supabase Storage:", fileName)
        const supabase = createClient()

        // Generate unique path
        const timestamp = Date.now()
        const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_")
        const folder = artifactId ? `${userId}/${artifactId}` : `${userId}/temp`
        const filePath = `${folder}/${timestamp}-${sanitizedName}`

        const { data, error: uploadError } = await supabase.storage
          .from("heirlooms-media")
          .upload(filePath, audioBlob, {
            cacheControl: "3600",
            upsert: false,
            contentType: audioBlob.type || "audio/webm",
          })

        if (uploadError) {
          throw new Error(uploadError.message || "Failed to upload audio")
        }

        const { data: { publicUrl } } = supabase.storage
          .from("heirlooms-media")
          .getPublicUrl(data.path)

        secureUrl = publicUrl
        console.log("[v0] Audio uploaded to Supabase Storage:", secureUrl)

        // Report progress as complete
        setUploadProgress({
          currentFile: 1,
          totalFiles: 1,
          currentFileName: fileName,
          currentFileProgress: 100,
          estimatedTimeRemaining: 0,
        })
      } else {
        // Legacy: Upload to Cloudinary
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

        secureUrl = await uploadPromise
      }

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

  // Handle file input click for multi-select upload
  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) handleClose()
    }}>
      <DialogContent className="sm:max-w-2xl border-2 border-purple-400/50" showCloseButton={false}>
        <DialogHeader className="space-y-1">
          <div className="flex items-center">
            {/* Left: Back button (visible when viewing existing media) */}
            <div className="w-16 flex justify-start">
              {mediaSource === "existing" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBack}
                  className="h-7 px-2 text-muted-foreground hover:text-foreground -ml-2"
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Back
                </Button>
              )}
            </div>
            {/* Center: Title */}
            <DialogTitle className="flex-1 text-center">Add Media</DialogTitle>
            {/* Right: Close button */}
            <div className="w-16 flex justify-end">
              <DialogClose asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Close</span>
                </Button>
              </DialogClose>
            </div>
          </div>
          <DialogDescription className="text-center">
            {mediaSource === "existing"
              ? "Select from your Heirlooms media library"
              : "Upload, capture, or select media"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-1 pb-2">
          {/* Existing Media Picker (full screen mode) */}
          {mediaSource === "existing" && (
            <MediaPicker
              onSelect={handleExistingMediaSelected}
              multiSelect={true}
              excludeUrls={[]} // Could pass artifact's existing media to exclude
              allowedTypes={allowedMediaTypes}
            />
          )}

          {/* Main view with both Add from Device and Select Existing */}
          {!mediaSource && (
            <div className="space-y-4">
              {/* Add from Device Section */}
              <div className="rounded-lg border bg-muted/30 p-3 sm:p-4 space-y-3">
                <div className="flex items-center justify-center gap-2 text-sm font-semibold">
                  <MonitorSmartphone className="h-4 w-4" />
                  <span>From Device</span>
                </div>

                {/* Action buttons row - centered with flex, responsive sizing */}
                <div className="flex justify-center gap-1 sm:gap-2">
                  {/* Upload Button - multi-select any media */}
                  <Button
                    variant="outline"
                    className="h-12 sm:h-14 min-w-0 flex-1 max-w-[4rem] sm:max-w-20 bg-transparent flex flex-col items-center justify-center gap-0.5 sm:gap-1 px-0.5 sm:px-2"
                    onClick={handleUploadClick}
                    disabled={isUploading || isRecording}
                  >
                    <Upload className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="text-[9px] sm:text-xs">Upload</span>
                  </Button>

                  {/* Photo Capture */}
                  <Button
                    variant="outline"
                    className="h-12 sm:h-14 min-w-0 flex-1 max-w-[4rem] sm:max-w-20 bg-transparent flex flex-col items-center justify-center gap-0.5 sm:gap-1 px-0.5 sm:px-2"
                    onClick={handleCameraCapture}
                    disabled={isUploading || isRecording}
                  >
                    <Camera className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="text-[9px] sm:text-xs">Camera</span>
                  </Button>

                  {/* Video Capture */}
                  <Button
                    variant="outline"
                    className="h-12 sm:h-14 min-w-0 flex-1 max-w-[4rem] sm:max-w-20 bg-transparent flex flex-col items-center justify-center gap-0.5 sm:gap-1 px-0.5 sm:px-2"
                    onClick={handleVideoCameraCapture}
                    disabled={isUploading || isRecording}
                  >
                    <Video className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="text-[9px] sm:text-xs">Video</span>
                  </Button>

                  {/* Audio Record - shows record button or stop button (only if audio allowed) */}
                  {allowsAudio && (
                    !isRecording ? (
                      <Button
                        variant="outline"
                        className="h-12 sm:h-14 min-w-0 flex-1 max-w-[4rem] sm:max-w-20 bg-transparent flex flex-col items-center justify-center gap-0.5 sm:gap-1 px-0.5 sm:px-2"
                        onClick={startRecording}
                        disabled={isUploading}
                      >
                        <Mic className="h-4 w-4 sm:h-5 sm:w-5" />
                        <span className="text-[9px] sm:text-xs">Audio</span>
                      </Button>
                    ) : (
                      <Button
                        variant="destructive"
                        className="h-12 sm:h-14 min-w-0 flex-1 max-w-[4rem] sm:max-w-20 flex flex-col items-center justify-center gap-0.5 sm:gap-1 px-0.5 sm:px-2"
                        onClick={stopRecording}
                      >
                        <Square className="h-4 w-4 sm:h-5 sm:w-5" />
                        <span className="text-[9px] sm:text-xs">Stop</span>
                      </Button>
                    )
                  )}
                </div>

                {/* Recording indicator */}
                {isRecording && (
                  <div className="flex items-center justify-center gap-2 py-2">
                    <div className="h-3 w-3 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-sm font-medium text-red-600">
                      Recording... {formatRecordingTime(recordingTime)}
                    </span>
                  </div>
                )}

                {/* Audio playback after recording */}
                {audioURL && !isRecording && !isUploading && (
                  <div className="flex items-center gap-2 py-2">
                    <audio src={audioURL} controls className="flex-1 h-10" />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={clearRecording}
                      className="h-10 w-10"
                      title="Discard recording"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                {/* Hidden file inputs */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={[
                    allowsImages && "image/*",
                    allowsVideo && "video/*",
                    allowsAudio && "audio/*",
                  ].filter(Boolean).join(",")}
                  multiple
                  onChange={handleMediaUpload}
                  className="hidden"
                  disabled={isUploading}
                />
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleMediaUpload}
                  className="hidden"
                  disabled={isUploading}
                />
                <input
                  ref={videoCameraInputRef}
                  type="file"
                  accept="video/*"
                  capture="environment"
                  onChange={handleMediaUpload}
                  className="hidden"
                  disabled={isUploading}
                />
              </div>

              {/* Select Existing Section */}
              <Button
                variant="outline"
                className="w-full h-auto py-4 bg-transparent flex-col gap-1"
                onClick={() => setMediaSource("existing")}
                disabled={isUploading || isRecording}
              >
                <div className="flex items-center gap-2">
                  <FolderOpen className="h-5 w-5" />
                  <span className="font-semibold">From My Media</span>
                </div>
                <div className="text-xs text-muted-foreground">Choose from your media library</div>
              </Button>
            </div>
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
