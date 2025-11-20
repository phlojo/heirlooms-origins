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

  globalClient = createSupabaseBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      isSingleton: true,
    },
  )

  return globalClient
}

export { createClient as createBrowserClient }
