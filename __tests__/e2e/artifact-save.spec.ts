import { test, expect } from "@playwright/test"
import { setupAuthMocks } from "./helpers/auth"

test.describe("Artifact Save Flow", () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthMocks(page)

    // Navigate to home (now authenticated)
    await page.goto("/")
  })

  test("should save artifact changes without beforeunload warning", async ({ page, context }) => {
    // Navigate to an artifact edit page
    await page.goto("/artifacts")

    await page.waitForSelector("[data-testid='artifact-link']", { timeout: 10000 })

    // Click on an artifact to view it
    const firstArtifactLink = page.locator("[data-testid='artifact-link']").first()
    await firstArtifactLink.click()

    // Wait for the artifact detail page to load
    await page.waitForURL(/\/artifacts\/[^/]+$/)

    // Click the edit button (or navigate to edit page)
    const editButton = page.locator("button:has-text('Edit')")
    if (await editButton.isVisible()) {
      await editButton.click()
    } else {
      // Navigate directly to edit page
      const currentUrl = page.url()
      const slug = currentUrl.split("/").pop()
      await page.goto(`/artifacts/${slug}/edit`)
    }

    await page.waitForSelector("input[placeholder='Enter artifact title']", { timeout: 5000 })

    // Make a change to the title
    const titleInput = page.locator("input[placeholder='Enter artifact title']")
    await titleInput.fill("Updated Artifact Title")

    // Listen for dialog events (beforeunload)
    let dialogFired = false
    page.on("dialog", async (dialog) => {
      console.log("Dialog appeared:", dialog.message())
      dialogFired = true
      await dialog.dismiss()
    })

    // Click save button
    const saveButton = page.locator("button:has-text('Save Changes')")
    await saveButton.click()

    // Wait for the redirect to happen
    await page.waitForURL(/\/artifacts\/[^/]+$/, { timeout: 10000 })

    // Verify no dialog was shown
    expect(dialogFired).toBe(false)

    // Verify the page redirected successfully
    const currentUrl = page.url()
    expect(currentUrl).toContain("/artifacts/")
    expect(currentUrl).not.toContain("/edit")
  })

  test("should use returned slug for redirect", async ({ page }) => {
    // Navigate to edit page
    await page.goto("/artifacts")

    await page.waitForSelector("[data-testid='artifact-link']", { timeout: 10000 })

    const firstArtifactLink = page.locator("[data-testid='artifact-link']").first()
    await firstArtifactLink.click()

    await page.waitForURL(/\/artifacts\/[^/]+$/)

    const slug = page.url().split("/").pop()

    // Navigate to edit
    await page.goto(`/artifacts/${slug}/edit`)

    await page.waitForSelector("input[placeholder='Enter artifact title']", { timeout: 5000 })

    // Change the title significantly
    const titleInput = page.locator("input[placeholder='Enter artifact title']")
    const newTitle = `Updated ${Date.now()}`
    await titleInput.fill(newTitle)

    // Save
    const saveButton = page.locator("button:has-text('Save Changes')")
    await saveButton.click()

    // Wait for redirect
    await page.waitForURL(/\/artifacts\/[^/]+$/, { timeout: 10000 })

    // Verify the redirect URL is valid (contains a slug)
    const finalUrl = page.url()
    expect(finalUrl).toMatch(/\/artifacts\/[a-z0-9-]+$/)
  })

  test("should show warning when navigating away with unsaved changes", async ({ page, context }) => {
    await page.goto("/artifacts")

    await page.waitForSelector("[data-testid='artifact-link']", { timeout: 10000 })

    const firstArtifactLink = page.locator("[data-testid='artifact-link']").first()
    await firstArtifactLink.click()

    await page.waitForURL(/\/artifacts\/[^/]+$/)

    const slug = page.url().split("/").pop()
    await page.goto(`/artifacts/${slug}/edit`)

    await page.waitForSelector("input[placeholder='Enter artifact title']", { timeout: 5000 })

    // Make a change
    const titleInput = page.locator("input[placeholder='Enter artifact title']")
    await titleInput.fill("Unsaved Changes")

    // Try to navigate away without saving
    let dialogFired = false
    page.on("dialog", async (dialog) => {
      dialogFired = true
      await dialog.accept()
    })

    // Attempt to navigate away
    await page.goto("/artifacts")

    // Dialog should have been shown
    await page.waitForTimeout(500)
    expect(dialogFired).toBe(true)
  })

  test("should not show warning when navigating away after saving", async ({ page, context }) => {
    await page.goto("/artifacts")

    await page.waitForSelector("[data-testid='artifact-link']", { timeout: 10000 })

    const firstArtifactLink = page.locator("[data-testid='artifact-link']").first()
    await firstArtifactLink.click()

    await page.waitForURL(/\/artifacts\/[^/]+$/)

    const slug = page.url().split("/").pop()
    await page.goto(`/artifacts/${slug}/edit`)

    await page.waitForSelector("input[placeholder='Enter artifact title']", { timeout: 5000 })

    // Make a change
    const titleInput = page.locator("input[placeholder='Enter artifact title']")
    await titleInput.fill("Changes to Save")

    // Save
    const saveButton = page.locator("button:has-text('Save Changes')")
    await saveButton.click()

    // Wait for redirect after save
    await page.waitForURL(/\/artifacts\/[^/]+$/, { timeout: 10000 })

    // Now try to navigate away
    let dialogFired = false
    page.on("dialog", async (dialog) => {
      dialogFired = true
      await dialog.dismiss()
    })

    await page.goto("/artifacts")

    // Dialog should NOT have been shown since we already saved
    await page.waitForTimeout(500)
    expect(dialogFired).toBe(false)
  })

  test("should have audio input for title field", async ({ page }) => {
    await page.goto("/artifacts")

    await page.waitForSelector("[data-testid='artifact-link']", { timeout: 10000 })

    const firstArtifactLink = page.locator("[data-testid='artifact-link']").first()
    await firstArtifactLink.click()

    await page.waitForURL(/\/artifacts\/[^/]+$/)

    const slug = page.url().split("/").pop()
    await page.goto(`/artifacts/${slug}/edit`)

    await page.waitForSelector("input[placeholder='Enter artifact title']", { timeout: 5000 })

    // Check for microphone button (audio input indicator)
    const micButton = page.locator("button[aria-label*='Record'], button:has-text('🎤'), [role='button']:has-text('♪')")

    // The TranscriptionInput component should have an audio/record button
    // Check if the title field has transcription capabilities
    const titleSection = page.locator("label:has-text('Title')").locator("..")
    const audioIndicator = titleSection.locator("button, [class*='mic'], [class*='audio']")

    // Verify audio input is available for title
    expect(await audioIndicator.count()).toBeGreaterThan(0)
  })
})
