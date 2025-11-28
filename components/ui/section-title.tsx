"use client"

import { cn } from "@/lib/utils"

interface SectionTitleProps {
  children: React.ReactNode
  as?: "h2" | "h3" | "label"
  variant?: "default" | "purple" | "destructive"
  htmlFor?: string
  className?: string
}

export function SectionTitle({
  children,
  as: Tag = "h2",
  variant = "default",
  htmlFor,
  className,
}: SectionTitleProps) {
  const baseStyles = "text-sm font-medium pl-3"
  const variantStyles = {
    default: "text-foreground",
    purple: "text-purple-600",
    destructive: "text-destructive",
  }[variant]

  if (Tag === "label") {
    return (
      <label
        htmlFor={htmlFor}
        className={cn(baseStyles, variantStyles, className)}
      >
        {children}
      </label>
    )
  }

  return (
    <Tag className={cn(baseStyles, variantStyles, className)}>
      {children}
    </Tag>
  )
}
