// Shared constants and types for theme - can be imported by both server and client

export const THEME_COOKIE_NAME = "heirlooms-theme"
export const DEFAULT_THEME = "dark"

export type Theme = "light" | "dark"

/**
 * Set theme cookie (client-side)
 */
export function setThemeCookie(theme: Theme): void {
  // Set cookie with 1 year expiry
  document.cookie = `${THEME_COOKIE_NAME}=${theme}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`
}

/**
 * Delete theme cookie (client-side)
 * Used when user logs in and their preference is stored in database
 */
export function deleteThemeCookie(): void {
  document.cookie = `${THEME_COOKIE_NAME}=; path=/; max-age=0`
}

/**
 * Get theme from cookie (client-side)
 */
export function getThemeCookieClient(): Theme | null {
  if (typeof document === "undefined") return null

  const match = document.cookie.match(new RegExp(`(^| )${THEME_COOKIE_NAME}=([^;]+)`))
  if (match) {
    const value = match[2]
    if (value === "light" || value === "dark") {
      return value
    }
  }
  return null
}
