import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const next = requestUrl.searchParams.get("next") || "/collections"

  console.log("[v0] Auth callback received")
  console.log("[v0] Code present:", !!code)
  console.log("[v0] Next destination:", next)

  if (code) {
    const cookieStore = await cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
            } catch {
              // The setAll method was called from a Server Component.
              // This can be ignored if you have middleware refreshing user sessions.
            }
          },
        },
      },
    )

    console.log("[v0] Exchanging code for session...")
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error("[v0] Error exchanging code:", error.message)
      return NextResponse.redirect(`${requestUrl.origin}/login?error=${encodeURIComponent(error.message)}`)
    }

    console.log("[v0] Successfully exchanged code, redirecting to:", next)

    return NextResponse.redirect(`${requestUrl.origin}${next}`)
  }

  console.log("[v0] No code provided, redirecting to login")
  return NextResponse.redirect(`${requestUrl.origin}/login?error=No+code+provided`)
}
