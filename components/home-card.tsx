"use client"

import Link from "next/link"
import { Plus } from "lucide-react"
import MediaImage from "@/components/media-image"

interface HomeCardProps {
  title: string
  description: string
  href?: string
  backgroundImage?: string
}

export function HomeCard({ title, description, href, backgroundImage }: HomeCardProps) {
  const content = (
    <div className="relative h-full overflow-hidden p-4 bg-black">
      {backgroundImage && (
        <>
          <div className="absolute inset-0">
            <MediaImage
              src={backgroundImage}
              alt=""
              className="w-full h-full"
              objectFit="cover"
              key={backgroundImage}
            />
          </div>
          <div className="absolute inset-0 bg-black/60" />
        </>
      )}

      <div className="relative z-10 pr-10">
        <h2 className={`font-semibold text-2xl ${backgroundImage ? "text-white" : ""}`}>{title}</h2>
        <p className={`mt-2 text-sm mr-8 ${backgroundImage ? "text-white/90" : "text-muted-foreground"}`}>{description}</p>
      </div>

      <div
        className={`absolute bottom-4 right-4 z-10 flex h-16 w-16 items-center justify-center rounded-sm ${
          backgroundImage ? "bg-white/20 text-white backdrop-blur-sm" : "text-primary-foreground bg-primary"
        }`}
      >
        <Plus className="h-8 w-8" />
      </div>
    </div>
  )

  if (href) {
    return (
      <Link
        href={href}
        className="block rounded-lg border bg-card overflow-hidden transition-all hover:shadow-lg hover:scale-[1.02] h-full animate-fade-in"
      >
        {content}
      </Link>
    )
  }

  return <div className="rounded-lg border bg-card overflow-hidden h-full animate-fade-in">{content}</div>
}
