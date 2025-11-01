import Link from "next/link"
import { cn } from "@/lib/utils"

interface CollectionLabelProps {
  collectionId: string
  collectionSlug?: string // Added slug prop
  collectionName: string
  size?: "sm" | "md" | "lg"
  className?: string
  clickable?: boolean // Added clickable prop to prevent nested links
}

export function CollectionLabel({
  collectionId,
  collectionSlug, // Added slug parameter
  collectionName,
  size = "md",
  className,
  clickable = true, // Default to clickable
}: CollectionLabelProps) {
  const sizeClasses = {
    sm: "text-xs px-2.5 py-1",
    md: "text-sm px-3 py-1.5",
    lg: "text-base px-4 py-2",
  }

  const labelContent = (
    <span
      className={cn(
        "inline-flex items-center rounded-full bg-primary/10 font-medium text-primary transition-colors",
        clickable && "hover:bg-primary/20", // Only show hover effect if clickable
        sizeClasses[size],
        className,
      )}
    >
      {collectionName}
    </span>
  )

  if (!clickable) {
    return labelContent
  }

  const href = collectionSlug ? `/collections/${collectionSlug}` : `/collections/${collectionId}`
  return <Link href={href}>{labelContent}</Link>
}
