import { test, expect } from "./global.setup"
import { getFirstArtifactSlug } from "./helpers/test-data"

test.describe("Artifact Save Flow", () => {
  let testSlug: string

  test.beforeEach(async ({ page }) => {
    testSlug = await getFirstArtifactSlug(page)
    // Note: getFirstArtifactSlug now navigates to the edit page and verifies access
    // So we're already on /artifacts/${testSlug}/edit after this call
  })

  test("should save artifact changes without beforeunload warning", async ({ page }) => {
    // Just wait for the form to be fully ready
    await page.waitForLoadState("networkidle")

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
    const finalUrl = page.url()
    expect(finalUrl).toContain("/artifacts/")
    expect(finalUrl).not.toContain("/edit")
  })

  test("should use returned slug for redirect", async ({ page }) => {
    await page.waitForLoadState("networkidle")

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
    await page.waitForLoadState("networkidle")

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
    await page.waitForLoadState("networkidle")

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
    await page.waitForLoadState("networkidle")

    // Look for audio/microphone button near the title field
    // The TranscriptionInput component includes a mic button
    const titleSection = page.locator("label:has-text('Title')").locator("..")
    const audioButton = titleSection.locator("button[aria-label*='Record'], button[aria-label*='microphone']")

    // Verify audio input functionality exists
    const audioButtonCount = await audioButton.count()
    expect(audioButtonCount).toBeGreaterThan(0)
  })
})
