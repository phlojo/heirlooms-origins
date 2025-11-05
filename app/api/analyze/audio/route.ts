import { createClient } from "@/lib/supabase/server"
import { openai, getTranscribeModel, getTextModel, validateOpenAIKey } from "@/lib/ai"
import { generateText } from "ai"
import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"

const MAX_TRANSCRIPT_LENGTH = 10000

export async function POST(request: Request) {
  let artifactId: string | undefined

  try {
    const body = await request.json()
    artifactId = body.artifactId

    if (!artifactId) {
      return NextResponse.json({ error: "artifactId is required" }, { status: 400 })
    }

    validateOpenAIKey()

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

    const formData = new FormData()
    formData.append("file", audioBlob, "audio.mp3")
    formData.append("model", getTranscribeModel())
    if (artifact.language_hint) {
      formData.append("language", artifact.language_hint)
    }

    const transcriptionResponse = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: formData,
    })

    if (!transcriptionResponse.ok) {
      const errorText = await transcriptionResponse.text()
      throw new Error(`Transcription failed: ${errorText}`)
    }

    const transcriptionData = await transcriptionResponse.json()
    let transcript = transcriptionData.text

    if (transcript && transcript.length > 50) {
      try {
        const cleanupResult = await generateText({
          model: openai(getTextModel()),
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
        updated_at: new Date().toISOString(),
      })
      .eq("id", artifactId)

    if (updateError) {
      throw new Error(`Failed to save transcript: ${updateError.message}`)
    }

    console.log("[v0] Successfully saved transcript for artifact:", artifactId)

    revalidatePath(`/artifacts/${artifactId}`)
    revalidatePath(`/artifacts/${artifactId}/edit`)

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[v0] Audio analysis error:", error)

    if (artifactId) {
      try {
        const supabase = await createClient()
        await supabase
          .from("artifacts")
          .update({
            analysis_status: "error",
            analysis_error: error instanceof Error ? error.message : "Unknown error occurred",
          })
          .eq("id", artifactId)
      } catch (dbError) {
        console.error("[v0] Failed to save error status:", dbError)
      }
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Audio analysis failed" },
      { status: 500 },
    )
  }
}
