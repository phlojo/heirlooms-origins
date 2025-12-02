"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState, useCallback } from "react"
import { useSupabase } from "@/lib/supabase/browser-context"
import { setThemeCookie, deleteThemeCookie, DEFAULT_THEME, type Theme } from "@/lib/theme"

interface ThemeContextValue {
  theme: Theme
  setTheme: (theme: Theme) => Promise<void>
  isLoggedIn: boolean
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }
  return context
}

interface ThemeProviderProps {
  children: React.ReactNode
  serverTheme?: Theme
}

export function ThemeProvider({ children, serverTheme = DEFAULT_THEME }: ThemeProviderProps) {
  const supabase = useSupabase()
  const [theme, setThemeState] = useState<Theme>(serverTheme)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Apply theme to document
  const applyTheme = useCallback((newTheme: Theme) => {
    document.documentElement.classList.toggle("dark", newTheme === "dark")
  }, [])

  // Initialize theme on mount
  useEffect(() => {
    setMounted(true)

    const initializeTheme = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        setIsLoggedIn(true)
        // User is logged in - get theme from database
        const { data: profile } = await supabase
          .from("profiles")
          .select("theme_preference")
          .eq("id", user.id)
          .single()

        const dbTheme = (profile?.theme_preference as Theme) || DEFAULT_THEME
        setThemeState(dbTheme)
        applyTheme(dbTheme)

        // Clear cookie since user is logged in (database is source of truth)
        deleteThemeCookie()
      } else {
        setIsLoggedIn(false)
        // User not logged in - cookie/server theme is already applied
        applyTheme(serverTheme)
      }
    }

    initializeTheme()

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        setIsLoggedIn(true)
        // User just logged in - fetch their preference from database
        const { data: profile } = await supabase
          .from("profiles")
          .select("theme_preference")
          .eq("id", session.user.id)
          .single()

        const dbTheme = (profile?.theme_preference as Theme) || DEFAULT_THEME
        setThemeState(dbTheme)
        applyTheme(dbTheme)
        deleteThemeCookie()
      } else if (event === "SIGNED_OUT") {
        setIsLoggedIn(false)
        // User logged out - save current theme to cookie
        setThemeCookie(theme)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, serverTheme, applyTheme, theme])

  // Set theme function that handles both cookie and database
  const setTheme = useCallback(async (newTheme: Theme) => {
    setThemeState(newTheme)
    applyTheme(newTheme)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user) {
      // Save to database for logged-in users
      await supabase
        .from("profiles")
        .upsert(
          {
            id: user.id,
            theme_preference: newTheme,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" }
        )
    } else {
      // Save to cookie for non-logged-in users
      setThemeCookie(newTheme)
    }
  }, [supabase, applyTheme])

  // Always provide context, even before mount
  // Server already rendered with correct theme class, so no flash
  return (
    <ThemeContext.Provider value={{ theme, setTheme, isLoggedIn }}>
      {children}
    </ThemeContext.Provider>
  )
}
