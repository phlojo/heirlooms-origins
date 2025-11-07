"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Home, FolderOpen, User } from "lucide-react"

interface SideNavProps {
  isOpen: boolean
  onClose: () => void
  isMobile: boolean
}

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/profile", label: "My Profile", icon: User }, // Added Profile link to navigation
  { href: "/collections", label: "Collections", icon: FolderOpen },
  { href: "/artifacts", label: "Artifacts", icon: FolderOpen }, // Updated to link to /artifacts page
  { href: "#", label: "Stories", icon: FolderOpen },
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
          "h-[calc(100vh-4rem)] w-64 border-r bg-background transition-transform duration-200",
          "fixed left-0 top-16 z-60 lg:sticky lg:top-16",
          !isOpen && "-translate-x-full",
        )}
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
