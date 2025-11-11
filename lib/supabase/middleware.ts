import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // If Supabase credentials are not available, skip auth checks
  if (!supabaseUrl || !supabaseAnonKey) {
    return supabaseResponse
  }

  try {
    new URL(supabaseUrl)
  } catch (error) {
    console.error("Invalid Supabase URL in middleware:", supabaseUrl)
    return supabaseResponse
  }

  try {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
        },
      },
    })

    // This is critical for OAuth to work properly
    const {
      data: { user },
    } = await supabase.auth.getUser()

    // Allow auth callback to proceed without interference
    if (request.nextUrl.pathname.startsWith("/auth/callback")) {
      return supabaseResponse
    }

    const isProtectedRoute =
      request.nextUrl.pathname === "/collections/new" || request.nextUrl.pathname === "/artifacts/new"

    if (!user && isProtectedRoute) {
      const url = request.nextUrl.clone()
      url.pathname = "/login"
      url.searchParams.set("returnTo", request.nextUrl.pathname)
      return NextResponse.redirect(url)
    }

    return supabaseResponse
  } catch (error) {
    console.error("Middleware Supabase error:", error)
    return supabaseResponse
  }
}
