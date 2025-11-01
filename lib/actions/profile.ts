"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

/**
 * Server action to update user's theme preference
 */
export async function updateThemePreference(theme: "light" | "dark") {
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Unauthorized" }
  }

  // Update or insert profile with theme preference
  const { error } = await supabase
    .from("profiles")
    .upsert(
      {
        id: user.id,
        theme_preference: theme,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "id",
      },
    )
    .select()
    .single()

  if (error) {
    console.error("[v0] Theme preference update error:", error)
    return { success: false, error: "Failed to save theme preference" }
  }

  revalidatePath("/profile")
  return { success: true }
}

/**
 * Get user's theme preference from database
 */
export async function getThemePreference() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const { data: profile } = await supabase.from("profiles").select("theme_preference").eq("id", user.id).single()

  return profile?.theme_preference || "light"
}
