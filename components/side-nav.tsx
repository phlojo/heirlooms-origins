"use client"

import Link from "next/link"
import { usePathname } from 'next/navigation'
import { cn } from "@/lib/utils"
import { Home, FolderOpen, Package, BookOpen, User } from 'lucide-react'

interface SideNavProps {
  isOpen: boolean
  onClose: () => void
  isMobile: boolean
}

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/artifacts", label: "Artifacts", icon: Package },
  { href: "/collections", label: "Collections", icon: FolderOpen },
  { href: "/stories", label: "Stories", icon: BookOpen },
  { href: "/profile", label: "Profile", icon: User },
]

export function SideNav({ isOpen, onClose, isMobile }: SideNavProps) {
  const pathname = usePathname()

  return (
    <>
      {/* Mobile/tablet overlay */}
      {isMobile && isOpen && (
        <div className="fixed inset-0 z-60 bg-background/80 backdrop-blur-sm lg:hidden" onClick={onClose} />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "w-64 border-r bg-background transition-transform duration-200",
          "collection-sticky-nav sticky z-60",
          // Hide completely on mobile/tablet (below lg breakpoint)
          "hidden lg:block",
          // On desktop (lg+), respect the isOpen state
          !isOpen && "lg:-translate-x-full",
          isOpen && "lg:translate-x-0",
        )}
        style={{
          // Height: viewport - (TopNav height + safe-area-top)
          // Using 100dvh for dynamic viewport on iOS
          height: "calc(100dvh - 4rem - env(safe-area-inset-top, 0px))",
        }}
      >
        <nav className="flex h-full flex-col gap-2 p-4">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href

            return (
              <Link
                key={item.label} // Use label as key instead of href to avoid duplicate keys
                href={item.href}
                onClick={() => isMobile && onClose()}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>
      </aside>
    </>
  )
}
