import type { Page } from "@playwright/test"

/**
 * Creates a test artifact with the given title and optional media.
 * Returns the slug of the created artifact.
 *
 * @param page - Playwright Page object
 * @param title - Title for the artifact
 * @returns The slug of the created artifact
 */
export async function createTestArtifact(page: Page, title: string): Promise<string> {
  // Navigate to the new artifact page
  await page.goto("/artifacts/new")

  // Wait for the form to load
  await page.waitForSelector("input[placeholder='Enter artifact title']", { timeout: 10000 })

  // Fill in the title
  await page.getByPlaceholder("Enter artifact title").fill(title)

  // Select an artifact type (e.g., "Document")
  const typeSelect = page.locator("button:has-text('Select type')").first()
  if (await typeSelect.isVisible({ timeout: 2000 })) {
    await typeSelect.click()
    // Select the first option
    await page.locator("[role='option']").first().click()
  }

  // Submit the form
  await page.getByRole("button", { name: /create artifact/i }).click()

  // Wait for redirect to the artifact detail page
  await page.waitForURL(/\/artifacts\/[^/]+$/, { timeout: 10000 })

  // Extract and return the slug from the URL
  const url = page.url()
  const slug = url.split("/").pop() || ""
  return slug
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
