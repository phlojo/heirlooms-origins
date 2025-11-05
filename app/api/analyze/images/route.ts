import { createClient } from "@/lib/supabase/server"
import { openai, getVisionModel } from "@/lib/ai"
import { generateText } from "ai"
import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"

const MAX_IMAGES = 5

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
    // Basic URL format validation
    new URL(url)

    // Try to fetch headers to verify the URL is reachable and is an image
    const response = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(5000) })
    if (!response.ok) return false

    const contentType = response.headers.get("content-type")
    return contentType?.startsWith("image/") ?? false
  } catch {
    return false
  }
}

export async function POST(request: Request) {
  try {
    const { artifactId } = await request.json()

    if (!artifactId) {
      return NextResponse.json({ error: "artifactId is required" }, { status: 400 })
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

    const potentialImageUrls = (artifact.media_urls || []).filter(isImageUrl).slice(0, MAX_IMAGES)

    // Validate URLs in parallel
    const validationResults = await Promise.all(
      potentialImageUrls.map(async (url) => ({
        url,
        isValid: await isValidImageUrl(url),
      })),
    )

    const imageUrls = validationResults.filter((result) => result.isValid).map((result) => result.url)

    if (imageUrls.length === 0) {
      return NextResponse.json({ error: "No valid image files found in artifact" }, { status: 400 })
    }

    // Set processing status
    await supabase
      .from("artifacts")
      .update({ analysis_status: "processing", analysis_error: null })
      .eq("id", artifactId)

    console.log("[v0] Starting image analysis for artifact:", artifactId)
    console.log("[v0] Using model:", getVisionModel())
    console.log("[v0] Processing", imageUrls.length, "images")

    // Generate captions for each image
    const captions: Record<string, string> = {}

    for (const imageUrl of imageUrls) {
      try {
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

        captions[imageUrl] = result.text.trim()
        console.log("[v0] Generated caption for image:", imageUrl.substring(0, 50) + "...")
      } catch (error) {
        console.error(`[v0] Failed to caption image ${imageUrl}:`, error)
        continue
      }
    }

    const { error: updateError } = await supabase
      .from("artifacts")
      .update({
        image_captions: captions,
        analysis_status: "done",
        analysis_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", artifactId)

    if (updateError) {
      throw new Error(`Failed to save captions: ${updateError.message}`)
    }

    console.log("[v0] Successfully saved image captions for artifact:", artifactId)

    revalidatePath(`/artifacts/${artifactId}`)
    revalidatePath(`/artifacts/${artifactId}/edit`)

    return NextResponse.json({ ok: true, captions })
  } catch (error) {
    console.error("[v0] Image analysis error:", error)

    // Save error status to database
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
      { error: error instanceof Error ? error.message : "Image analysis failed" },
      { status: 500 },
    )
  }
}
