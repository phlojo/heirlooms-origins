"use client"

import { ChevronDown } from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { SectionTitle } from "@/components/ui/section-title"
import { cn } from "@/lib/utils"

interface CollapsibleSectionProps {
  title: string
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
  titleExtra?: React.ReactNode
  className?: string
}

export function CollapsibleSection({
  title,
  open,
  onOpenChange,
  children,
  titleExtra,
  className,
}: CollapsibleSectionProps) {
  return (
    <Collapsible open={open} onOpenChange={onOpenChange} className={className}>
      <div className="rounded-md border border-input bg-transparent dark:bg-input/30 shadow-xs">
        <CollapsibleTrigger className="flex w-full items-center justify-between px-3 py-2 hover:opacity-80 transition-opacity">
          <div className="flex items-center gap-2">
            <SectionTitle className="pl-0">{title}</SectionTitle>
            {titleExtra}
          </div>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground opacity-50 transition-transform",
              open && "rotate-180"
            )}
          />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-3 pb-3">
            {children}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}
