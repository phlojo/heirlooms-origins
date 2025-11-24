import { test, expect } from "./global.setup"

test.describe("Artifact Save Flow", () => {
  test("should save artifact changes without beforeunload warning", async ({ page, context }) => {
    await page.goto("/artifacts")

    await page.waitForSelector("[data-testid='artifact-link']", { timeout: 10000 })

    const firstArtifactLink = page.locator("[data-testid='artifact-link']").first()
    await firstArtifactLink.click()

    await page.waitForURL(/\/artifacts\/[^/]+$/)

    const editButton = page.locator("button:has-text('Edit')")
    if (await editButton.isVisible()) {
      await editButton.click()
    } else {
      const currentUrl = page.url()
      const slug = currentUrl.split("/").pop()
      await page.goto(`/artifacts/${slug}/edit`)
    }

    await page.waitForSelector("input[placeholder='Enter artifact title']", { timeout: 5000 })

    const titleInput = page.locator("input[placeholder='Enter artifact title']")
    await titleInput.fill("Updated Artifact Title")

    let dialogFired = false
    page.on("dialog", async (dialog) => {
      console.log("Dialog appeared:", dialog.message())
      dialogFired = true
      await dialog.dismiss()
    })

    const saveButton = page.locator("button:has-text('Save Changes')")
    await saveButton.click()

    await page.waitForURL(/\/artifacts\/[^/]+$/, { timeout: 10000 })

    expect(dialogFired).toBe(false)

    const currentUrl = page.url()
    expect(currentUrl).toContain("/artifacts/")
    expect(currentUrl).not.toContain("/edit")
  })

  test("should use returned slug for redirect", async ({ page }) => {
    await page.goto("/artifacts")

    await page.waitForSelector("[data-testid='artifact-link']", { timeout: 10000 })

    const firstArtifactLink = page.locator("[data-testid='artifact-link']").first()
    await firstArtifactLink.click()

    await page.waitForURL(/\/artifacts\/[^/]+$/)

    const slug = page.url().split("/").pop()
    await page.goto(`/artifacts/${slug}/edit`)

    await page.waitForSelector("input[placeholder='Enter artifact title']", { timeout: 5000 })

    const titleInput = page.locator("input[placeholder='Enter artifact title']")
    const newTitle = `Updated ${Date.now()}`
    await titleInput.fill(newTitle)

    const saveButton = page.locator("button:has-text('Save Changes')")
    await saveButton.click()

    await page.waitForURL(/\/artifacts\/[^/]+$/, { timeout: 10000 })

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

    const titleInput = page.locator("input[placeholder='Enter artifact title']")
    await titleInput.fill("Unsaved Changes")

    let dialogFired = false
    page.on("dialog", async (dialog) => {
      dialogFired = true
      await dialog.accept()
    })

    await page.goto("/artifacts")

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

    const titleInput = page.locator("input[placeholder='Enter artifact title']")
    await titleInput.fill("Changes to Save")

    const saveButton = page.locator("button:has-text('Save Changes')")
    await saveButton.click()

    await page.waitForURL(/\/artifacts\/[^/]+$/, { timeout: 10000 })

    let dialogFired = false
    page.on("dialog", async (dialog) => {
      dialogFired = true
      await dialog.dismiss()
    })

    await page.goto("/artifacts")

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

    const micButton = page.locator("button[aria-label*='Record'], button:has-text('🎤'), [role='button']:has-text('♪')")

    const titleSection = page.locator("label:has-text('Title')").locator("..")
    const audioIndicator = titleSection.locator("button, [class*='mic'], [class*='audio']")

    expect(await audioIndicator.count()).toBeGreaterThan(0)
  })
})
