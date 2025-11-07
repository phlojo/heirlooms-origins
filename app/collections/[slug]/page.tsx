import { AppLayout } from "@/components/app-layout"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/supabase/server"
import { getCollectionBySlug, getAdjacentCollections } from "@/lib/actions/collections"
import { getArtifactsByCollection } from "@/lib/actions/artifacts"
import { ArtifactCard } from "@/components/artifact-card"
import { DeleteCollectionButton } from "@/components/delete-collection-button"
import { StickyNav } from "@/components/sticky-nav"
import { CollectionSwipeWrapper } from "@/components/collection-swipe-wrapper"

export default async function CollectionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ mode?: string }>
}) {
  const user = await getCurrentUser()

  const { slug } = await params
  const { mode: rawMode } = await searchParams

  const mode: "all" | "mine" | "both" = rawMode === "all" ? "all" : rawMode === "mine" ? "mine" : "both"

  if (slug === "new") {
    redirect("/collections/new")
  }

  let collection
  try {
    collection = await getCollectionBySlug(slug)
  } catch (error) {
    console.error("[v0] Error loading collection:", error)
    notFound()
  }

  if (!collection) {
    notFound()
  }

  const canView = collection.is_public || (user && collection.user_id === user.id)
  const canEdit = user && collection.user_id === user.id

  if (!canView) {
    notFound()
  }

  let artifacts = []
  try {
    artifacts = await getArtifactsByCollection(collection.id)
  } catch (error) {
    console.error("[v0] Error loading artifacts:", error)
    // Continue with empty artifacts array
  }

  let previous = null
  let next = null
  try {
    const adjacent = await getAdjacentCollections(collection.id, user?.id || null, mode)
    previous = adjacent.previous
    next = adjacent.next
  } catch (error) {
    console.error("[v0] Error loading adjacent collections:", error)
    // Continue without navigation
  }

  const getNavUrl = (slug: string) => {
    const baseUrl = `/collections/${slug}`
    return mode !== "both" ? `${baseUrl}?mode=${mode}` : baseUrl
  }

  const previousUrl = previous ? getNavUrl(previous.slug) : null
  const nextUrl = next ? getNavUrl(next.slug) : null

  return (
    <AppLayout user={user}>
      <CollectionSwipeWrapper previousUrl={previousUrl} nextUrl={nextUrl}>
        <div className="space-y-8">
          <StickyNav
            title={collection.title}
            backHref="/collections"
            backLabel="All Collections"
            previousItem={previous ? { id: previous.slug, title: previous.title } : null}
            nextItem={next ? { id: next.slug, title: next.title } : null}
            editHref={`/collections/${collection.id}/edit`}
            canEdit={canEdit}
            itemType="collection"
            mode={mode === "both" ? undefined : mode}
            authorUserId={collection.user_id}
            showBackButton={false}
          />

          <div className="space-y-4">
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

          {artifacts.length === 0 ? (
            <div className="rounded-lg border border-dashed p-12 text-center">
              <p className="text-sm text-muted-foreground">No artifacts in this collection yet.</p>
              {canEdit && (
                <p className="mt-2 text-xs text-muted-foreground">Click "Add Artifact" above to add your first item.</p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {artifacts.map((artifact) => (
                <ArtifactCard key={artifact.id} artifact={artifact} />
              ))}
            </div>
          )}
        </div>
      </CollectionSwipeWrapper>
    </AppLayout>
  )
}
