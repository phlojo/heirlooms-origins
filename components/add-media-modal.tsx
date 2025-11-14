"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Camera, Video, Mic, Upload, X } from 'lucide-react'
import { AudioRecorder } from "@/components/audio-recorder"
import { generateCloudinarySignature, generateCloudinaryAudioSignature } from "@/lib/actions/cloudinary"

interface AddMediaModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  artifactId: string
  userId: string
  onMediaAdded: (urls: string[]) => void
}

type MediaType = "photo" | "video" | "audio" | null
type MediaMode = "upload" | "record" | null

export function AddMediaModal({ open, onOpenChange, artifactId, userId, onMediaAdded }: AddMediaModalProps) {
  const [selectedType, setSelectedType] = useState<MediaType>(null)
  const [selectedMode, setSelectedMode] = useState<MediaMode>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleReset = () => {
    setSelectedType(null)
    setSelectedMode(null)
    setError(null)
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
    }
  }

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const MAX_FILE_SIZE = 15 * 1024 * 1024
    const oversizedFiles = Array.from(files).filter((file) => file.size > MAX_FILE_SIZE)

    if (oversizedFiles.length > 0) {
      const fileNames = oversizedFiles.map((f) => f.name).join(", ")
      setError(`The following files are too large (max 15MB): ${fileNames}`)
      e.target.value = ""
      return
    }

    const totalSize = Array.from(files).reduce((sum, file) => sum + file.size, 0)
    const MAX_TOTAL_SIZE = 50 * 1024 * 1024

    if (totalSize > MAX_TOTAL_SIZE) {
      setError("Total file size exceeds 50MB. Please upload fewer or smaller files.")
      e.target.value = ""
      return
    }

    setIsUploading(true)
    setError(null)

    try {
      const urls: string[] = []

      for (const file of Array.from(files)) {
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

        if (signatureResult.eager) {
          formData.append("eager", signatureResult.eager)
        }

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

      onMediaAdded(urls)
      handleClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload files. Please try again.")
    } finally {
      setIsUploading(false)
      e.target.value = ""
    }
  }

  const handleAudioRecorded = async (audioBlob: Blob, fileName: string) => {
    setIsUploading(true)
    setError(null)

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

      const uploadUrl = `https://api.cloudinary.com/v1_1/${signatureResult.cloudName}/video/upload`

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
          throw new Error(`Audio upload failed (${response.status}): ${errorText.substring(0, 100)}`)
        }
        throw new Error(`Failed to upload audio: ${errorData.error?.message || "Unknown error"}`)
      }

      const data = await response.json()
      onMediaAdded([data.secure_url])
      handleClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload audio. Please try again.")
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Media</DialogTitle>
          <DialogDescription>
            {!selectedType && "Step 1: Choose the type of media to add"}
            {selectedType && !selectedMode && "Step 2: Choose how to add your media"}
            {selectedMode === "upload" && "Select files to upload"}
            {selectedMode === "record" && "Record your media"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Step 1: Choose Media Type */}
          {!selectedType && (
            <div className="grid gap-3">
              <Button
                variant="outline"
                className="h-auto flex-col gap-2 py-6"
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
                className="h-auto flex-col gap-2 py-6"
                onClick={() => handleTypeSelect("video")}
              >
                <Video className="h-8 w-8" />
                <div className="text-center">
                  <div className="font-semibold">Video</div>
                  <div className="text-xs text-muted-foreground">Upload or record videos</div>
                </div>
              </Button>

              <Button
                variant="outline"
                className="h-auto flex-col gap-2 py-6"
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
          {selectedType && !selectedMode && (
            <div className="grid gap-3">
              <Button variant="outline" className="h-auto flex-col gap-2 py-6" asChild>
                <label className="cursor-pointer">
                  <Upload className="h-8 w-8" />
                  <div className="text-center">
                    <div className="font-semibold">
                      Upload {selectedType === "photo" ? "Photos" : selectedType === "video" ? "Videos" : "Audio Files"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Choose multiple files from your device
                    </div>
                  </div>
                  <input
                    type="file"
                    accept={
                      selectedType === "photo"
                        ? "image/*"
                        : selectedType === "video"
                        ? "video/*"
                        : "audio/*"
                    }
                    multiple
                    onChange={handleMediaUpload}
                    className="hidden"
                    disabled={isUploading}
                  />
                </label>
              </Button>

              <Button
                variant="outline"
                className="h-auto flex-col gap-2 py-6"
                onClick={() => setSelectedMode("record")}
              >
                {selectedType === "photo" ? <Camera className="h-8 w-8" /> : selectedType === "video" ? <Video className="h-8 w-8" /> : <Mic className="h-8 w-8" />}
                <div className="text-center">
                  <div className="font-semibold">
                    {selectedType === "photo" ? "Take Photo" : selectedType === "video" ? "Record Video" : "Record Audio"}
                  </div>
                  <div className="text-xs text-muted-foreground">Use your device camera/microphone</div>
                </div>
              </Button>

              <Button variant="ghost" onClick={handleBack}>
                Back
              </Button>
            </div>
          )}

          {/* Recording UI for Audio */}
          {selectedMode === "record" && selectedType === "audio" && (
            <div className="space-y-4">
              <AudioRecorder onAudioRecorded={handleAudioRecorded} disabled={isUploading} />
              <Button variant="ghost" onClick={handleBack} className="w-full">
                Back
              </Button>
            </div>
          )}

          {/* Coming Soon for Photo/Video Capture */}
          {selectedMode === "record" && (selectedType === "photo" || selectedType === "video") && (
            <div className="space-y-4">
              <div className="rounded-lg border border-dashed p-8 text-center">
                <p className="text-sm text-muted-foreground">
                  Camera recording coming soon. Please use the upload option for now.
                </p>
              </div>
              <Button variant="ghost" onClick={handleBack} className="w-full">
                Back
              </Button>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Upload Progress */}
          {isUploading && (
            <div className="rounded-lg border border-dashed p-4 text-center">
              <p className="text-sm text-muted-foreground">Uploading...</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
