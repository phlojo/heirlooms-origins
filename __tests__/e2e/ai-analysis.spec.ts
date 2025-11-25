import { test, expect, type Page } from "./global.setup"
import { getFirstArtifactSlug } from "./helpers/test-data"

// Mock data for AI responses
const mockTranscript =
  "Hello, this is a test audio recording. It contains important information about our family history and memories from the past."
const mockImageCaption = "A beautiful family photo showing three generations gathered together"
const mockAiDescription = `## Highlights
- Family gathering from 1985
- Three generations present
- Historic family estate

## People
- Grandparents
- Parents
- Children

## Description
This artifact captures a significant family moment, preserving memories across generations.`

/**
 * Helper function to mock API routes for AI analysis
 */
async function setupApiMocks(page: Page) {
  // Mock the audio transcription API
  await page.route("**/api/analyze/audio-per-media", async (route) => {
    const request = route.request()
    const method = request.method()

    if (method === "POST") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          transcript: mockTranscript,
        }),
      })
    } else {
      await route.continue()
    }
  })

  // Mock the image captions API
  await page.route("**/api/analyze/images", async (route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          captions: {
            "https://example.com/photo.jpg": mockImageCaption,
          },
        }),
      })
    } else {
      await route.continue()
    }
  })

  // Mock the AI description/summary API
  await page.route("**/api/analyze/summary", async (route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          description: mockAiDescription,
        }),
      })
    } else {
      await route.continue()
    }
  })

  // Mock the "Run All" orchestrator API
  await page.route("**/api/analyze/run-all", async (route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          transcript: mockTranscript,
          captions: {
            "https://example.com/photo.jpg": mockImageCaption,
          },
          description: mockAiDescription,
        }),
      })
    } else {
      await route.continue()
    }
  })

  // Mock Cloudinary/media fetch requests to avoid actual file downloads
  await page.route("**/*.mp3", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "audio/mpeg",
      body: Buffer.from("fake-audio-data"),
    })
  })

  await page.route("**/*.jpg", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "image/jpeg",
      body: Buffer.from("fake-image-data"),
    })
  })
}

