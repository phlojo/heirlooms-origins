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
    return globalClient
  }

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

  globalClient = createSupabaseBrowserClient(supabaseUrl, supabaseAnonKey, {
    isSingleton: true,
  })

  return globalClient
}

export { createClient as createBrowserClient }
