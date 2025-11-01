import { AppLayout } from "@/components/app-layout"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Edit } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { getCurrentUser } from "@/lib/supabase/server"
import { getArtifactById } from "@/lib/actions/artifacts"
import { CollectionLabel } from "@/components/collection-label"
import { getDetailUrl } from "@/lib/cloudinary"

export default async function ArtifactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()

  const { id } = await params
  const artifact = await getArtifactById(id)

  if (!artifact) {
    notFound()
  }

  const canView = artifact.collection?.is_public || (user && artifact.user_id === user.id)
  const canEdit = user && artifact.user_id === user.id

  if (!canView) {
    notFound()
  }

  const collectionHref = artifact.collection?.slug
    ? `/collections/${artifact.collection.slug}`
    : `/collections/${artifact.collection_id}`

  return (
    <AppLayout user={user}>
      <div className="space-y-8">
        <div>
          <Button variant="ghost" size="sm" asChild className="mb-4">
            <Link href={collectionHref}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Collection
            </Link>
          </Button>

          <div className="flex items-start justify-between">
            <div className="space-y-2">
              {artifact.collection && (
                <div className="mb-2">
                  <CollectionLabel
                    collectionId={artifact.collection.id}
                    collectionSlug={artifact.collection.slug}
                    collectionName={artifact.collection.title}
                    size="md"
                  />
                </div>
              )}
              <h1 className="text-balance text-3xl font-bold tracking-tight">{artifact.title}</h1>
              <p className="text-pretty text-muted-foreground">{artifact.description || "No description provided"}</p>
            </div>
            {canEdit && (
              <Button variant="outline" asChild>
                <Link href={`/artifacts/${id}/edit`}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Link>
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            {artifact.media_urls && artifact.media_urls.length > 0 ? (
              artifact.media_urls.map((url, index) => (
                <div key={index} className="aspect-square overflow-hidden rounded-lg border bg-muted">
                  <img
                    src={getDetailUrl(url) || "/placeholder.svg"}
                    alt={`${artifact.title} - Image ${index + 1}`}
                    className="h-full w-full object-cover"
                  />
                </div>
              ))
            ) : (
              <div className="aspect-square overflow-hidden rounded-lg border bg-muted">
                <div className="flex h-full items-center justify-center">
                  <p className="text-sm text-muted-foreground">No media available</p>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold">Details</h2>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Collection</dt>
                  <dd className="font-medium">
                    <Link href={collectionHref} className="text-primary hover:underline">
                      {artifact.collection?.title || "Unknown"}
                    </Link>
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Added</dt>
                  <dd className="font-medium">{new Date(artifact.created_at).toLocaleDateString()}</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
