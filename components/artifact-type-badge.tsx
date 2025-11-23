"use client"

import { getDynamicLucideIcon } from "@/lib/utils/dynamic-icon"

interface ArtifactTypeBadgeProps {
  iconName: string
  typeName: string
}

export function ArtifactTypeBadge({ iconName, typeName }: ArtifactTypeBadgeProps) {
  const Icon = getDynamicLucideIcon(iconName)

  return (
    <div
      className="absolute top-2 left-2 flex items-center justify-center rounded-md bg-black/50 p-1.5 backdrop-blur-sm"
      title={typeName}
      aria-label={typeName}
    >
      <Icon className="h-3 w-3 text-white" strokeWidth={2.5} />
    </div>
  )
}
