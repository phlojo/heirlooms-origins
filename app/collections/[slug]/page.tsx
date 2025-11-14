import { AppLayout } from "@/components/app-layout"
import { Button } from "@/components/ui/button"
import { Plus, Edit } from 'lucide-react'
import Link from "next/link"
import { notFound, redirect } from 'next/navigation'
import { getCurrentUser, createClient } from "@/lib/supabase/server"
import { getCollectionBySlug } from "@/lib/actions/collections"
import { getArtifactsByCollection } from "@/lib/actions/artifacts"
import { ArtifactCard } from "@/components/artifact-card"
import { CollectionsStickyNav } from "@/components/collections-sticky-nav"
import { Author } from "@/components/author"

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
  try {
    collection = await getCollectionBySlug(slug)
  } catch (error) {
    console.error("Error loading collection:", error)
    notFound()
  }

  if (!collection) {
    notFound()
  }
  
  const isUncategorized = collection.slug === "uncategorized"

  const canView = collection.is_public || (user && collection.user_id === user.id)
  const canEdit = user && collection.user_id === user.id && !isUncategorized
  const isOwnCollection = user && collection.user_id === user.id

  if (!canView) {
    notFound()
  }

  let artifacts = []
  try {
    if (isUncategorized && user) {
      console.log("[v0] Fetching uncategorized artifacts for user:", user.id)
      console.log("[v0] Collection ID:", collection.id)
      
      // Custom query for uncategorized: include both NULL and matching collection_id
      const { data, error } = await supabase
        .from("artifacts")
        .select(
          `
          *,
          user:users!artifacts_user_id_fkey(id, name, email, avatar_url),
          collection:collections(id, title, slug)
        `
        )
        .eq("user_id", user.id)
        .or(`collection_id.is.null,collection_id.eq.${collection.id}`)
        .order("created_at", { ascending: false })

      console.log("[v0] Query error:", error)
      console.log("[v0] Query returned artifacts count:", data?.length || 0)
      
      if (error) throw error
      artifacts = data || []
    } else {
      artifacts = await getArtifactsByCollection(collection.id)
    }
  } catch (error) {
    console.error("Error loading artifacts:", error)
  }

  console.log("[v0] Final artifacts count:", artifacts.length)
  console.log("[v0] isUncategorized:", isUncategorized)
  console.log("[v0] user exists:", !!user)

  return (
    <AppLayout user={user}>
      <div className="space-y-2.5">
        <CollectionsStickyNav
          title={collection.title}
          backHref="/collections"
          backLabel="All Collections"
          editHref={`/collections/${collection.id}/edit`}
          canEdit={canEdit}
          itemType="collection"
          mode={mode === "both" ? undefined : mode}
          showBackButton={true}
          isPrivate={!collection.is_public}
          isUnsorted={isUncategorized}
        />

        {!isOwnCollection && collection.user_id && (
          <div className="flex items-center justify-center py-4 px-6 lg:px-8">
            <Author userId={collection.user_id} size="sm" />
          </div>
        )}

        {isOwnCollection && (
          <div className="flex items-center justify-center gap-3 py-4 px-6 lg:px-8">
            {!isUncategorized && (
              <Button asChild className="bg-purple-600 hover:bg-purple-700 text-white">
                <Link href={`/collections/${collection.id}/edit`}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Collection
                </Link>
              </Button>
            )}
            <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white">
              <Link href={`/artifacts/new?collectionId=${collection.id}`}>
                <Plus className="mr-2 h-4 w-4" />
                Add Artifact
              </Link>
            </Button>
          </div>
        )}

        {isUncategorized && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mx-6 lg:mx-8 text-xs space-y-1">
            <p className="font-semibold text-yellow-900">Debug Info:</p>
            <p>Collection ID: {collection.id}</p>
            <p>Collection Slug: {collection.slug}</p>
            <p>Is Uncategorized: {isUncategorized.toString()}</p>
            <p>Artifacts Found: {artifacts.length}</p>
            <p>User ID: {user?.id || 'none'}</p>
            <p>Mode: {mode}</p>
            <p>Is Own Collection: {isOwnCollection.toString()}</p>
          </div>
        )}

        <div className="space-y-4">
          {!isUncategorized && collection.description && <p className="text-muted-foreground pb-2">{collection.description}</p>}

          {isUncategorized && (
            <div className="rounded-lg border border-dashed bg-muted/20 p-4">
              <p className="text-sm text-muted-foreground">
                This collection holds your uncategorized artifacts — items you&apos;ve created without assigning a
                collection, or ones that remained after a collection was deleted.
              </p>
            </div>
          )}
        </div>

        {artifacts.length === 0 ? (
          <div className="rounded-lg border border-dashed p-12 text-center">
            <p className="text-sm text-muted-foreground">
              {isUncategorized ? "No uncategorized artifacts." : "No artifacts in this collection yet."}
            </p>
            {canEdit && !isUncategorized && (
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
