import type React from "react"
import type { Metadata, Viewport } from "next"

import "./globals.css"

import { Geist, Geist_Mono, Source_Serif_4 } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { Analytics } from "@vercel/analytics/react"
import { SupabaseProvider } from "@/lib/supabase/browser-context"
import { ViewportHeightManager } from "@/components/viewport-height-manager"
import { getThemeFromCookie } from "@/lib/theme-server"

// Initialize fonts
const _geist = Geist({ subsets: ["latin"], weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"] })
const _geistMono = Geist_Mono({
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
})
const _sourceSerif_4 = Source_Serif_4({
  subsets: ["latin"],
  weight: ["200", "300", "400", "500", "600", "700", "800", "900"],
})

// SEARCH ENGINE INDEXING CONTROL
// To re-enable search engine indexing, set NEXT_PUBLIC_ALLOW_INDEXING=true in your environment variables
const allowIndexing = process.env.NEXT_PUBLIC_ALLOW_INDEXING === "true"

export const metadata: Metadata = {
  title: "Heirlooms - Preserve the things that matter to you",
  description: "Document your life's artifacts and stories with structure, context, and connection",
  generator: "v0.app",
  robots: allowIndexing ? { index: true, follow: true } : { index: false, follow: false, nocache: true },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32x32.jpg", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.jpg", sizes: "16x16", type: "image/png" },
    ],
    apple: "/apple-touch-icon.jpg",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "oklch(0.99 0.005 280)" },
    { media: "(prefers-color-scheme: dark)", color: "oklch(0.15 0.01 280)" },
  ],
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // Get theme from cookie for server-side rendering (prevents flash)
  const theme = await getThemeFromCookie()

  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth" className={theme === "dark" ? "dark" : ""}>
      <body className={`font-sans antialiased overflow-x-hidden`}>
        <ViewportHeightManager />
        <SupabaseProvider>
          <ThemeProvider serverTheme={theme}>
            {children}
            <Analytics />
          </ThemeProvider>
        </SupabaseProvider>
      </body>
    </html>
  )
}
