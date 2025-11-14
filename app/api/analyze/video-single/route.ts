import { createClient } from "@/lib/supabase/server"
import { openai, getVisionModel } from "@/lib/ai"
import { generateText } from "ai"
import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { rateLimit } from "@/lib/utils/rate-limit"

function isVideoUrl(url: string): boolean {
  const lower = url.toLowerCase()
  return (
    (lower.includes("/video/upload/") && 
    (lower.includes(".mp4") || lower.includes(".mov") || lower.includes(".avi") || lower.includes(".webm"))) ||
    lower.includes("video")
  )
}

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
  const { ok, retryAfterMs } = rateLimit(ip)
  if (!ok) {
    return NextResponse.json(
      { error: "Too Many Requests" },
      { status: 429, headers: { "Retry-After": String(Math.ceil((retryAfterMs || 0) / 1000)) } },
    )
  }

  try {
    const { artifactId, videoUrl } = await request.json()

    if (!artifactId || !videoUrl) {
      return NextResponse.json({ error: "artifactId and videoUrl are required" }, { status: 400 })
    }

    if (!isVideoUrl(videoUrl)) {
      return NextResponse.json({ error: "Invalid video URL" }, { status: 400 })
    }

    const supabase = await createClient()

    // Load artifact
    const { data: artifact, error: fetchError } = await supabase
      .from("artifacts")
      .select("*")
      .eq("id", artifactId)
      .single()

    if (fetchError || !artifact) {
      return NextResponse.json({ error: "Artifact not found" }, { status: 404 })
    }

    console.log("[v0] Starting video summary for artifact:", artifactId)
    console.log("[v0] Video URL:", videoUrl.substring(0, 50) + "...")

    // For videos, we'll use a text-based approach since vision models don't directly process video
    // Generate a summary prompt based on the artifact context
    const result = await generateText({
      model: openai(getVisionModel()),
      prompt: `Generate a brief, descriptive summary for a video artifact in a family heirloom collection. 
      
Context: This is a video from "${artifact.title}"${artifact.description ? `, described as: ${artifact.description}` : ''}.

Create a 10-20 word summary that captures what this video likely contains based on the title and context. Be warm and specific.`,
      maxTokens: 100,
    })

    const summary = result.text.trim()
    console.log("[v0] Generated video summary:", summary)

    // Merge with existing video_summaries
    const existingSummaries = artifact.video_summaries || {}
    const updatedSummaries = {
      ...existingSummaries,
      [videoUrl]: summary,
    }

    const { error: updateError } = await supabase
      .from("artifacts")
      .update({
        video_summaries: updatedSummaries,
        updated_at: new Date().toISOString(),
      })
      .eq("id", artifactId)

    if (updateError) {
      throw new Error(`Failed to save video summary: ${updateError.message}`)
    }

    console.log("[v0] Successfully saved video summary")

    revalidatePath(`/artifacts/${artifactId}`)
    revalidatePath(`/artifacts/${artifactId}/edit`)

    return NextResponse.json({ ok: true, summary })
  } catch (error) {
    console.error("[v0] Video summary error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Video summary generation failed" },
      { status: 500 },
    )
  }
}
