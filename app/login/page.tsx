"use client"
import { LoginModule } from "@/components/login-module"
import BottomNav from "@/components/navigation/bottom-nav"
import { useIsMobile } from "@/hooks/use-mobile"
import { useSearchParams } from "next/navigation"

export default function LoginPage() {
  const isMobile = useIsMobile()
  const searchParams = useSearchParams()
  const returnTo = searchParams.get("returnTo") || "/"

  return (
    <div className="relative flex min-h-svh w-full items-center justify-center p-6 pb-[var(--bottom-nav-height,80px)]">
      <div className="w-full max-w-sm">
        <LoginModule returnTo={returnTo} />
      </div>

      {isMobile && <BottomNav user={null} />}
    </div>
  )
}
