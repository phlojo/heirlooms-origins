"use client"

import { User } from "lucide-react"
import { cn } from "@/lib/utils"
import { useEffect, useState } from "react"
import { useSupabase } from "@/lib/supabase/browser-context"

interface AuthorProps {
  userId: string
  authorName?: string
  size?: "sm" | "md" | "lg"
  showAvatar?: boolean
  className?: string
}

const profileCache = new Map<string, { displayName: string; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes
const pendingRequests = new Map<string, Promise<string>>()

export function Author({ userId, authorName, size = "md", showAvatar = true, className }: AuthorProps) {
  const [displayName, setDisplayName] = useState(authorName || "Author")
  const [isLoading, setIsLoading] = useState(!authorName)

  const supabase = useSupabase()

  useEffect(() => {
    if (authorName || !userId) {
      setIsLoading(false)
      return
    }

    const cached = profileCache.get(userId)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      setDisplayName(cached.displayName)
      setIsLoading(false)
      return
    }

    let requestPromise = pendingRequests.get(userId)

    if (!requestPromise) {
      requestPromise = (async () => {
        try {
          const { data, error } = await supabase.from("profiles").select("display_name").eq("id", userId).single()

          if (error) {
            console.error("[v0] Error fetching profile:", error)
            return "Author"
          }

          const name = data?.display_name || "Author"

          profileCache.set(userId, {
            displayName: name,
            timestamp: Date.now(),
          })

          return name
        } catch (err) {
          console.error("[v0] Error in fetchProfile:", err)
          return "Author"
        } finally {
          pendingRequests.delete(userId)
        }
      })()

      pendingRequests.set(userId, requestPromise)
    }

    requestPromise.then((name) => {
      setDisplayName(name)
      setIsLoading(false)
    })
  }, [userId, authorName, supabase])

  const sizeClasses = {
    sm: "text-xs px-2.5 py-1 gap-1",
    md: "text-sm px-3 py-1.5 gap-1.5",
    lg: "text-base px-4 py-2 gap-2",
  }

  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-3.5 w-3.5",
    lg: "h-4 w-4",
  }

  if (isLoading) {
    return (
      <div className="inline-flex items-center gap-1.5 min-w-0">
        <span className="text-xs text-muted-foreground shrink-0">by</span>
        <div
          className={cn(
            "inline-flex w-fit items-center rounded-full bg-primary/10 font-medium text-primary/50 min-w-0",
            sizeClasses[size],
            className,
          )}
        >
          {showAvatar && <User className={`${iconSizes[size]} shrink-0`} />}
          <span className="truncate">...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="inline-flex items-center gap-1.5 min-w-0">
      <span className="text-xs text-muted-foreground shrink-0">by</span>
      <div
        className={cn(
          "inline-flex w-fit items-center rounded-full bg-primary/10 font-medium text-primary transition-colors text-center min-w-0",
          sizeClasses[size],
          className,
        )}
      >
        {showAvatar && <User className={`${iconSizes[size]} shrink-0`} />}
        <span className="truncate">{displayName}</span>
      </div>
    </div>
  )
}
