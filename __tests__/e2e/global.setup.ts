import { test as base, expect } from "@playwright/test"
import { login } from "./helpers/login"

/**
 * Extended Playwright test with automatic authentication.
 * All tests using this fixture will start from an authenticated state.
 */
export const test = base.extend({
  page: async ({ page }, use) => {
    // Perform login before each test
    await login(page)

    // Provide the authenticated page to the test
    await use(page)

    // Cleanup happens automatically
  },
})

export { expect }
