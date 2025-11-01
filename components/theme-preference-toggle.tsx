"use client"

import { Moon, Sun } from "lucide-react"
import { useEffect, useState } from "react"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { updateThemePreference } from "@/lib/actions/profile"
import { useRouter } from "next/navigation"

interface ThemePreferenceToggleProps {
  initialTheme?: string
}

export function ThemePreferenceToggle({ initialTheme = "light" }: ThemePreferenceToggleProps) {
  const [theme, setTheme] = useState<"light" | "dark">(initialTheme as "light" | "dark")
  const [isSaving, setIsSaving] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Apply theme on mount
    const isDark = theme === "dark"
    document.documentElement.classList.toggle("dark", isDark)
  }, [theme])

  const toggleTheme = async (checked: boolean) => {
    const newTheme = checked ? "dark" : "light"
    setTheme(newTheme)
    setIsSaving(true)

    // Apply theme immediately
    document.documentElement.classList.toggle("dark", checked)

    // Save to database
    const result = await updateThemePreference(newTheme)

    if (!result.success) {
      console.error("[v0] Failed to save theme preference:", result.error)
    }

    setIsSaving(false)
    router.refresh()
  }

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        {theme === "light" ? (
          <Sun className="h-5 w-5 text-muted-foreground" />
        ) : (
          <Moon className="h-5 w-5 text-muted-foreground" />
        )}
        <div>
          <Label htmlFor="theme-toggle" className="text-sm font-medium cursor-pointer">
            Theme
          </Label>
          <p className="text-sm text-muted-foreground">
            {theme === "light" ? "Light mode" : "Dark mode"}
            {isSaving && " (saving...)"}
          </p>
        </div>
      </div>
      <Switch id="theme-toggle" checked={theme === "dark"} onCheckedChange={toggleTheme} disabled={isSaving} />
    </div>
  )
}
