"use client"

import { useState, useRef, useEffect } from "react"
import { Mic, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { generateCloudinaryTranscriptionSignature } from "@/lib/actions/cloudinary"

interface TranscriptionInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: "input" | "textarea"
  fieldType: "title" | "description"
  userId: string
  disabled?: boolean
  rows?: number
}

export function TranscriptionInput({
  value,
  onChange,
  placeholder,
  type = "input",
  fieldType,
  userId,
  disabled = false,
  rows = 4,
}: TranscriptionInputProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" })
        await handleTranscription(audioBlob)

        // Stop all tracks to release microphone
        stream.getTracks().forEach((track) => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
    } catch (error) {
      console.error("[v0] Error starting recording:", error)
      alert("Failed to access microphone. Please check your browser permissions.")
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  const handleTranscription = async (audioBlob: Blob) => {
    setIsTranscribing(true)

    try {
      // First, upload to Cloudinary
      const fileName = `${fieldType}-${Date.now()}.webm`
      const signatureResult = await generateCloudinaryTranscriptionSignature(userId, fileName, fieldType)

      if (signatureResult.error || !signatureResult.signature) {
        throw new Error(signatureResult.error || "Failed to generate upload signature")
      }

      const cloudinaryFormData = new FormData()
      cloudinaryFormData.append("file", audioBlob, fileName)
      cloudinaryFormData.append("public_id", signatureResult.publicId!)
      cloudinaryFormData.append("timestamp", signatureResult.timestamp!.toString())
      cloudinaryFormData.append("api_key", signatureResult.apiKey!)
      cloudinaryFormData.append("signature", signatureResult.signature)

      const uploadUrl = `https://api.cloudinary.com/v1_1/${signatureResult.cloudName}/video/upload`

      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        body: cloudinaryFormData,
      })

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload audio to Cloudinary")
      }

      const uploadData = await uploadResponse.json()
      console.log("[v0] Transcription audio uploaded to Cloudinary:", uploadData.secure_url)

      // Then, transcribe the audio
      const transcriptionFormData = new FormData()
      transcriptionFormData.append("audio", audioBlob)
      transcriptionFormData.append("fieldType", fieldType)

      const transcriptionResponse = await fetch("/api/transcribe", {
        method: "POST",
        body: transcriptionFormData,
      })

      if (!transcriptionResponse.ok) {
        throw new Error("Failed to transcribe audio")
      }

      const { transcription } = await transcriptionResponse.json()
      onChange(transcription)
    } catch (error) {
      console.error("[v0] Transcription error:", error)
      alert("Failed to transcribe audio. Please try again.")
    } finally {
      setIsTranscribing(false)
    }
  }

  const handleMicClick = () => {
    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop()
      }
    }
  }, [])

  const InputComponent = type === "textarea" ? Textarea : Input

  return (
    <div className="relative">
      <InputComponent
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled || isRecording || isTranscribing}
        rows={type === "textarea" ? rows : undefined}
        className="pr-10"
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={handleMicClick}
        disabled={disabled || isTranscribing}
        className="absolute right-1 top-1 h-8 w-8"
      >
        {isTranscribing ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : (
          <Mic className={`h-4 w-4 ${isRecording ? "text-destructive animate-pulse" : "text-muted-foreground"}`} />
        )}
      </Button>
    </div>
  )
}
