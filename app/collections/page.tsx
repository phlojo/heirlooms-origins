import { AppLayout } from "@/components/app-layout"
import { getCurrentUser, createClient } from "@/lib/supabase/server"
import { CollectionsTabs } from "@/components/collections-tabs"

async function getMyCollections(userId: string) {
  const supabase = await createClient()

  try {
    const { data: collections, error } = await supabase
      .from("collections")
      .select(`
        *,
        artifacts(count)
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[v0] Error fetching my collections:", error)
      return []
    }

    const collectionsWithImages = await Promise.all(
      (collections || []).map(async (collection) => {
        const { data: artifacts } = await supabase
          .from("artifacts")
          .select("media_urls")
          .eq("collection_id", collection.id)
          .order("created_at", { ascending: false })
          .limit(5)

        const thumbnailImages = artifacts?.map((artifact) => artifact.media_urls?.[0]).filter(Boolean) || []

        return {
          ...collection,
          thumbnailImages,
          itemCount: collection.artifacts?.[0]?.count || 0,
          slug: collection.slug, // Ensure slug is included
        }
      }),
    )

    return collectionsWithImages
  } catch (error) {
    console.error("[v0] Unexpected error in getMyCollections:", error)
    return []
  }
}

async function getAllPublicCollections() {
  const supabase = await createClient()

  try {
    const { data: collections, error } = await supabase
      .from("collections")
      .select(`
        *,
        artifacts(count)
      `)
      .eq("is_public", true)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[v0] Error fetching public collections:", error)
      return []
    }

    const collectionsWithImages = await Promise.all(
      (collections || []).map(async (collection) => {
        const { data: artifacts } = await supabase
          .from("artifacts")
          .select("media_urls")
          .eq("collection_id", collection.id)
          .order("created_at", { ascending: false })
          .limit(5)

        const thumbnailImages = artifacts?.map((artifact) => artifact.media_urls?.[0]).filter(Boolean) || []

        return {
          ...collection,
          thumbnailImages,
          itemCount: collection.artifacts?.[0]?.count || 0,
          slug: collection.slug, // Ensure slug is included
        }
      }),
    )

    return collectionsWithImages
  } catch (error) {
    console.error("[v0] Unexpected error in getAllPublicCollections:", error)
    return []
  }
}

export default async function CollectionsPage() {
  const user = await getCurrentUser()

  const myCollections = user ? await getMyCollections(user.id) : []
  const allCollections = await getAllPublicCollections()

  return (
    <AppLayout user={user}>
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Collections</h1>
          <p className="mt-1 text-muted-foreground">Browse your collections and those shared by the community.</p>
        </div>

        <CollectionsTabs user={user} myCollections={myCollections} allCollections={allCollections} />
      </div>
    </AppLayout>
  )
}
