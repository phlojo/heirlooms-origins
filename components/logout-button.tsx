"use client"

import { Button } from "@/components/ui/button"
import { LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useTransition } from "react"

export function LogoutButton() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const handleSignOut = async () => {
    await fetch("/api/auth/signout", { method: "POST" })
    startTransition(() => {
      router.push("/")
      router.refresh()
    })
  }

  return (
    <Button onClick={handleSignOut} disabled={isPending} className="gap-2">
      <LogOut className="h-4 w-4" />
      <span>Log Out</span>
    </Button>
  )
}
