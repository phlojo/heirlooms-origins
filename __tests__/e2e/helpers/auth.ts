import type { Page } from "@playwright/test"

/**
 * Mock Supabase auth for E2E tests
 * This bypasses actual authentication by mocking the Supabase client responses
 */
export async function setupAuthMocks(page: Page) {
  // Mock Supabase auth state
  await page.addInitScript(() => {
    // Mock localStorage with auth tokens
    const mockUser = {
      id: "test-user-id-123",
      email: "test@example.com",
      user_metadata: {
        full_name: "Test User",
      },
    }

    const mockSession = {
      access_token: "mock-access-token",
      refresh_token: "mock-refresh-token",
      user: mockUser,
    }

    // Set mock session in localStorage
    localStorage.setItem(
      "supabase.auth.token",
      JSON.stringify({
        currentSession: mockSession,
        expiresAt: Date.now() + 3600000, // 1 hour from now
      }),
    )
  })

  // Mock Supabase API routes for auth
  await page.route("**/auth/v1/token**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        access_token: "mock-access-token",
        token_type: "bearer",
        expires_in: 3600,
        refresh_token: "mock-refresh-token",
        user: {
          id: "test-user-id-123",
          email: "test@example.com",
        },
      }),
    })
  })

  // Mock user endpoint
  await page.route("**/auth/v1/user**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: "test-user-id-123",
        email: "test@example.com",
        user_metadata: {
          full_name: "Test User",
        },
      }),
    })
  })
}

/**
 * Alternative: Login via UI (if you prefer actual login flow)
 * Note: Requires test credentials
 */
export async function loginViaUI(page: Page, email: string, password: string) {
  await page.goto("/login")

  // Wait for login page to load
  await page.waitForSelector("input[type='email']", { timeout: 5000 })

  // Switch to password mode if needed
  const usePasswordButton = page.locator("button:has-text('Use password instead')")
  if (await usePasswordButton.isVisible({ timeout: 2000 }).catch(() => false)) {
    await usePasswordButton.click()
  }

  // Fill in credentials
  await page.fill("input[type='email']", email)
  await page.fill("input[type='password']", password)

  // Submit
  await page.click("button:has-text('Sign in')")

  // Wait for redirect to home/artifacts
  await page.waitForURL(/\/(artifacts|$)/, { timeout: 10000 })
}
