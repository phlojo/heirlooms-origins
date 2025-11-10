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
    console.log("[v0] Supabase credentials not found in middleware, skipping auth checks")
    return supabaseResponse
  }

  try {
    new URL(supabaseUrl)
  } catch (error) {
    console.error("[v0] Invalid Supabase URL in middleware:", supabaseUrl)
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

    const {
      data: { user },
    } = await supabase.auth.getUser()

    console.log("[v0] Middleware check", {
      path: request.nextUrl.pathname,
      hasUser: !!user,
    })

    const isProtectedRoute =
      request.nextUrl.pathname === "/collections/new" || request.nextUrl.pathname === "/artifacts/new"

    if (!user && isProtectedRoute) {
      console.log("[v0] Redirecting to login - no user for protected route")
      const url = request.nextUrl.clone()
      url.pathname = "/login"
      url.searchParams.set("returnTo", request.nextUrl.pathname)
      return NextResponse.redirect(url)
    }

    return supabaseResponse
  } catch (error) {
    console.error("[v0] Middleware Supabase error:", error)
    // Allow the request to continue even if auth check fails
    return supabaseResponse
  }
}
