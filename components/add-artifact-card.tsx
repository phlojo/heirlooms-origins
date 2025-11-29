import Link from "next/link"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Plus } from "lucide-react"

interface AddArtifactCardProps {
  collectionId: string
  collectionSlug: string
  style?: React.CSSProperties
}

function HeirloomsShape({ className = "h-12 w-12" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 26"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path d="M11.8845 25.9999L15.4957 23.891L11.8845 21.811L8.27344 23.891L11.8845 25.9999Z" fill="currentColor"/>
      <path d="M1.02222 19.7312L4.66222 21.8112L8.27333 19.7312L4.66222 17.6223L1.02222 19.7312Z" fill="currentColor"/>
      <path d="M22.7467 19.7312L19.1067 17.6223L15.4956 19.7312L19.1067 21.8112L22.7467 19.7312Z" fill="currentColor"/>
      <path d="M11.8845 17.6222L15.4957 15.5422L11.8845 13.4622L8.27344 15.5422L11.8845 17.6222Z" fill="currentColor"/>
      <path d="M11.8845 21.8112L15.4957 19.7312L11.8845 17.6223L8.27344 19.7312L11.8845 21.8112Z" fill="currentColor"/>
      <path d="M11.3067 12.5089V8.34888L7.69556 10.4289V14.5889L11.3067 12.5089Z" fill="currentColor"/>
      <path d="M4.08436 12.5088L0.444365 14.5888L0.444336 18.7777L4.08436 16.6977V12.5088Z" fill="currentColor"/>
      <path d="M11.3067 0L7.69556 2.08V6.24L11.3067 4.16V0Z" fill="currentColor"/>
      <path d="M0.444336 6.23991V10.4288L4.08436 8.3488V4.15991L0.444336 6.23991Z" fill="currentColor"/>
      <path d="M7.69558 6.23999L4.08447 8.34888V12.5089L7.69558 10.4289V6.23999Z" fill="currentColor"/>
      <path d="M12.4622 12.5089L16.0733 14.5889V10.4289L12.4622 8.34888V12.5089Z" fill="currentColor"/>
      <path d="M23.3246 18.7777V14.5888L19.6846 12.5088V16.6977L23.3246 18.7777Z" fill="currentColor"/>
      <path d="M16.0733 2.08L12.4622 0V4.16L16.0733 6.24V2.08Z" fill="currentColor"/>
      <path d="M23.3246 6.23991L19.6846 4.15991V8.3488L23.3246 10.4288V6.23991Z" fill="currentColor"/>
      <path d="M19.6844 12.5089V8.34888L16.0732 6.23999V10.4289L19.6844 12.5089Z" fill="currentColor"/>
    </svg>
  )
}

export function AddArtifactCard({ collectionId, collectionSlug, style }: AddArtifactCardProps) {
  return (
    <Link
      href={`/artifacts/new?collectionId=${collectionId}&returnTo=/collections/${collectionSlug}`}
      style={style}
    >
      <Card className="group overflow-hidden border-2 border-dashed border-muted-foreground/30 p-0 transition-all hover:border-primary hover:shadow-lg rounded-md animate-fade-in flex flex-col h-full bg-transparent hover:bg-muted/30">
        <div className="relative aspect-square overflow-hidden flex items-center justify-center">
          <HeirloomsShape className="h-16 w-16 text-muted-foreground/40 group-hover:text-primary/60 transition-colors" />
        </div>

        <CardHeader className="pb-1.5 pt-2 px-2 flex-none">
          <div className="flex items-center justify-center gap-1.5 text-muted-foreground group-hover:text-primary transition-colors">
            <Plus className="h-4 w-4" />
            <span className="font-semibold text-sm">Add Artifact</span>
          </div>
        </CardHeader>

        <CardContent className="pt-0 pb-3 px-2 flex-none">
          {/* Empty to match card structure */}
        </CardContent>
      </Card>
    </Link>
  )
}
