import { createClient } from "@/lib/supabase/server"
import { getSummaryModel } from "@/lib/ai"
import { generateObject } from "ai"
import { NextResponse } from "next/server"
import { z } from "zod"
import { revalidatePath } from "next/cache"

const MAX_TRANSCRIPT_LENGTH = 10000
const MAX_IMAGE_CAPTIONS = 3

// Zod schema for structured summary output
const summarySchema = z.object({
  description_markdown: z
    .string()
    .min(40, "Description must be at least 40 characters")
    .describe("A concise, factual, warm heirloom description in markdown format"),
  highlights: z
    .array(z.string())
    .max(5, "Maximum 5 highlights")
    .describe("Key highlights or memorable moments (max 5)"),
  people: z.array(z.string()).optional().describe("Names of people mentioned or identified"),
  places: z.array(z.string()).optional().describe("Locations or places mentioned"),
  year_guess: z.number().int().optional().describe("Estimated year if determinable from context"),
  tags: z.array(z.string()).optional().describe("Relevant tags or categories"),
})

export async function POST(request: Request) {
  console.log("[v0] === SUMMARY API ROUTE CALLED ===")
  try {
    const body = await request.json()
    console.log("[v0] Request body:", body)
    const { artifactId } = body

    if (!artifactId) {
      console.log("[v0] ERROR: No artifactId provided")
      return NextResponse.json({ error: "artifactId is required" }, { status: 400 })
    }

    console.log("[v0] Creating Supabase client")
    const supabase = await createClient()

    // Load artifact with transcript and image_captions
    console.log("[v0] Fetching artifact from database:", artifactId)
    const { data: artifact, error: fetchError } = await supabase
      .from("artifacts")
      .select("*")
      .eq("id", artifactId)
      .single()

    if (fetchError || !artifact) {
      console.log("[v0] ERROR: Artifact not found", fetchError)
      return NextResponse.json({ error: "Artifact not found" }, { status: 404 })
    }

    console.log("[v0] Artifact loaded:", { id: artifact.id, title: artifact.title })

    const transcript = artifact.transcript
    const imageCaptions = artifact.image_captions as Record<string, string> | null

    console.log("[v0] Content available:", {
      hasTranscript: !!transcript,
      transcriptLength: transcript?.length || 0,
      hasImageCaptions: !!imageCaptions,
      imageCaptionsCount: imageCaptions ? Object.keys(imageCaptions).length : 0,
    })

    // Check if we have any content to summarize
    if (!transcript && (!imageCaptions || Object.keys(imageCaptions).length === 0)) {
      console.log("[v0] ERROR: No content available for summary")
      return NextResponse.json({ error: "No transcript or image captions available for summary" }, { status: 400 })
    }

    // Set processing status
    console.log("[v0] Setting analysis_status to 'processing'")
    await supabase
      .from("artifacts")
      .update({ analysis_status: "processing", analysis_error: null })
      .eq("id", artifactId)

    // Build context for AI
    const contextParts: string[] = []

    if (transcript) {
      const truncatedTranscript = transcript.slice(0, MAX_TRANSCRIPT_LENGTH)
      contextParts.push(`## Transcript:\n${truncatedTranscript}`)
      if (transcript.length > MAX_TRANSCRIPT_LENGTH) {
        contextParts.push(`\n(Transcript truncated from ${transcript.length} to ${MAX_TRANSCRIPT_LENGTH} characters)`)
      }
    }

    if (imageCaptions && Object.keys(imageCaptions).length > 0) {
      const captionEntries = Object.entries(imageCaptions).slice(0, MAX_IMAGE_CAPTIONS)
      const captionsText = captionEntries.map(([url, caption], idx) => `${idx + 1}. ${caption}`).join("\n")
      contextParts.push(`\n## Image Captions:\n${captionsText}`)
    }

    const context = contextParts.join("\n\n")

    console.log("[v0] Starting AI generation")
    console.log("[v0] Model:", getSummaryModel())
    console.log("[v0] Context length:", context.length)

    // Generate structured summary using AI
    const { object } = await generateObject({
      model: getSummaryModel(),
      schema: summarySchema,
      system:
        "You write concise, factual, warm heirloom descriptions. Never invent facts; use 'likely' or 'appears to' when unsure. " +
        "Focus on what makes this artifact meaningful and memorable. Be specific but avoid speculation.",
      prompt: `Based on the following content from a family heirloom artifact, generate a structured summary:\n\n${context}`,
      maxOutputTokens: 2000,
    })

    console.log("[v0] AI generation complete")
    console.log("[v0] Generated description preview:", object.description_markdown?.substring(0, 150) + "...")

    // Save the description to the database
    console.log("[v0] Saving ai_description to database")
    const { data: updateData, error: updateError } = await supabase
      .from("artifacts")
      .update({
        ai_description: object.description_markdown,
        analysis_status: "done",
        analysis_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", artifactId)
      .select()

    if (updateError) {
      console.error("[v0] ERROR: Failed to save summary:", updateError)
      throw new Error(`Failed to save summary: ${updateError.message}`)
    }

    console.log("[v0] Database update successful:", updateData)
    console.log("[v0] Revalidating paths")
    revalidatePath(`/artifacts/${artifactId}`)
    revalidatePath(`/artifacts/${artifactId}/edit`)

    console.log("[v0] === SUMMARY API ROUTE COMPLETE ===")
    return NextResponse.json({ ok: true, object })
  } catch (error) {
    console.error("[v0] === SUMMARY API ROUTE ERROR ===", error)

    // Save error status to database
    try {
      const body = await request.json()
      const { artifactId } = body
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
      { error: error instanceof Error ? error.message : "Summary generation failed" },
      { status: 500 },
    )
  }
}
