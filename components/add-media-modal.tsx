"use client"

import { useState, useRef } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Camera, Video, Mic, Upload, X } from 'lucide-react'
import { AudioRecorder } from "@/components/audio-recorder"
import { generateCloudinarySignature, generateCloudinaryAudioSignature } from "@/lib/actions/cloudinary"
import { normalizeMediaUrls, getFileSizeLimit, formatFileSize } from "@/lib/media"

interface AddMediaModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  artifactId: string | null
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
  
  const cameraInputRef = useRef<HTMLInputElement>(null)

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
        console.log("[v0] Uploading file:", file.name, file.type, formatFileSize(file.size))
        
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
          console.error("[v0] Signature generation failed:", signatureResult.error)
          throw new Error(signatureResult.error || "Failed to generate upload signature")
        }

        console.log("[v0] Signature generated successfully, public_id:", signatureResult.publicId)

        const formData = new FormData()
        formData.append("file", file)
        formData.append("api_key", signatureResult.apiKey!)
        formData.append("timestamp", signatureResult.timestamp!.toString())
        formData.append("signature", signatureResult.signature)
        formData.append("public_id", signatureResult.publicId!)

        if (signatureResult.eager) {
          formData.append("eager", signatureResult.eager)
        }

        console.log("[v0] Uploading to:", uploadUrl)
        console.log("[v0] FormData keys:", Array.from(formData.keys()))
        
        const response = await fetch(uploadUrl, {
          method: "POST",
          body: formData,
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.error("[v0] Upload failed:", response.status, errorText)
          let errorData
          try {
            errorData = JSON.parse(errorText)
            console.error("[v0] Parsed error:", errorData)
          } catch {
            console.error("[v0] Could not parse error response")
            throw new Error(`Upload failed (${response.status}): ${errorText.substring(0, 200)}`)
          }
          throw new Error(`Failed to upload ${file.name}: ${errorData.error?.message || errorData.message || "Unknown error"}`)
        }

        const data = await response.json()
        console.log("[v0] Upload successful!")
        console.log("[v0] Response data:", {
          public_id: data.public_id,
          secure_url: data.secure_url,
          format: data.format,
          resource_type: data.resource_type,
          width: data.width,
          height: data.height
        })
        urls.push(data.secure_url)
      }

      console.log("[v0] All uploads complete, URLs:", urls)
      onMediaAdded(urls)
      handleClose()
    } catch (err) {
      console.error("[v0] Upload error:", err)
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

  const handleCameraCapture = () => {
    if (cameraInputRef.current) {
      cameraInputRef.current.click()
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
                  <div className="text-xs text-muted-foreground">Upload or record videos (up to 500MB)</div>
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

              {selectedType === "photo" || selectedType === "video" ? (
                <>
                  <Button
                    variant="outline"
                    className="h-auto flex-col gap-2 py-6"
                    onClick={handleCameraCapture}
                    disabled={isUploading}
                  >
                    {selectedType === "photo" ? <Camera className="h-8 w-8" /> : <Video className="h-8 w-8" />}
                    <div className="text-center">
                      <div className="font-semibold">
                        {selectedType === "photo" ? "Take Photo" : "Record Video"}
                      </div>
                      <div className="text-xs text-muted-foreground">Use your device camera</div>
                    </div>
                  </Button>
                  {/* Hidden input for camera capture */}
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept={selectedType === "photo" ? "image/*" : "video/*"}
                    capture="environment"
                    onChange={handleMediaUpload}
                    className="hidden"
                    disabled={isUploading}
                  />
                </>
              ) : (
                <Button
                  variant="outline"
                  className="h-auto flex-col gap-2 py-6"
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
          {selectedMode === "record" && selectedType === "audio" && (
            <div className="space-y-4">
              <AudioRecorder onAudioRecorded={handleAudioRecorded} disabled={isUploading} />
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
