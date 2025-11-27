import { createClient } from "@/lib/supabase/server"
import { openai, getSummaryModel } from "@/lib/ai"
import { generateObject } from "ai"
import { NextResponse } from "next/server"
import { z } from "zod"
import { revalidatePath } from "next/cache"
import { rateLimit } from "@/lib/utils/rate-limit"

const MAX_TRANSCRIPT_LENGTH = 10000
const MAX_IMAGE_CAPTIONS = 3

const summarySchema = z.object({
  description_markdown: z.string().describe("A concise, factual, warm heirloom description in markdown format"),
  highlights: z.array(z.string()).optional().describe("Key highlights or memorable moments (max 5)"),
  people: z.array(z.string()).optional().describe("Names of people mentioned or identified"),
  places: z.array(z.string()).optional().describe("Locations or places mentioned"),
  year_guess: z.number().int().optional().describe("Estimated year if determinable from context"),
  tags: z.array(z.string()).optional().describe("Relevant tags or categories"),
})

export async function POST(request: Request): Promise<NextResponse> {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
  const { ok, retryAfterMs } = rateLimit(ip)
  
  if (!ok) {
    return NextResponse.json(
      { error: "Too Many Requests" },
      { status: 429, headers: { "Retry-After": String(Math.ceil((retryAfterMs || 0) / 1000)) } },
    )
  }

  try {
    const body = await request.json()
    const { artifactId } = body

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

    const transcript = artifact.transcript
    const imageCaptions = artifact.image_captions as Record<string, string> | null

    if (!transcript && (!imageCaptions || Object.keys(imageCaptions).length === 0)) {
      return NextResponse.json({ error: "No transcript or image captions available for summary" }, { status: 400 })
    }

    await supabase
      .from("artifacts")
      .update({ analysis_status: "processing", analysis_error: null })
      .eq("id", artifactId)

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

    try {
      const result = await generateObject({
        model: openai(getSummaryModel()),
        schema: summarySchema,
        system:
          "You are an AI that generates structured summaries for family heirloom artifacts. " +
          "Write concise, factual, warm descriptions in markdown format. " +
          "Never invent facts; use 'likely' or 'appears to' when unsure. " +
          "Focus on what makes this artifact meaningful and memorable. Be specific but avoid speculation. " +
          "The description_markdown field is REQUIRED and must be at least 20 characters.",
        prompt: `Based on the following content from a family heirloom artifact, generate a structured summary.

${context}

Generate a JSON object with these fields:
- description_markdown (REQUIRED): A warm, factual description (2-4 sentences) in markdown format
- highlights (optional): Array of key moments or details (max 5 items)
- people (optional): Array of names mentioned
- places (optional): Array of locations mentioned  
- year_guess (optional): Estimated year as integer
- tags (optional): Array of relevant tags

Focus on creating a meaningful, warm description that captures the essence of this heirloom.`,
        maxTokens: 2000,
      })

      const finalObject = result.object

      if (!finalObject || !finalObject.description_markdown || finalObject.description_markdown.trim().length === 0) {
        throw new Error("AI did not generate a valid description")
      }

      const { error: updateError } = await supabase
        .from("artifacts")
        .update({
          ai_description: finalObject.description_markdown,
          analysis_status: "done",
          analysis_error: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", artifactId)

      if (updateError) {
        throw new Error(`Failed to save summary: ${updateError.message}`)
      }

      revalidatePath(`/artifacts/${artifact.slug}`)

      return NextResponse.json({ ok: true, object: finalObject })
    } catch (aiError) {
      const errorMessage = aiError instanceof Error ? aiError.message : "AI generation failed with unknown error"
      throw new Error(errorMessage)
    }
  } catch (error) {
    try {
      const body = await request.json()
      const { artifactId } = body
      if (artifactId) {
        const supabase = await createClient()
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
        await supabase
          .from("artifacts")
          .update({
            analysis_status: "error",
            analysis_error: errorMessage,
          })
          .eq("id", artifactId)
      }
    } catch (dbError) {
      console.error("Failed to save error status:", dbError)
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Summary generation failed" },
      { status: 500 },
    )
  }
}
