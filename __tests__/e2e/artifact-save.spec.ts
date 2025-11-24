import { test, expect } from "./global.setup"
import { createTestArtifact } from "./helpers/test-data"

test.describe("Artifact Save Flow", () => {
  let testSlug: string

  test.beforeEach(async ({ page }) => {
    // Create a fresh test artifact before each test
    testSlug = await createTestArtifact(page, `Test Artifact ${Date.now()}`)
  })

  test("should save artifact changes without beforeunload warning", async ({ page }) => {
    // Navigate directly to the edit page using the slug from setup
    await page.goto(`/artifacts/${testSlug}/edit`)

    // Wait for the form to load
    await page.waitForSelector("input[placeholder='Enter artifact title']", { timeout: 5000 })

    // Update the title
    const titleInput = page.getByPlaceholder("Enter artifact title")
    await titleInput.fill("Updated Artifact Title")

    // Listen for any dialogs
    let dialogFired = false
    page.on("dialog", async (dialog) => {
      console.log("Dialog appeared:", dialog.message())
      dialogFired = true
      await dialog.dismiss()
    })

    // Save the changes
    const saveButton = page.getByRole("button", { name: /save changes/i })
    await saveButton.click()

    // Wait for redirect back to detail view
    await page.waitForURL(/\/artifacts\/[^/]+$/, { timeout: 10000 })

    // Verify no dialog appeared
    expect(dialogFired).toBe(false)

    // Verify we're on the detail page, not edit page
    const currentUrl = page.url()
    expect(currentUrl).toContain("/artifacts/")
    expect(currentUrl).not.toContain("/edit")
  })

  test("should use returned slug for redirect", async ({ page }) => {
    // Navigate to edit page
    await page.goto(`/artifacts/${testSlug}/edit`)

    await page.waitForSelector("input[placeholder='Enter artifact title']", { timeout: 5000 })

    // Update with a unique title
    const titleInput = page.getByPlaceholder("Enter artifact title")
    const newTitle = `Updated ${Date.now()}`
    await titleInput.fill(newTitle)

    // Save changes
    const saveButton = page.getByRole("button", { name: /save changes/i })
    await saveButton.click()

    // Wait for redirect
    await page.waitForURL(/\/artifacts\/[^/]+$/, { timeout: 10000 })

    // Verify final URL has a valid slug format
    const finalUrl = page.url()
    expect(finalUrl).toMatch(/\/artifacts\/[a-z0-9-]+$/)
  })

  test("should show warning when navigating away with unsaved changes", async ({ page }) => {
    // Navigate to edit page
    await page.goto(`/artifacts/${testSlug}/edit`)

    await page.waitForSelector("input[placeholder='Enter artifact title']", { timeout: 5000 })

    // Make changes without saving
    const titleInput = page.getByPlaceholder("Enter artifact title")
    await titleInput.fill("Unsaved Changes")

    // Listen for beforeunload dialog
    let dialogFired = false
    page.on("dialog", async (dialog) => {
      dialogFired = true
      await dialog.accept()
    })

    // Try to navigate away
    await page.goto("/artifacts")

    // Give time for dialog to fire
    await page.waitForTimeout(500)
    expect(dialogFired).toBe(true)
  })

  test("should not show warning when navigating away after saving", async ({ page }) => {
    // Navigate to edit page
    await page.goto(`/artifacts/${testSlug}/edit`)

    await page.waitForSelector("input[placeholder='Enter artifact title']", { timeout: 5000 })

    // Make and save changes
    const titleInput = page.getByPlaceholder("Enter artifact title")
    await titleInput.fill("Changes to Save")

    const saveButton = page.getByRole("button", { name: /save changes/i })
    await saveButton.click()

    // Wait for redirect
    await page.waitForURL(/\/artifacts\/[^/]+$/, { timeout: 10000 })

    // Listen for dialogs
    let dialogFired = false
    page.on("dialog", async (dialog) => {
      dialogFired = true
      await dialog.dismiss()
    })

    // Navigate away - should not trigger warning
    await page.goto("/artifacts")

    await page.waitForTimeout(500)
    expect(dialogFired).toBe(false)
  })

  test("should have audio input for title field", async ({ page }) => {
    // Navigate to edit page
    await page.goto(`/artifacts/${testSlug}/edit`)

    await page.waitForSelector("input[placeholder='Enter artifact title']", { timeout: 5000 })

    // Look for audio/microphone button near the title field
    // The TranscriptionInput component includes a mic button
    const titleSection = page.locator("label:has-text('Title')").locator("..")
    const audioButton = titleSection.locator("button[aria-label*='Record'], button[aria-label*='microphone']")

    // Verify audio input functionality exists
    const audioButtonCount = await audioButton.count()
    expect(audioButtonCount).toBeGreaterThan(0)
  })
})
