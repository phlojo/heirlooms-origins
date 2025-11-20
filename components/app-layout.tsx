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
    if (typeof window === "undefined") return true
    const stored = localStorage.getItem("sidebarOpen")
    return stored !== null ? stored === "true" : true
  })

  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false)
    } else {
      const stored = localStorage.getItem("sidebarOpen")
      setSidebarOpen(stored !== null ? stored === "true" : true)
    }
  }, [isMobile])

  const handleSidebarToggle = (open: boolean) => {
    if (!isMobile) {
      setSidebarOpen(open)
      localStorage.setItem("sidebarOpen", String(open))
    }
  }

  return (
    <div className="min-h-[100dvh] bg-background overflow-x-hidden">
      <TopNav onMenuClick={() => handleSidebarToggle(!sidebarOpen)} user={user} />

      <div className="flex">
        <SideNav isOpen={sidebarOpen} onClose={() => handleSidebarToggle(false)} isMobile={isMobile} />

        <main
          className={`flex-1 p-6 transition-all duration-200 lg:p-8 px-3.5 pt-4 pb-4 pr-4 pl-4 overflow-x-hidden max-w-full ${
            noBottomPadding ? "" : "pb-[var(--bottom-nav-height,80px)] lg:pb-8"
          }`}
          data-bottom-padding={!noBottomPadding}
        >
          <div className="mx-auto max-w-7xl overflow-x-hidden max-w-full">
            <PageTransition>{children}</PageTransition>
          </div>
        </main>
      </div>

      <div className="lg:hidden">
        <BottomNav />
      </div>
    </div>
  )
}
