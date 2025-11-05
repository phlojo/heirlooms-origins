import { createClient } from "@/lib/supabase/server"
import { getOpenAIClient, getTranscribeModel, getTextModel } from "@/lib/ai"
import { generateText } from "ai"
import { NextResponse } from "next/server"

const MAX_TRANSCRIPT_LENGTH = 10000

export async function POST(request: Request) {
  try {
    const { artifactId } = await request.json()

    if (!artifactId) {
      return NextResponse.json({ error: "artifactId is required" }, { status: 400 })
    }

    const supabase = await createClient()

    const { data: artifact, error: fetchError } = await supabase
      .from("artifacts")
      .select("*")
      .eq("id", artifactId)
      .single()

    if (fetchError || !artifact) {
      return NextResponse.json({ error: "Artifact not found" }, { status: 404 })
    }

    const audioUrl = artifact.media_urls?.find((url: string) => {
      const lower = url.toLowerCase()
      return (
        lower.includes(".mp3") ||
        lower.includes(".wav") ||
        lower.includes(".m4a") ||
        lower.includes(".ogg") ||
        lower.includes(".webm") ||
        lower.includes("audio")
      )
    })

    if (!audioUrl) {
      return NextResponse.json({ error: "No audio file found in artifact" }, { status: 400 })
    }

    await supabase
      .from("artifacts")
      .update({ analysis_status: "processing", analysis_error: null })
      .eq("id", artifactId)

    const audioResponse = await fetch(audioUrl)
    if (!audioResponse.ok) {
      throw new Error(`Failed to download audio: ${audioResponse.statusText}`)
    }

    const audioBlob = await audioResponse.blob()
    const audioFile = new File([audioBlob], "audio.mp3", { type: audioBlob.type || "audio/mpeg" })

    const openai = getOpenAIClient()
    const transcriptionResponse = await openai.audio.transcriptions.create({
      file: audioFile,
      model: getTranscribeModel(),
      language: artifact.language_hint || undefined,
    })

    let transcript = transcriptionResponse.text

    if (transcript && transcript.length > 50) {
      try {
        const cleanupResult = await generateText({
          model: getTextModel(),
          prompt: `Reformat this transcript for readability. Fix obvious typos and add punctuation, but do not add any new information or facts. Keep the original meaning intact.\n\nTranscript:\n${transcript.slice(0, MAX_TRANSCRIPT_LENGTH)}`,
          maxOutputTokens: 2000,
        })
        transcript = cleanupResult.text
      } catch (cleanupError) {
        console.error("[v0] Transcript cleanup failed, using raw transcript:", cleanupError)
        // Continue with raw transcript if cleanup fails
      }
    }

    const { error: updateError } = await supabase
      .from("artifacts")
      .update({
        transcript,
        analysis_status: "done",
        analysis_error: null,
      })
      .eq("id", artifactId)

    if (updateError) {
      throw new Error(`Failed to save transcript: ${updateError.message}`)
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[v0] Audio analysis error:", error)

    try {
      const { artifactId } = await request.json()
      if (artifactId) {
        const supabase = await createClient()
        await supabase
          .from("artifacts")
          .update({
            analysis_status: "error",
            analysis_error: error instanceof Error ? error.message : "Unknown error occurred",
          })
          .eq("id", artifactId)
      }
    } catch (dbError) {
      console.error("[v0] Failed to save error status:", dbError)
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Audio analysis failed" },
      { status: 500 },
    )
  }
}
