import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const origin = process.env.NEXT_PUBLIC_SITE_URL || requestUrl.origin
  const next = requestUrl.searchParams.get("next") || "/collections"

  console.log("[v0] Auth callback received:")
  console.log("[v0]   Full URL:", requestUrl.toString())
  console.log("[v0]   Code present:", !!code)
  console.log("[v0]   Next param:", next)
  console.log("[v0]   Request origin:", requestUrl.origin)
  console.log("[v0]   NEXT_PUBLIC_SITE_URL:", process.env.NEXT_PUBLIC_SITE_URL)
  console.log("[v0]   Using origin:", origin)

  if (code) {
    const supabase = await createClient()

    console.log("[v0] Exchanging code for session...")
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error("[v0] Error exchanging code for session:", error)
      return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`)
    }

    console.log("[v0] Successfully exchanged code for session:", {
      hasSession: !!data.session,
      hasUser: !!data.user,
      userId: data.user?.id,
      email: data.user?.email,
    })

    const finalRedirect = `${origin}${next}`
    console.log("[v0] Redirecting to:", finalRedirect)

    const redirectResponse = NextResponse.redirect(finalRedirect)

    return redirectResponse
  }

  console.log("[v0] No code in callback, redirecting to login")
  return NextResponse.redirect(`${origin}/login?error=No+authorization+code+provided`)
}
