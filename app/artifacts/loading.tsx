export default function LoadingArtifacts() {
  return (
    <div className="p-6 space-y-4">
      <div className="h-8 w-48 bg-muted animate-pulse rounded" />
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="h-40 rounded border bg-card animate-pulse" />
        ))}
      </div>
    </div>
  )
}
