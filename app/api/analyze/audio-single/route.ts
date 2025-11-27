import { createClient } from "@/lib/supabase/server"
import { openai, getTranscribeModel, getTextModel, validateOpenAIKey } from "@/lib/ai"
import { generateText } from "ai"
import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { rateLimit } from "@/lib/utils/rate-limit"

const MAX_TRANSCRIPT_LENGTH = 10000

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
  const { ok, retryAfterMs } = rateLimit(ip)
  if (!ok) {
    return NextResponse.json(
      { error: "Too Many Requests" },
      { status: 429, headers: { "Retry-After": String(Math.ceil((retryAfterMs || 0) / 1000)) } },
    )
  }

  let artifactId: string | undefined

  try {
    const body = await request.json()
    artifactId = body.artifactId
    const audioUrl = body.audioUrl

    if (!artifactId) {
      return NextResponse.json({ error: "artifactId is required" }, { status: 400 })
    }

    if (!audioUrl) {
      return NextResponse.json({ error: "audioUrl is required" }, { status: 400 })
    }

    validateOpenAIKey()

    const supabase = await createClient()

    const { data: artifact, error: fetchError } = await supabase
      .from("artifacts")
      .select("*, slug")
      .eq("id", artifactId)
      .single()

    if (fetchError || !artifact) {
      return NextResponse.json({ error: "Artifact not found" }, { status: 404 })
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
        console.error("Transcript cleanup failed, using raw transcript:", cleanupError)
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

    revalidatePath(`/artifacts/${artifact.slug}`)

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Audio transcription error:", error)

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
        console.error("Failed to save error status:", dbError)
      }
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Audio transcription failed" },
      { status: 500 },
    )
  }
}
