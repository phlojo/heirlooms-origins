import type { Page } from "@playwright/test"

/**
 * Gets the slug of the first artifact from the artifacts list.
 * This is more reliable than creating a new artifact for E2E tests.
 *
 * @param page - Playwright Page object
 * @returns The slug of the first artifact
 */
export async function getFirstArtifactSlug(page: Page): Promise<string> {
  console.log("[v0] Getting first artifact from list")

  // Navigate to artifacts page
  await page.goto("/artifacts")

  await page.waitForLoadState("networkidle")

  // Wait for artifacts to load with better error handling
  try {
    await page.waitForSelector("[data-testid='artifact-link']", { timeout: 15000 })
  } catch (error) {
    await page.screenshot({ path: "test-results/no-artifacts-found.png", fullPage: true })
    throw new Error("No artifacts found on /artifacts page. Make sure test data exists in the database.")
  }

  // Get the first artifact link
  const firstArtifactLink = page.locator("[data-testid='artifact-link']").first()
  const href = await firstArtifactLink.getAttribute("href")

  if (!href) {
    throw new Error("No artifact link found")
  }

  // Extract slug from href
  const matches = href.match(/\/artifacts\/([^/]+)$/)
  if (!matches || !matches[1]) {
    throw new Error(`Failed to extract slug from href: ${href}`)
  }

  const slug = matches[1]
  console.log("[v0] Found artifact slug:", slug)

  await page.goto(`/artifacts/${slug}/edit`)
  await page.waitForLoadState("networkidle")

  const editPageUrl = page.url()
  console.log("[v0] Edit page URL:", editPageUrl)

  // Check if we're still on the edit page (not redirected to login or 404)
  if (!editPageUrl.includes(`/artifacts/${slug}/edit`)) {
    throw new Error(`Cannot edit artifact ${slug} - permission denied or redirected to ${editPageUrl}`)
  }

  // Verify the edit form is actually present
  try {
    await page.waitForSelector("input[placeholder='Enter artifact title']", { timeout: 5000 })
    console.log("[v0] Verified artifact is editable by current user")
  } catch (error) {
    await page.screenshot({ path: "test-results/edit-form-not-visible.png", fullPage: true })
    throw new Error(`Edit form not visible for artifact ${slug} - user may not have permission`)
  }

  return slug
}

/**
 * Creates a test artifact with the given title and optional media.
 * Returns the slug of the created artifact.
 *
 * Note: This function requires media upload which is complex in E2E tests.
 * Consider using getFirstArtifactSlug() instead for simpler E2E workflows.
 *
 * @param page - Playwright Page object
 * @param title - Title for the artifact
 * @returns The slug of the created artifact
 */
export async function createTestArtifact(page: Page, title: string): Promise<string> {
  console.log("[v0] Creating test artifact:", title)

  // Navigate to the new artifact page
  await page.goto("/artifacts/new")

  // Wait for the form to load
  await page.waitForSelector("input[placeholder='Enter artifact title']", { timeout: 10000 })

  // Fill in the title
  await page.getByPlaceholder("Enter artifact title").fill(title)

  await page.waitForTimeout(500)

  // Open the Add Media modal
  const addMediaButton = page.getByRole("button", { name: /add media/i })
  await addMediaButton.click()
  await page.waitForTimeout(1000)

  // Note: At this point, we'd need to interact with the Cloudinary upload widget,
  // which is a complex iframe interaction. For E2E tests, it's better to use
  // existing artifacts. This function is kept as a placeholder for future improvements.

  throw new Error(
    "createTestArtifact requires media upload which is not yet implemented in E2E tests. Use getFirstArtifactSlug() instead.",
  )
}

/**
 * Creates a test collection with the given title.
 * Returns the slug of the created collection.
 *
 * @param page - Playwright Page object
 * @param title - Title for the collection
 * @returns The slug of the created collection
 */
export async function createTestCollection(page: Page, title: string): Promise<string> {
  // Navigate to the new collection page
  await page.goto("/collections/new")

  // Wait for the form to load
  await page.waitForSelector("input[placeholder*='title'], input[name='title']", { timeout: 10000 })

  // Fill in the title
  await page.getByLabel(/title/i).fill(title)

  // Submit the form
  await page.getByRole("button", { name: /create collection/i }).click()

  // Wait for redirect to the collection detail page
  await page.waitForURL(/\/collections\/[^/]+$/, { timeout: 10000 })

  // Extract and return the slug from the URL
  const url = page.url()
  const slug = url.split("/").pop() || ""
  return slug
}

/**
 * Deletes all test artifacts and collections created during the test.
 * This is a cleanup helper to be used in afterEach or afterAll hooks.
 *
 * Note: In a real implementation, this would call an admin API endpoint
 * or directly manipulate the database. For now, it's a placeholder.
 *
 * @param page - Playwright Page object
 */
export async function cleanupTestData(page: Page): Promise<void> {
  // TODO: Implement cleanup logic
  // This could call an admin API endpoint like:
  // await page.request.delete('/api/admin/cleanup-test-data')

  // For now, we'll just navigate to home to ensure clean state
  await page.goto("/")
}
