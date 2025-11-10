"use client"

import { User } from "lucide-react"
import { cn } from "@/lib/utils"
import { useEffect, useState } from "react"
import { createBrowserClient } from "@/lib/supabase/client"

interface AuthorProps {
  userId: string
  authorName?: string
  size?: "sm" | "md" | "lg"
  showAvatar?: boolean
  className?: string
}

export function Author({ userId, authorName, size = "md", showAvatar = true, className }: AuthorProps) {
  const [displayName, setDisplayName] = useState(authorName || "Author")
  const [isLoading, setIsLoading] = useState(!authorName)

  const supabase = createBrowserClient()

  useEffect(() => {
    if (authorName || !userId) {
      setIsLoading(false)
      return
    }

    const fetchProfile = async () => {
      try {
        const { data, error } = await supabase.from("profiles").select("display_name").eq("id", userId).single()

        if (error) {
          console.error("[v0] Error fetching profile:", error)
          setDisplayName("Author")
        } else if (data?.display_name) {
          setDisplayName(data.display_name)
        } else {
          setDisplayName("Author")
        }
      } catch (err) {
        console.error("[v0] Error in fetchProfile:", err)
        setDisplayName("Author")
      } finally {
        setIsLoading(false)
      }
    }

    fetchProfile()
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
      <div className="inline-flex items-center gap-1.5">
        <span className="text-xs text-muted-foreground">by</span>
        <div
          className={cn(
            "inline-flex w-fit items-center rounded-full bg-primary/10 font-medium text-primary/50",
            sizeClasses[size],
            className,
          )}
        >
          {showAvatar && <User className={`${iconSizes[size]}`} />}
          <span>...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="inline-flex items-center gap-1.5">
      <span className="text-xs text-muted-foreground">by</span>
      <div
        className={cn(
          "inline-flex w-fit items-center rounded-full bg-primary/10 font-medium text-primary transition-colors text-center",
          sizeClasses[size],
          className,
        )}
      >
        {showAvatar && <User className={`${iconSizes[size]}`} />}
        <span>{displayName}</span>
      </div>
    </div>
  )
}
