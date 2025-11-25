import type { Page } from "@playwright/test"

/**
 * Logs in to the application using the real login page and test credentials.
 * Uses environment variables E2E_EMAIL and E2E_PASSWORD.
 *
 * @param page - Playwright Page object
 * @throws Error if E2E credentials are not set in environment variables
 */
export async function login(page: Page): Promise<void> {
  const email = process.env.E2E_EMAIL
  const password = process.env.E2E_PASSWORD

  if (!email || !password) {
    throw new Error(
      "E2E test credentials are not set. Please set E2E_EMAIL and E2E_PASSWORD environment variables.\n" +
        "Example: E2E_EMAIL=e2e-test@heirlooms.local E2E_PASSWORD=TestUser123! pnpm test:e2e",
    )
  }

  // Navigate to the login page
  await page.goto("/login")

  // Wait for the login form to load
  await page.waitForSelector('input[type="email"]', { timeout: 10000 })

  // Fill in the email field
  await page.getByPlaceholder("you@example.com").fill(email)
  await page.waitForTimeout(500)

  // Click "Use password instead" to switch from magic link to password login
  const usePasswordButton = page.getByRole("button", { name: "Use password instead" })
  await usePasswordButton.waitFor({ state: "visible", timeout: 5000 })
  await usePasswordButton.click()

  // Wait for password field to appear (give it more time after button click)
  await page.waitForTimeout(500)
  await page.waitForSelector('input[type="password"]', { timeout: 10000 })

  // Fill in the password field
  const passwordInput = page.getByLabel("Password")
  await passwordInput.waitFor({ state: "visible", timeout: 5000 })
  await passwordInput.fill(password)
  await page.waitForTimeout(300)

  // Click the Sign In button (it will be enabled once both fields are filled)
  const signInButton = page.locator('button[type="submit"], button:has-text("Sign In")')
  await signInButton.waitFor({ state: "visible", timeout: 5000 })
  await signInButton.click()

  // Wait for button to show loading state (indicates form is processing)
  await page.waitForTimeout(1000)

  // Check if page actually navigated away from login within a short timeout
  const maxAttempts = 3
  let navigated = false

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      // Try a shorter timeout first to fail fast if credentials are wrong
      await page.waitForURL((url) => !url.pathname.includes("/login"), {
        timeout: 10000,
      })
      navigated = true
      break
    } catch (e) {
      // Diagnosis on intermediate attempts
      if (attempt < maxAttempts - 1) {
        const currentUrl = page.url()
        console.log(`[v0] Login attempt ${attempt + 1} still on: ${currentUrl}`)

        // Check for errors
        const alertText = await page.locator('[role="alert"]').textContent({ timeout: 1000 }).catch(() => null)
        if (alertText) {
          throw new Error(`Login failed with error: ${alertText.trim()}`)
        }

        // Wait a bit before retry
        await page.waitForTimeout(500)
      }
    }
  }

  if (!navigated) {
    const currentUrl = page.url()
    console.error("[v0] Login failed - still on login page after retries")
    console.error("[v0] Final URL:", currentUrl)

    // Provide helpful diagnostics
    const alertText = await page.locator('[role="alert"]').textContent({ timeout: 1000 }).catch(() => null)
    const isStillLoading = await page.locator('button:has-text("Loading")').isVisible({ timeout: 500 }).catch(() => false)
    const errorText = await page.locator('form [class*="error"], form [class*="destructive"]').textContent({ timeout: 1000 }).catch(() => null)

    const details = []
    if (alertText) details.push(`Alert: ${alertText.trim()}`)
    if (isStillLoading) details.push("Button still in Loading state")
    if (errorText) details.push(`Form error: ${errorText.trim()}`)

    throw new Error(
      `Login failed. Still on /login after 30 seconds. ${details.length > 0 ? "Details: " + details.join("; ") : "Check that E2E_EMAIL and E2E_PASSWORD are correct."}`
    )
  }

  await page.waitForLoadState("domcontentloaded")
  await page.waitForTimeout(500)
}
