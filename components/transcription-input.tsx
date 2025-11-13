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
  const recordingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const options = { mimeType: "audio/webm;codecs=opus" }
      let mediaRecorder: MediaRecorder

      try {
        mediaRecorder = new MediaRecorder(stream, options)
      } catch (e) {
        console.log("[v0] Opus codec not supported, using default")
        mediaRecorder = new MediaRecorder(stream)
      }

      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" })
        console.log("[v0] Recording stopped, blob size:", audioBlob.size)
        await handleTranscription(audioBlob)

        // Stop all tracks and clean up
        stream.getTracks().forEach((track) => track.stop())
        if (audioContextRef.current) {
          audioContextRef.current.close()
          audioContextRef.current = null
        }
      }

      mediaRecorder.start()
      setIsRecording(true)
      console.log("[v0] Recording started")

      const audioContext = new AudioContext()
      audioContextRef.current = audioContext
      const analyser = audioContext.createAnalyser()
      analyserRef.current = analyser
      const microphone = audioContext.createMediaStreamSource(stream)
      microphone.connect(analyser)
      analyser.fftSize = 512
      const bufferLength = analyser.frequencyBinCount
      const dataArray = new Uint8Array(bufferLength)

      const maxRecordingTime = fieldType === "title" ? 10000 : 30000
      recordingTimeoutRef.current = setTimeout(() => {
        console.log("[v0] Max recording time reached, stopping")
        stopRecording()
      }, maxRecordingTime)

      let silentFrames = 0
      const checkAudioLevel = () => {
        if (!isRecording || !analyserRef.current) return

        analyser.getByteFrequencyData(dataArray)
        const average = dataArray.reduce((a, b) => a + b) / bufferLength

        // Consider it silent if average is below 10
        if (average < 10) {
          silentFrames++
          // Stop after 3 seconds of silence
          if (silentFrames > 60) {
            // ~3 seconds at 50ms intervals
            console.log("[v0] Silence detected for 3 seconds, stopping recording")
            stopRecording()
            return
          }
        } else {
          silentFrames = 0
        }

        // Check again in 50ms
        silenceTimeoutRef.current = setTimeout(checkAudioLevel, 50)
      }

      checkAudioLevel()
    } catch (error) {
      console.error("[v0] Error starting recording:", error)
      alert("Failed to access microphone. Please check your browser permissions.")
    }
  }

  const stopRecording = () => {
    if (recordingTimeoutRef.current) {
      clearTimeout(recordingTimeoutRef.current)
      recordingTimeoutRef.current = null
    }
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current)
      silenceTimeoutRef.current = null
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      console.log("[v0] Stopping recording...")
    }
  }

  const handleTranscription = async (audioBlob: Blob) => {
    setIsTranscribing(true)

    try {
      console.log("[v0] Starting transcription process")

      const transcriptionFormData = new FormData()
      transcriptionFormData.append("audio", audioBlob, "audio.webm")
      transcriptionFormData.append("fieldType", fieldType)

      console.log("[v0] Sending audio to transcription API")

      const transcriptionResponse = await fetch("/api/transcribe", {
        method: "POST",
        body: transcriptionFormData,
      })

      if (!transcriptionResponse.ok) {
        const errorData = await transcriptionResponse.json()
        console.error("[v0] Transcription API error:", errorData)
        throw new Error(errorData.details || errorData.error || "Failed to transcribe audio")
      }

      const { transcription } = await transcriptionResponse.json()
      console.log("[v0] Transcription successful:", transcription)
      onChange(transcription)

      const fileName = `${fieldType}-${Date.now()}.webm`
      const signatureResult = await generateCloudinaryTranscriptionSignature(userId, fileName, fieldType)

      if (signatureResult.error || !signatureResult.signature) {
        console.error("[v0] Cloudinary signature error:", signatureResult.error)
        console.warn("[v0] Failed to upload audio to Cloudinary, but transcription succeeded")
        return
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
        console.warn("[v0] Failed to upload audio to Cloudinary, but transcription succeeded")
      } else {
        const uploadData = await uploadResponse.json()
        console.log("[v0] Transcription audio uploaded to Cloudinary:", uploadData.secure_url)
      }
    } catch (error) {
      console.error("[v0] Transcription error:", error)
      alert(
        `Failed to transcribe audio: ${error instanceof Error ? error.message : "Unknown error"}. Please try again.`,
      )
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

  useEffect(() => {
    return () => {
      if (recordingTimeoutRef.current) {
        clearTimeout(recordingTimeoutRef.current)
      }
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current)
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop()
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
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
        className="absolute right-2 top-1.5 h-8 w-8 rounded-full bg-muted hover:bg-muted/80"
        title={isRecording ? "Stop recording" : "Start recording"}
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
