import { AppLayout } from "@/components/app-layout"
import { Button } from "@/components/ui/button"
import { Plus, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/supabase/server"
import { getCollectionBySlug } from "@/lib/actions/collections"
import { getArtifactsByCollection } from "@/lib/actions/artifacts"
import { ArtifactsCarousel } from "@/components/artifacts-carousel"
import { DeleteCollectionButton } from "@/components/delete-collection-button"

export default async function CollectionDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const user = await getCurrentUser()

  const { slug } = await params

  if (slug === "new") {
    redirect("/collections/new")
  }

  const collection = await getCollectionBySlug(slug)

  if (!collection) {
    notFound()
  }

  const canView = collection.is_public || (user && collection.user_id === user.id)
  const canEdit = user && collection.user_id === user.id

  if (!canView) {
    notFound()
  }

  const artifacts = await getArtifactsByCollection(collection.id)

  return (
    <AppLayout user={user}>
      <div className="space-y-8">
        <div>
          <Button variant="ghost" size="sm" asChild className="mb-4">
            <Link href="/collections">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Collections
            </Link>
          </Button>

          <div className="space-y-4">
            <h1 className="text-3xl font-bold tracking-tight">{collection.title}</h1>

            {collection.description && <p className="text-muted-foreground">{collection.description}</p>}

            {canEdit && (
              <div className="flex items-center gap-3">
                <Button asChild>
                  <Link href={`/artifacts/new?collectionId=${collection.id}`}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Artifact
                  </Link>
                </Button>
                <DeleteCollectionButton collectionId={collection.id} collectionTitle={collection.title} />
              </div>
            )}
          </div>
        </div>

        <div className="relative -mx-6 px-6 lg:-mx-8 lg:px-8">
          <ArtifactsCarousel artifacts={artifacts} canEdit={canEdit} />
        </div>
      </div>
    </AppLayout>
  )
}
