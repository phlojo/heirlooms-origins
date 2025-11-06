import Link from "next/link"
import { Plus } from "lucide-react"
import Image from "next/image"

interface HomeCardProps {
  title: string
  description: string
  href?: string
  backgroundImage?: string
}

export function HomeCard({ title, description, href, backgroundImage }: HomeCardProps) {
  const content = (
    <div className="relative grid grid-cols-3 gap-4 items-center p-6 bg-black">
      {backgroundImage && (
        <>
          <Image
            src={backgroundImage || "/placeholder.svg"}
            alt=""
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
          <div className="absolute inset-0 bg-black/60" />
        </>
      )}
      <div className="col-span-2 relative z-10">
        <h2 className={`text-xl font-semibold ${backgroundImage ? "text-white" : ""}`}>{title}</h2>
        <p className={`mt-2 text-sm ${backgroundImage ? "text-white/90" : "text-muted-foreground"}`}>{description}</p>
      </div>
      <div className="flex items-center justify-center relative z-10">
        <div
          className={`flex h-16 w-16 items-center justify-center rounded-2xl ${
            backgroundImage ? "bg-white/20 text-white backdrop-blur-sm" : "text-primary-foreground bg-primary"
          }`}
        >
          <Plus className="h-8 w-8" />
        </div>
      </div>
    </div>
  )

  if (href) {
    return (
      <Link
        href={href}
        className="block rounded-lg border bg-card overflow-hidden transition-all hover:shadow-lg hover:scale-[1.02]"
      >
        {content}
      </Link>
    )
  }

  return <div className="rounded-lg border bg-card overflow-hidden">{content}</div>
}
