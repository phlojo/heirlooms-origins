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

  // Fill in the email field using placeholder selector
  await page.getByPlaceholder("you@example.com").fill(email)

  // Click "Use password instead" button to switch to password login
  await page.getByRole("button", { name: "Use password instead" }).click()

  // Wait for password field to appear
  await page.waitForSelector('input[type="password"]', { timeout: 5000 })

  // Fill in the password field
  await page.getByLabel("Password").fill(password)

  // Click the Sign In button
  await page.getByRole("button", { name: "Sign In" }).click()

  // Wait for successful redirect to home or collections page
  // The app redirects to /collections by default after login
  await page.waitForURL(/\/(collections|artifacts|$)/, { timeout: 15000 })

  // Additional verification: ensure we're not still on the login page
  const currentUrl = page.url()
  if (currentUrl.includes("/login")) {
    throw new Error("Login failed: Still on login page after submitting credentials")
  }

  // Wait a moment for auth state to fully settle
  await page.waitForTimeout(500)
}
