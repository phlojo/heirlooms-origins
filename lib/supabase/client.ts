import { createBrowserClient as createSupabaseBrowserClient } from "@supabase/ssr"
import type { SupabaseClient } from "@supabase/supabase-js"

let globalClient: SupabaseClient | undefined

export function resetClient() {
  globalClient = undefined
}

/**
 * Creates a singleton Supabase client for browser/client-side use
 * Persists across hot reloads to prevent multiple instances
 */
export function createClient() {
  if (globalClient) {
    console.log("[v0] Reusing existing Supabase client")
    return globalClient
  }

  console.log("[v0] Creating new Supabase client")

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase configuration is missing. Please check your environment variables.")
  }

  // Validate URL format
  try {
    new URL(supabaseUrl)
  } catch (error) {
    throw new Error("Invalid Supabase URL configuration")
  }

  globalClient = createSupabaseBrowserClient(supabaseUrl, supabaseAnonKey)

  return globalClient
}

export { createClient as createBrowserClient }