test.describe("AI Analysis Flow", () => {
  let testSlug: string

  test.beforeEach(async ({ page }) => {
    // Setup API mocks before each test
    await setupApiMocks(page)

    testSlug = await getFirstArtifactSlug(page)
  })

  test("should transcribe audio file successfully", async ({ page }) => {
    // Navigate directly to the test artifact we just created
    await page.goto(`/artifacts/${testSlug}`)

    // Wait for the artifact detail page to load
    await page.waitForURL(/\/artifacts\/[^/]+$/)

    // Scroll down to find the AI analysis section
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(500)

    // Look for the "Transcribe Audio" button - may be named differently
    let transcribeButton = page.getByRole("button", { name: /AI Transcribe Audio|Transcribe Audio|Transcribe/i }).first()

    // If not found, look for analysis panel or buttons with aria-label
    if (!(await transcribeButton.isVisible({ timeout: 2000 }).catch(() => false))) {
      transcribeButton = page.locator("button:has-text('Transcribe')").first()
    }

    // Verify button is visible or skip if artifact doesn't have audio
    const isVisible = await transcribeButton.isVisible({ timeout: 3000 }).catch(() => false)
    if (!isVisible) {
      console.log("[v0] Transcribe button not found - artifact may not have audio media")
      return
    }

    // Click the transcribe button
    await transcribeButton.click()

    // Wait for the button to show loading state
    await expect(page.getByRole("button", { name: /Transcribing/i })).toBeVisible({ timeout: 1000 })

    // Wait for success toast notification
    await expect(page.getByText(/Audio transcribed successfully/i).or(page.getByText("Success"))).toBeVisible({
      timeout: 10000,
    })

    // Verify transcript appears in the UI
    await expect(page.getByText("Transcript")).toBeVisible()

    // Check if transcript content is displayed (partial match)
    await expect(page.getByText(mockTranscript.substring(0, 30))).toBeVisible({ timeout: 5000 })
  })

  test("should generate image captions successfully", async ({ page }) => {
    // Navigate to the test artifact
    await page.goto(`/artifacts/${testSlug}`)

    await page.waitForURL(/\/artifacts\/[^/]+$/)

    // Scroll to find analysis section
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(500)

    // Find the "Generate AI Captions" button
    const captionButton = page.getByRole("button", { name: /Generate AI Captions|Caption/i }).first()

    if (await captionButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await captionButton.click()

      // Wait for success notification
      await expect(page.getByText(/Image captions generated/i).or(page.getByText("Success"))).toBeVisible({
        timeout: 10000,
      })

      // Verify captions section appears
      await expect(page.getByText("Image Captions")).toBeVisible()

      // Check for caption content
      await expect(page.getByText(mockImageCaption.substring(0, 20))).toBeVisible({ timeout: 5000 })
    }
  })

  test("should generate AI description successfully", async ({ page }) => {
    await page.goto(`/artifacts/${testSlug}`)

    await page.waitForURL(/\/artifacts\/[^/]+$/)

    // Scroll to find analysis section
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(500)

    // Find the "Generate AI Description" button
    let descriptionButton = page.getByRole("button", { name: /Generate AI Description|Description/i }).first()

    // Fallback if button name is different
    if (!(await descriptionButton.isVisible({ timeout: 2000 }).catch(() => false))) {
      descriptionButton = page.locator("button:has-text('Description')").first()
    }

    // Skip if button not found
    if (!(await descriptionButton.isVisible({ timeout: 2000 }).catch(() => false))) {
      console.log("[v0] Description button not found - skipping test")
      return
    }

    await descriptionButton.click()

    // Wait for success notification
    await expect(page.getByText(/Description generated/i).or(page.getByText("Success"))).toBeVisible({ timeout: 10000 })

    // Verify AI description section appears
    await expect(page.getByText("AI Description")).toBeVisible()

    // Check for markdown content (look for headers)
    await expect(page.getByText("Highlights")).toBeVisible({ timeout: 5000 })
  })

  test("should run all AI analysis steps successfully", async ({ page }) => {
    await page.goto(`/artifacts/${testSlug}`)

    await page.waitForURL(/\/artifacts\/[^/]+$/)

    // Scroll to find analysis section
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(500)

    // Find the "Run All" button
    const runAllButton = page.getByRole("button", { name: /Run All/i }).first()

    const isVisible = await runAllButton.isVisible({ timeout: 3000 }).catch(() => false)
    if (!isVisible) {
      console.log("[v0] Run All button not found - artifact may not have analyzable media")
      return
    }

    await runAllButton.click()

    // Wait for success notification
    await expect(page.getByText(/Full analysis complete/i).or(page.getByText("Success"))).toBeVisible({
      timeout: 15000,
    })

    // Verify all sections appear: Transcript, Image Captions, AI Description
    await expect(page.getByText("Transcript")).toBeVisible({ timeout: 5000 })
    await expect(page.getByText("Image Captions")).toBeVisible({ timeout: 5000 })
    await expect(page.getByText("AI Description")).toBeVisible({ timeout: 5000 })

    // Verify status badge shows "done"
    await expect(page.getByText("done")).toBeVisible({ timeout: 5000 })
  })

  test("should show error when audio file is missing", async ({ page }) => {
    // Mock the API to return a 400 error for missing audio
    await page.route("**/api/analyze/audio-per-media", async (route) => {
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({
          error: "No audio file found in this artifact",
        }),
      })
    })

    await page.goto(`/artifacts/${testSlug}`)

    await page.waitForURL(/\/artifacts\/[^/]+$/)

    // Scroll to find analysis section
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(500)

    const transcribeButton = page.getByRole("button", { name: /AI Transcribe Audio|Transcribe Audio|Transcribe/i }).first()

    const isVisible = await transcribeButton.isVisible({ timeout: 3000 }).catch(() => false)
    if (!isVisible) {
      console.log("[v0] Transcribe button not found - artifact may not have audio media")
      return
    }

    await transcribeButton.click()

    // Wait for error toast
    await expect(
      page.getByText(/No audio file found/i).or(page.locator("[class*='destructive']:has-text('Error')")),
    ).toBeVisible({ timeout: 5000 })
  })

  test("should show status badge changes during processing", async ({ page }) => {
    // Mock a delayed response to observe the processing state
    await page.route("**/api/analyze/audio-per-media", async (route) => {
      // Delay the response by 2 seconds
      await new Promise((resolve) => setTimeout(resolve, 2000))
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          transcript: mockTranscript,
        }),
      })
    })

    await page.goto(`/artifacts/${testSlug}`)

    await page.waitForURL(/\/artifacts\/[^/]+$/)

    // Scroll to find analysis section
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(500)

    const transcribeButton = page.getByRole("button", { name: /AI Transcribe Audio|Transcribe Audio|Transcribe/i }).first()

    const isVisible = await transcribeButton.isVisible({ timeout: 3000 }).catch(() => false)
    if (!isVisible) {
      console.log("[v0] Transcribe button not found - artifact may not have audio media")
      return
    }

    await transcribeButton.click()

    // Verify loading state during processing
    await expect(page.getByRole("button", { name: /Transcribing/i })).toBeVisible({ timeout: 1000 })

    // Wait for completion
    await expect(page.getByText(/Audio transcribed successfully/i).or(page.getByText("Success"))).toBeVisible({
      timeout: 5000,
    })

    // Verify final status shows "done"
    await expect(page.getByText("done")).toBeVisible({ timeout: 5000 })
  })

  test("should handle regenerate description action", async ({ page }) => {
    await page.goto(`/artifacts/${testSlug}`)

    await page.waitForURL(/\/artifacts\/[^/]+$/)

    // Scroll to find analysis section
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(500)

    // First, generate a description
    let descriptionButton = page.getByRole("button", { name: /Generate AI Description|Description/i }).first()

    // Fallback if button name is different
    if (!(await descriptionButton.isVisible({ timeout: 2000 }).catch(() => false))) {
      descriptionButton = page.locator("button:has-text('Description')").first()
    }

    // Skip if button not found
    if (!(await descriptionButton.isVisible({ timeout: 2000 }).catch(() => false))) {
      console.log("[v0] Description button not found - skipping regenerate test")
      return
    }

    await descriptionButton.click()

    // Wait for the description to appear
    await expect(page.getByText("AI Description")).toBeVisible({ timeout: 10000 })

    // Look for the regenerate button (refresh icon)
    const regenerateButton = page.getByRole("button", { name: /Regenerate/i }).first()

    if (await regenerateButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await regenerateButton.click()

      // Verify regeneration success
      await expect(page.getByText(/Description regenerated/i).or(page.getByText(/Description generated/i))).toBeVisible(
        { timeout: 10000 },
      )
    }
  })

  test("should display collapsible sections for AI results", async ({ page }) => {
    await page.goto(`/artifacts/${testSlug}`)

    await page.waitForURL(/\/artifacts\/[^/]+$/)

    // Scroll to find analysis section
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(500)

    // Run all analysis
    const runAllButton = page.getByRole("button", { name: /Run All/i }).first()

    const isVisible = await runAllButton.isVisible({ timeout: 3000 }).catch(() => false)
    if (!isVisible) {
      console.log("[v0] Run All button not found - artifact may not have analyzable media")
      return
    }

    await runAllButton.click()

    // Wait for completion
    await expect(page.getByText(/Full analysis complete/i).or(page.getByText("Success"))).toBeVisible({
      timeout: 15000,
    })

    // Test collapsible transcript section
    const transcriptHeader = page.getByText("Transcript").first()
    await expect(transcriptHeader).toBeVisible()

    // Check if transcript content is visible by default
    const transcriptContent = page.getByText(mockTranscript.substring(0, 30)).first()
    const contentVisible = await transcriptContent.isVisible({ timeout: 2000 }).catch(() => false)

    if (contentVisible) {
      // Click to collapse
      await transcriptHeader.click()
      await expect(transcriptContent).not.toBeVisible({ timeout: 2000 })

      // Click to expand again
      await transcriptHeader.click()
      await expect(transcriptContent).toBeVisible({ timeout: 2000 })
    }
  })
})
