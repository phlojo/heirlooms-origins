import { createClient } from "@/lib/supabase/server"
import { getVisionModel } from "@/lib/ai"
import { generateText } from "ai"
import { NextResponse } from "next/server"

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

    // Get up to 5 image URLs
    const imageUrls = (artifact.media_urls || []).filter(isImageUrl).slice(0, MAX_IMAGES)

    if (imageUrls.length === 0) {
      return NextResponse.json({ error: "No image files found in artifact" }, { status: 400 })
    }

    // Set processing status
    await supabase
      .from("artifacts")
      .update({ analysis_status: "processing", analysis_error: null })
      .eq("id", artifactId)

    // Generate captions for each image
    const captions: Record<string, string> = {}

    for (const imageUrl of imageUrls) {
      try {
        const result = await generateText({
          model: getVisionModel(),
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
      } catch (error) {
        console.error(`[v0] Failed to caption image ${imageUrl}:`, error)
        captions[imageUrl] = "Caption generation failed"
      }
    }

    // Save captions to database
    const { error: updateError } = await supabase
      .from("artifacts")
      .update({
        image_captions: captions,
        analysis_status: "done",
        analysis_error: null,
      })
      .eq("id", artifactId)

    if (updateError) {
      throw new Error(`Failed to save captions: ${updateError.message}`)
    }

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
