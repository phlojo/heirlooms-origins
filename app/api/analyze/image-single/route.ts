import { createClient } from "@/lib/supabase/server"
import { openai, getVisionModel } from "@/lib/ai"
import { generateText } from "ai"
import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { rateLimit } from "@/lib/utils/rate-limit"

function isImageUrl(url: string): boolean {
  const lower = url.toLowerCase()
  return (
    lower.includes(".jpg") ||
    lower.includes(".jpeg") ||
    lower.includes(".png") ||
    lower.includes(".gif") ||
    lower.includes(".webp") ||
    lower.includes(".bmp") ||
    lower.includes("image")
  )
}

async function isValidImageUrl(url: string): Promise<boolean> {
  try {
    new URL(url)
    const response = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(5000) })
    if (!response.ok) return false
    const contentType = response.headers.get("content-type")
    return contentType?.startsWith("image/") ?? false
  } catch {
    return false
  }
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
    const { artifactId, imageUrl } = await request.json()

    if (!artifactId || !imageUrl) {
      return NextResponse.json({ error: "artifactId and imageUrl are required" }, { status: 400 })
    }

    if (!isImageUrl(imageUrl)) {
      return NextResponse.json({ error: "Invalid image URL" }, { status: 400 })
    }

    const isValid = await isValidImageUrl(imageUrl)
    if (!isValid) {
      return NextResponse.json({ error: "Image URL is not accessible" }, { status: 400 })
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

    console.log("[v0] Starting single image caption for artifact:", artifactId)
    console.log("[v0] Image URL (unique key):", imageUrl.substring(0, 80) + "...")

    // Generate caption for the single image
    const result = await generateText({
      model: openai(getVisionModel()),
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              image: imageUrl,
            },
            {
              type: "text",
              text: "Generate a descriptive caption for this image in 7-20 words. Be specific and factual.",
            },
          ],
        },
      ],
      maxTokens: 100,
    })

    const caption = result.text.trim()
    console.log("[v0] Generated caption for URL:", imageUrl.substring(0, 50))
    console.log("[v0] Caption:", caption)

    const existingCaptions = artifact.image_captions || {}
    const updatedCaptions = {
      ...existingCaptions,
      [imageUrl]: caption, // imageUrl is the unique identifier
    }

    console.log("[v0] Storing caption with key:", imageUrl.substring(0, 50))

    const { error: updateError } = await supabase
      .from("artifacts")
      .update({
        image_captions: updatedCaptions,
        updated_at: new Date().toISOString(),
      })
      .eq("id", artifactId)

    if (updateError) {
      throw new Error(`Failed to save caption: ${updateError.message}`)
    }

    console.log("[v0] Successfully saved image caption")

    revalidatePath(`/artifacts/${artifact.slug}`)
    revalidatePath(`/artifacts/${artifact.slug}/edit`)

    return NextResponse.json({ ok: true, caption })
  } catch (error) {
    console.error("[v0] Single image caption error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Image caption generation failed" },
      { status: 500 },
    )
  }
}
