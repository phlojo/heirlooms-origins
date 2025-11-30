import { vi } from "vitest"

export const mockOpenAIImageAnalysis = {
  id: "chatcmpl-test123",
  object: "chat.completion",
  created: 1704067200,
  model: "gpt-4-vision",
  choices: [
    {
      index: 0,
      message: {
        role: "assistant",
        content:
          "This image shows a beautiful landscape with mountains, trees, and a clear sky. The composition is well-balanced with good use of natural light.",
      },
      finish_reason: "stop",
    },
  ],
  usage: {
    prompt_tokens: 100,
    completion_tokens: 50,
    total_tokens: 150,
  },
}

export const mockOpenAITranscription = {
  text: "This is a test transcription of the audio file. The quality is clear and the speech is well-articulated.",
  language: "en",
  duration: 30.5,
}

export const mockOpenAITextCompletion = {
  id: "chatcmpl-test456",
  object: "chat.completion",
  created: 1704067200,
  model: "gpt-4",
  choices: [
    {
      index: 0,
      message: {
        role: "assistant",
        content: "This is a test completion response from OpenAI API for summarization.",
      },
      finish_reason: "stop",
    },
  ],
  usage: {
    prompt_tokens: 50,
    completion_tokens: 40,
    total_tokens: 90,
  },
}

export const mockOpenAIAPI = {
  createImageAnalysis: vi.fn().mockResolvedValue(mockOpenAIImageAnalysis),
  transcribeAudio: vi.fn().mockResolvedValue(mockOpenAITranscription),
  generateCompletion: vi.fn().mockResolvedValue(mockOpenAITextCompletion),
  analyzeVideo: vi.fn().mockResolvedValue(mockOpenAIImageAnalysis),
}

/**
 * Setup OpenAI mock fetch responses
 */
export const setupOpenAIMocks = () => {
  global.fetch = vi.fn((url: RequestInfo | URL, options?: RequestInit) => {
    const urlString = typeof url === "string" ? url : url.toString()

    if (urlString.includes("openai.com")) {
      if (urlString.includes("/v1/chat/completions")) {
        return Promise.resolve(new Response(JSON.stringify(mockOpenAITextCompletion)))
      }
      if (urlString.includes("/v1/audio/transcriptions")) {
        return Promise.resolve(new Response(JSON.stringify(mockOpenAITranscription)))
      }
    }

    return Promise.reject(new Error("Unknown fetch URL"))
  }) as typeof fetch

  return mockOpenAIAPI
}

/**
 * Mock Vercel AI SDK streaming response
 */
export const mockAIStreamingResponse = {
  text: async function* () {
    yield "This is "
    yield "a streamed "
    yield "response from OpenAI."
  },
}
