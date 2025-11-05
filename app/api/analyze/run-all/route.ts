import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

const STEP_TIMEOUT_MS = 45000 // 45 seconds per step
const RETRY_DELAY_MIN_MS = 500
const RETRY_DELAY_MAX_MS = 1500

type AnalysisStep = "audio" | "images" | "summary"

/**
 * Call an analysis endpoint with timeout and single retry
 */
async function callAnalysisStep(
  step: AnalysisStep,
  artifactId: string,
  baseUrl: string,
): Promise<{ ok: boolean; error?: string }> {
  const url = `${baseUrl}/api/analyze/${step}`

  const attemptCall = async (): Promise<Response> => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), STEP_TIMEOUT_MS)

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artifactId }),
        signal: controller.signal,
      })
      clearTimeout(timeoutId)
      return response
    } catch (error) {
      clearTimeout(timeoutId)
      throw error
    }
  }

  // First attempt
  try {
    const response = await attemptCall()
    const data = await response.json()

    if (response.ok) {
      return { ok: true }
    }

    // Non-OK response, prepare for retry
    const errorMessage = data.error || `${step} analysis failed with status ${response.status}`
    console.log(`[v0] ${step} analysis failed (attempt 1), will retry:`, errorMessage)

    // Wait before retry
    const retryDelay = Math.floor(Math.random() * (RETRY_DELAY_MAX_MS - RETRY_DELAY_MIN_MS + 1)) + RETRY_DELAY_MIN_MS
    await new Promise((resolve) => setTimeout(resolve, retryDelay))

    // Retry attempt
    const retryResponse = await attemptCall()
    const retryData = await retryResponse.json()

    if (retryResponse.ok) {
      console.log(`[v0] ${step} analysis succeeded on retry`)
      return { ok: true }
    }

    return {
      ok: false,
      error: retryData.error || `${step} analysis failed after retry with status ${retryResponse.status}`,
    }
  } catch (error) {
    // Network error or timeout
    const errorMessage =
      error instanceof Error
        ? error.name === "AbortError"
          ? `${step} analysis timed out after ${STEP_TIMEOUT_MS}ms`
          : error.message
        : "Unknown error"

    console.log(`[v0] ${step} analysis error (attempt 1), will retry:`, errorMessage)

    // Wait before retry
    const retryDelay = Math.floor(Math.random() * (RETRY_DELAY_MAX_MS - RETRY_DELAY_MIN_MS + 1)) + RETRY_DELAY_MIN_MS
    await new Promise((resolve) => setTimeout(resolve, retryDelay))

    // Retry attempt
    try {
      const retryResponse = await attemptCall()
      const retryData = await retryResponse.json()

      if (retryResponse.ok) {
        console.log(`[v0] ${step} analysis succeeded on retry`)
        return { ok: true }
      }

      return {
        ok: false,
        error: retryData.error || `${step} analysis failed after retry`,
      }
    } catch (retryError) {
      return {
        ok: false,
        error:
          retryError instanceof Error
            ? retryError.name === "AbortError"
              ? `${step} analysis timed out after ${STEP_TIMEOUT_MS}ms (retry)`
              : retryError.message
            : "Unknown error on retry",
      }
    }
  }
}

export async function POST(request: Request) {
  let artifactId: string | undefined

  try {
    const body = await request.json()
    artifactId = body.artifactId

    if (!artifactId) {
      return NextResponse.json({ error: "artifactId is required" }, { status: 400 })
    }

    const supabase = await createClient()

    // Verify artifact exists
    const { data: artifact, error: fetchError } = await supabase
      .from("artifacts")
      .select("id")
      .eq("id", artifactId)
      .single()

    if (fetchError || !artifact) {
      return NextResponse.json({ error: "Artifact not found" }, { status: 404 })
    }

    // Set initial processing status
    await supabase
      .from("artifacts")
      .update({ analysis_status: "processing", analysis_error: null })
      .eq("id", artifactId)

    // Get base URL for internal API calls
    const protocol = request.headers.get("x-forwarded-proto") || "http"
    const host = request.headers.get("host") || "localhost:3000"
    const baseUrl = `${protocol}://${host}`

    // Sequential analysis steps
    const steps: AnalysisStep[] = ["audio", "images", "summary"]

    for (const step of steps) {
      console.log(`[v0] Starting ${step} analysis for artifact ${artifactId}`)

      const result = await callAnalysisStep(step, artifactId, baseUrl)

      if (!result.ok) {
        const errorMessage = `failed at ${step}: ${result.error}`
        console.error(`[v0] Analysis pipeline failed:`, errorMessage)

        // Update artifact with error status
        await supabase
          .from("artifacts")
          .update({
            analysis_status: "error",
            analysis_error: errorMessage,
          })
          .eq("id", artifactId)

        return NextResponse.json({ ok: false, step, error: result.error }, { status: 500 })
      }

      console.log(`[v0] Completed ${step} analysis for artifact ${artifactId}`)
    }

    // All steps succeeded - set final status to done
    await supabase.from("artifacts").update({ analysis_status: "done", analysis_error: null }).eq("id", artifactId)

    console.log(`[v0] All analysis steps completed successfully for artifact ${artifactId}`)

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[v0] Run-all analysis error:", error)

    // Save error status to database if we have an artifactId
    if (artifactId) {
      try {
        const supabase = await createClient()
        await supabase
          .from("artifacts")
          .update({
            analysis_status: "error",
            analysis_error: error instanceof Error ? error.message : "Unknown error in analysis pipeline",
          })
          .eq("id", artifactId)
      } catch (dbError) {
        console.error("[v0] Failed to save error status:", dbError)
      }
    }

    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Analysis pipeline failed" },
      { status: 500 },
    )
  }
}
