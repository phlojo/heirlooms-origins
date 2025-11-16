import { AnimatedArtifactsIcon } from "@/components/navigation/animated-artifacts-icon"

export default function AnimatedIconTestPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-8">
      <div className="flex flex-col items-center gap-8">
        <h1 className="text-2xl font-semibold">Animated Artifacts Icon Test</h1>
        
        <div className="flex items-center gap-8">
          {/* Small size - like in bottom nav */}
          <div className="flex flex-col items-center gap-2">
            <AnimatedArtifactsIcon className="h-5 w-5" />
            <span className="text-xs text-muted-foreground">Small (20px)</span>
          </div>

          {/* Medium size */}
          <div className="flex flex-col items-center gap-2">
            <AnimatedArtifactsIcon className="h-8 w-8" />
            <span className="text-xs text-muted-foreground">Medium (32px)</span>
          </div>

          {/* Large size */}
          <div className="flex flex-col items-center gap-2">
            <AnimatedArtifactsIcon className="h-12 w-12" />
            <span className="text-xs text-muted-foreground">Large (48px)</span>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          Icons should cycle through different artifact types every 4 seconds
        </p>
      </div>
    </div>
  )
}
