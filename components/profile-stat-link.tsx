"use client"

import Link from "next/link"
import { useEffect } from "react"

interface ProfileStatLinkProps {
  href: string
  icon: React.ReactNode
  label: string
  count: number
  storageKey: string
  targetTab: string
}

export function ProfileStatLink({ href, icon, label, count, storageKey, targetTab }: ProfileStatLinkProps) {
  const handleClick = () => {
    // Set the tab preference in sessionStorage before navigation
    sessionStorage.setItem(storageKey, targetTab)
  }

  return (
    <Link
      href={href}
      onClick={handleClick}
      className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-accent"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          {icon}
        </div>
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="text-2xl font-bold">{count}</p>
        </div>
      </div>
    </Link>
  )
}
