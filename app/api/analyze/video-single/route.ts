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

function extractVideoFrame(videoUrl: string): string {
  // Use Cloudinary transformations to extract a frame at 1 second and convert to jpg
  const urlParts = videoUrl.split('/upload/')
  if (urlParts.length === 2) {
    return `${urlParts[0]}/upload/so_1.0,f_jpg/${urlParts[1]}`
  }
  return videoUrl
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

    const { data: artifact, error: fetchError } = await supabase
      .from("artifacts")
      .select("*, slug")
      .eq("id", artifactId)
      .single()

    if (fetchError || !artifact) {
      return NextResponse.json({ error: "Artifact not found" }, { status: 404 })
    }

    console.log("[v0] Starting video summary generation for artifact:", artifactId)
    console.log("[v0] Video URL:", videoUrl.substring(0, 50) + "...")

    const frameUrl = extractVideoFrame(videoUrl)
    console.log("[v0] Extracted frame URL:", frameUrl.substring(0, 50) + "...")

    const result = await generateText({
      model: openai(getVisionModel()),
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              image: frameUrl,
            },
            {
              type: "text",
              text: "Generate a descriptive summary for this video frame in 7-20 words. Be specific and factual about what you see.",
            },
          ],
        },
      ],
      maxTokens: 100,
    })

    const summary = result.text.trim()
    console.log("[v0] Generated video summary:", summary)

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

    revalidatePath(`/artifacts/${artifact.slug}`)
    revalidatePath(`/artifacts/${artifact.slug}/edit`)

    return NextResponse.json({ ok: true, summary })
  } catch (error) {
    console.error("[v0] Video summary error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Video summary generation failed" },
      { status: 500 },
    )
  }
}
