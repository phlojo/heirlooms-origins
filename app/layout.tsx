import type React from "react"
import type { Metadata } from "next"

import "./globals.css"

import { Geist, Geist_Mono, Source_Serif_4 } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { Analytics } from "@vercel/analytics/react"

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

export const metadata: Metadata = {
  title: "Heirlooms - Preserve the things that matter to you",
  description: "Document your life's artifacts and stories with structure, context, and connection",
  generator: "v0.app",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32x32.jpg", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.jpg", sizes: "16x16", type: "image/png" },
    ],
    apple: "/apple-touch-icon.jpg",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes, viewport-fit=cover"
        />
      </head>
      <body className={`font-sans antialiased`}>
        <ThemeProvider>
          {children}
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  )
}
