import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const audioFile = formData.get("audio") as File
    const fieldType = formData.get("fieldType") as string

    if (!audioFile) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 })
    }

    // Use OpenAI Whisper API for transcription
    const transcriptionFormData = new FormData()
    transcriptionFormData.append("file", audioFile)
    transcriptionFormData.append("model", process.env.AI_TRANSCRIBE_MODEL || "whisper-1")

    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: transcriptionFormData,
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[v0] Transcription API error:", errorText)
      return NextResponse.json({ error: "Failed to transcribe audio" }, { status: response.status })
    }

    const result = await response.json()
    let transcription = result.text || ""

    // Truncate based on field type
    if (fieldType === "title") {
      transcription = transcription.substring(0, 100)
    } else if (fieldType === "description") {
      transcription = transcription.substring(0, 3000)
    }

    return NextResponse.json({ transcription })
  } catch (error) {
    console.error("[v0] Transcription error:", error)
    return NextResponse.json({ error: "Failed to process transcription" }, { status: 500 })
  }
}
