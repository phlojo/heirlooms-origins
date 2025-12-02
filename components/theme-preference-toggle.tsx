"use client"

import { Moon, Sun } from "lucide-react"
import { useState } from "react"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useTheme } from "@/components/theme-provider"

export function ThemePreferenceToggle() {
  const { theme, setTheme } = useTheme()
  const [isSaving, setIsSaving] = useState(false)

  const toggleTheme = async (checked: boolean) => {
    const newTheme = checked ? "dark" : "light"
    setIsSaving(true)

    await setTheme(newTheme)

    setIsSaving(false)
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
