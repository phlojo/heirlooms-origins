"use client"

import { cn } from "@/lib/utils"

interface HelpTextProps {
  children: React.ReactNode
  className?: string
}

export function HelpText({ children, className }: HelpTextProps) {
  return (
    <p className={cn("text-sm text-muted-foreground pl-3 italic", className)}>
      {children}
    </p>
  )
}
