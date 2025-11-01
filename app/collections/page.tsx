import { AppLayout } from "@/components/app-layout"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus } from "lucide-react"
import Link from "next/link"
import { getCurrentUser, createClient } from "@/lib/supabase/server"
import { CollectionCard } from "@/components/collection-card"
import { EmptyCollections } from "@/components/empty-collections"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

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

        <Tabs defaultValue="all" className="w-full">
          <div className="sticky top-16 z-40 -mx-6 bg-background px-6 py-4 flex items-center justify-between border-b lg:-mx-8 lg:px-8 opacity-60 opacity-60 opacity-85 opacity-90 opacity-75 opacity-70 opacity-75 opacity-80 opacity-85 opacity-90 opacity-35 opacity-50">
            <TabsList>
              <TabsTrigger value="all">Community</TabsTrigger>
              <TabsTrigger value="mine">My Collections</TabsTrigger>
            </TabsList>
            {user && (
              <Button asChild>
                <Link href="/collections/new">
                  <Plus className="mr-2 h-4 w-4" />
                  New
                </Link>
              </Button>
            )}
          </div>

          <TabsContent value="all" className="mt-6">
            {allCollections.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {allCollections.map((collection) => (
                  <CollectionCard key={collection.id} collection={collection} />
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed p-12 text-center">
                <p className="text-sm text-muted-foreground">No public collections available yet.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="mine" className="mt-6">
            {!user ? (
              <Card className="mx-auto max-w-md">
                <CardHeader>
                  <CardTitle>Sign in to view your collections</CardTitle>
                  <CardDescription>Log in to create and manage your personal heirloom collections</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild className="w-full">
                    <Link href="/login">Sign In</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : myCollections.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {myCollections.map((collection) => (
                  <CollectionCard key={collection.id} collection={collection} />
                ))}
              </div>
            ) : (
              <EmptyCollections />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  )
}
