import "server-only"

import { cookies } from "next/headers"
import { THEME_COOKIE_NAME, DEFAULT_THEME, type Theme } from "./theme"

/**
 * Get theme from cookie (server-side only)
 * Returns the theme from cookie or default theme
 */
export async function getThemeFromCookie(): Promise<Theme> {
  const cookieStore = await cookies()
  const themeCookie = cookieStore.get(THEME_COOKIE_NAME)

  if (themeCookie?.value === "light" || themeCookie?.value === "dark") {
    return themeCookie.value
  }

  return DEFAULT_THEME
}
