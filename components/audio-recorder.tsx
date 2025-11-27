"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Mic, Square, Trash2 } from 'lucide-react'

interface AudioRecorderProps {
  onAudioRecorded: (audioBlob: Blob, fileName: string) => void
  disabled?: boolean
}

export function AudioRecorder({ onAudioRecorded, disabled }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [audioURL, setAudioURL] = useState<string | null>(null)
  const [recordingTime, setRecordingTime] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)

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
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: actualMimeType })
        const url = URL.createObjectURL(audioBlob)
        setAudioURL(url)

        // Generate filename with timestamp and correct extension
        const fileName = `recording_${Date.now()}.${fileExtension}`
        onAudioRecorded(audioBlob, fileName)

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
      alert("Failed to access microphone. Please check your permissions.")
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
    chunksRef.current = []
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        {!isRecording && !audioURL && (
          <Button type="button" variant="outline" onClick={startRecording} disabled={disabled}>
            <Mic className="mr-2 h-4 w-4" />
            Record Audio
          </Button>
        )}

        {isRecording && (
          <>
            <Button type="button" variant="destructive" onClick={stopRecording}>
              <Square className="mr-2 h-4 w-4" />
              Stop Recording
            </Button>
            <span className="text-sm font-medium text-destructive">{formatTime(recordingTime)}</span>
          </>
        )}

        {audioURL && !isRecording && (
          <div className="flex items-center gap-2 flex-1">
            <audio src={audioURL} controls className="flex-1" />
            <Button 
              type="button" 
              variant="ghost" 
              size="icon" 
              onClick={clearRecording}
              aria-label="Clear recording"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
