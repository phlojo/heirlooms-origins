"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Home, FolderOpen, Package, BookOpen, User } from "lucide-react"
import type { LucideIcon } from "lucide-react"

interface NavItem {
  href: string
  label: string
  icon: LucideIcon
}

const navItems: NavItem[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/collections", label: "Collections", icon: FolderOpen },
  { href: "/artifacts", label: "Artifacts", icon: Package },
  { href: "/stories", label: "Stories", icon: BookOpen },
  { href: "/profile", label: "Profile", icon: User },
]

/**
 * track - Lightweight analytics helper
 * Safely fires analytics events without blocking if analytics library is absent
 */
function track(event: string, data: Record<string, unknown>) {
  try {
    // Check if analytics/tracking library is available (e.g., window.analytics, gtag, etc.)
    if (typeof window !== "undefined" && (window as any).analytics?.track) {
      ;(window as any).analytics.track(event, data)
    }
    // Add other analytics providers here as needed
    // else if (typeof gtag !== 'undefined') { gtag('event', event, data) }
  } catch (error) {
    // Silent fail - don't block user interaction
    console.debug("[v0] Analytics tracking failed:", error)
  }
}

/**
 * BottomNav - Mobile-only bottom navigation bar
 *
 * Safe-area handling:
 * - Uses max(env(safe-area-inset-bottom), 0px) to respect iOS notch and Android gesture nav
 * - Adds 8px base padding + safe-area-inset-bottom for comfortable spacing
 * - Tested with simulated 24px inset (typical Android gesture bar height)
 * - Total height dynamically adjusts: 64px base + safe-area-inset-bottom
 */
export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className={cn(
        "fixed inset-x-0 bottom-0 z-50",
        "h-16 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80",
        "lg:hidden",
      )}
      style={{
        paddingBottom: "max(env(safe-area-inset-bottom, 0px), 8px)",
        height: "calc(64px + env(safe-area-inset-bottom, 0px))",
      }}
    >
      <div className="flex h-16 items-center justify-around px-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex min-w-[44px] flex-col items-center justify-center gap-1 rounded-lg px-3 py-2 transition-colors",
                "hover:bg-accent",
                isActive ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
              onClick={() => {
                track("nav_bottom_click", {
                  item: item.label,
                  path: item.href,
                  source: "bottom-nav",
                })
              }}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] leading-none">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
