import { updateSession } from "@/lib/supabase/middleware"
import type { NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  const res = await updateSession(request)

  const csp = [
    "default-src 'self'",
    "base-uri 'self'",
    "font-src 'self' data: https://fonts.gstatic.com",
    "img-src 'self' data: blob: https://res.cloudinary.com https://*.cloudinary.com",
    "media-src 'self' data: blob: https://res.cloudinary.com https://*.cloudinary.com",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live https://*.vercel-scripts.com", // Next dev/previews may need 'unsafe-eval'
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "connect-src 'self' https://*.supabase.co https://res.cloudinary.com https://api.cloudinary.com https://*.cloudinary.com https://*.vercel.app",
    "frame-ancestors 'none'",
    "object-src 'none'",
  ].join("; ")

  res.headers.set("Content-Security-Policy", csp)
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
  res.headers.set("X-Frame-Options", "DENY")
  res.headers.set("X-Content-Type-Options", "nosniff")
  res.headers.set("Permissions-Policy", "geolocation=(), microphone=(self), camera=()")

  res.headers.set("Cross-Origin-Resource-Policy", "cross-origin")
  res.headers.set("Cross-Origin-Embedder-Policy", "unsafe-none")

  return res
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
