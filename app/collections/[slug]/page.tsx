import { AppLayout } from "@/components/app-layout"
import { Button } from "@/components/ui/button"
import { Plus, Edit } from "lucide-react"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { getCurrentUser, createClient } from "@/lib/supabase/server"
import { getCollectionBySlug } from "@/lib/actions/collections"
import { getArtifactsByCollection } from "@/lib/actions/artifacts"
import { ArtifactCard } from "@/components/artifact-card"
import { CollectionsStickyNav } from "@/components/collections-sticky-nav"

export default async function CollectionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ mode?: string }>
}) {
  const user = await getCurrentUser()
  const supabase = await createClient()

  const { slug } = await params
  const { mode: rawMode } = await searchParams

  const mode: "all" | "mine" | "both" = rawMode === "all" ? "all" : rawMode === "mine" ? "mine" : "both"

  if (slug === "new") {
    redirect("/collections/new")
  }

  let collection
  let isUnsorted = false
  if (slug === "unsorted") {
    if (!user) {
      notFound()
    }
    // Virtual "Unsorted" collection
    isUnsorted = true
    collection = {
      id: "unsorted",
      title: "Unsorted",
      description: "Artifacts that haven't been added to a collection yet",
      slug: "unsorted",
      user_id: user.id,
      is_public: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  } else {
    try {
      collection = await getCollectionBySlug(slug)
    } catch (error) {
      console.error("[v0] Error loading collection:", error)
      notFound()
    }

    if (!collection) {
      notFound()
    }
  }

  const canView = collection.is_public || (user && collection.user_id === user.id)
  const canEdit = user && collection.user_id === user.id && !isUnsorted
  const isOwnCollection = user && collection.user_id === user.id

  if (!canView) {
    notFound()
  }

  let artifacts = []
  try {
    if (isUnsorted) {
      // Get artifacts with null collection_id
      const { data } = await supabase
        .from("artifacts")
        .select("*, collection:collections(id, title)")
        .eq("user_id", user!.id)
        .is("collection_id", null)
        .order("created_at", { ascending: false })
      artifacts = data || []
    } else {
      artifacts = await getArtifactsByCollection(collection.id)
    }
  } catch (error) {
    console.error("[v0] Error loading artifacts:", error)
  }

  return (
    <AppLayout user={user}>
      <div className="space-y-8">
        <CollectionsStickyNav
          title={collection.title}
          backHref="/collections"
          backLabel="All Collections"
          editHref={`/collections/${collection.id}/edit`}
          canEdit={canEdit}
          itemType="collection"
          mode={mode === "both" ? undefined : mode}
          authorUserId={isOwnCollection ? undefined : collection.user_id}
          showBackButton={true}
          isPrivate={!collection.is_public} // Pass isPrivate prop
        />

        <div className="space-y-4">
          {canEdit && !isUnsorted && (
            <div className="flex items-center justify-between">
              <Button asChild className="bg-purple-600 hover:bg-purple-700 text-white">
                <Link href={`/collections/${collection.id}/edit`}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Collection
                </Link>
              </Button>
              <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white">
                <Link href={`/artifacts/new?collectionId=${collection.id}`}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Artifact
                </Link>
              </Button>
            </div>
          )}

          {isUnsorted && (
            <div className="inline-flex items-center gap-2 rounded-md border border-muted bg-muted/50 px-3 py-1.5 text-xs font-medium text-muted-foreground">
              <span>System Collection</span>
            </div>
          )}
          {collection.description && <p className="text-muted-foreground">{collection.description}</p>}

          {isUnsorted && (
            <div className="rounded-lg border border-dashed bg-muted/20 p-4">
              <p className="text-sm text-muted-foreground mb-3">
                These artifacts don't have a home yet. They were left behind from deleted collections or created without
                one. You can assign and organize them anytime
              </p>
            </div>
          )}
        </div>

        {artifacts.length === 0 ? (
          <div className="rounded-lg border border-dashed p-12 text-center">
            <p className="text-sm text-muted-foreground">
              {isUnsorted ? "No unsorted artifacts." : "No artifacts in this collection yet."}
            </p>
            {canEdit && !isUnsorted && (
              <p className="mt-2 text-xs text-muted-foreground">Click "Add Artifact" above to add your first item.</p>
            )}
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {artifacts.map((artifact) => (
              <ArtifactCard key={artifact.id} artifact={artifact} />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
