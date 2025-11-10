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
    <div className="relative flex flex-col justify-between items-stretch p-6 bg-black h-full overflow-hidden">
      {backgroundImage && (
        <>
          <Image
            src={backgroundImage || "/placeholder.svg"}
            alt=""
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            priority
          />
          <div className="absolute inset-0 bg-black/60" />
        </>
      )}
      <div className="relative z-10 pr-20">
        <h2 className={`font-semibold text-3xl ${backgroundImage ? "text-white" : ""}`}>{title}</h2>
        <p className={`mt-2 text-base ${backgroundImage ? "text-white/90" : "text-muted-foreground"}`}>{description}</p>
      </div>
      <div className="flex justify-end relative z-10 self-end">
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
        className="block rounded-lg border bg-card overflow-hidden transition-all hover:shadow-lg hover:scale-[1.02] h-full"
      >
        {content}
      </Link>
    )
  }

  return <div className="rounded-lg border bg-card overflow-hidden h-full">{content}</div>
}
