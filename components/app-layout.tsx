"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { TopNav } from "./top-nav"
import { SideNav } from "./side-nav"
import BottomNav from "./navigation/bottom-nav"
import { useIsMobile } from "@/hooks/use-mobile"
import type { User as SupabaseUser } from "@supabase/supabase-js"
import { PageTransition } from "./page-transition"

interface AppLayoutProps {
  children: React.ReactNode
  user?: SupabaseUser | null
  noBottomPadding?: boolean
}

export function AppLayout({ children, user, noBottomPadding = false }: AppLayoutProps) {
  const isMobile = useIsMobile()
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window === "undefined") return false
    const stored = localStorage.getItem("sidebarOpen")
    return stored !== null ? stored === "true" : false
  })

  useEffect(() => {
    const stored = localStorage.getItem("sidebarOpen")
    if (stored === null) {
      setSidebarOpen(!isMobile)
    }
  }, [isMobile])

  const handleSidebarToggle = (open: boolean) => {
    setSidebarOpen(open)
    localStorage.setItem("sidebarOpen", String(open))
  }

  return (
    <div className="min-h-screen bg-background">
      <TopNav onMenuClick={() => handleSidebarToggle(!sidebarOpen)} user={user} />

      <div className="flex">
        <SideNav isOpen={sidebarOpen} onClose={() => handleSidebarToggle(false)} isMobile={isMobile} />

        <main
          className={`flex-1 p-6 transition-all duration-200 lg:p-8 ${
            noBottomPadding ? "" : "pb-[var(--bottom-nav-height,80px)]"
          }`}
          data-bottom-padding={!noBottomPadding}
        >
          <div className="mx-auto max-w-7xl">
            <PageTransition>{children}</PageTransition>
          </div>
        </main>
      </div>

      {isMobile && <BottomNav user={user} />}
    </div>
  )
}
