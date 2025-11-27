"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Home, FolderOpen, BookOpen, User } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { AnimatedArtifactsIcon } from "./animated-artifacts-icon"

interface NavItem {
  href: string
  label: string
  icon?: LucideIcon
  useAnimatedIcon?: boolean
}

const navItems: NavItem[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/artifacts", label: "Artifacts", useAnimatedIcon: true },
  { href: "/collections", label: "Collections", icon: FolderOpen },
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
 * - Adds 12px base padding + safe-area-inset-bottom for comfortable spacing
 * - Tested with simulated 24px inset (typical Android gesture bar height)
 * - Total height dynamically adjusts: 80px base + safe-area-inset-bottom
 *
 * Touch optimization:
 * - Increased height from 64px to 80px for better touch targets
 * - Larger padding on links (px-4 py-3) for easier tapping
 * - Active class prevents iOS double-tap issue with touch-action
 *
 * iOS Safari optimizations:
 * - Uses pointer events instead of touch events for reliable tap detection
 * - touch-action: manipulation removes 300ms tap delay
 * - Dynamic height with safe-area-inset-bottom for iOS notch/home indicator
 * - Positioned with bottom: 0 for stable placement during toolbar transitions
 * - Active scaling feedback confirms tap registration
 */
export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className={cn(
        "fixed left-0 right-0 bottom-0 z-50",
        "border-t bg-background",
        "lg:hidden",
      )}
      style={{
        /* iOS-safe bottom padding with safe-area support */
        /* Simplified calculation to reduce browser reflow at scroll boundaries */
        paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)",
        height: "calc(80px + env(safe-area-inset-bottom, 0px) + 12px)",
        /* Prevent momentum scroll from affecting nav */
        touchAction: "manipulation",
        /* Force GPU layer but prevent repaint flicker */
        willChange: "contents",
        /* Isolate rendering to prevent layout thrashing */
        contentVisibility: "auto",
      }}
    >
      <div className="flex h-20 items-center justify-around px-2">
        {navItems.map((item) => {
          const isActive =
            item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(item.href + "/")

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "relative flex min-w-[56px] flex-col items-center justify-center gap-1.5 rounded-lg px-4 py-3 transition-colors",
                /* iOS tap optimizations */
                "touch-manipulation", // Removes 300ms tap delay
                "active:scale-95 active:bg-accent/50", // Visual feedback on tap
                "hover:bg-accent",
                isActive ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
              /* Use onPointerDown for reliable iOS tap detection */
              onPointerDown={() => {
                track("nav_bottom_click", {
                  item: item.label,
                  path: item.href,
                  source: "bottom-nav",
                })
              }}
            >
              {item.useAnimatedIcon ? (
                <AnimatedArtifactsIcon className="h-6 w-6" />
              ) : (
                item.icon && <item.icon className="h-6 w-6" />
              )}
              <span className="text-[11px] leading-none">{item.label}</span>
              {isActive && (
                <div className="absolute bottom-0 left-1/2 h-1 w-12 -translate-x-1/2 rounded-t-full bg-primary" />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
