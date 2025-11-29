import { AppLayout } from "@/components/app-layout"
import { EditCollectionForm } from "@/components/edit-collection-form"
import { redirect, notFound } from 'next/navigation'
import { getCurrentUser, createClient } from "@/lib/supabase/server"
import { getCollection } from "@/lib/actions/collections"
import { isCurrentUserAdmin } from "@/lib/utils/admin"
import { CollectionsStickyNav } from "@/components/collections-sticky-nav"

export default async function EditCollectionPage({ params }: { params: Promise<{ slug: string }> }) {
  const user = await getCurrentUser()
  const { slug } = await params

  if (!user) {
    redirect("/login")
  }

  const collection = await getCollection(slug)

  if (!collection) {
    notFound()
  }

  const isAdmin = await isCurrentUserAdmin()

  // Check ownership or admin status
  if (!isAdmin && collection.user_id !== user.id) {
    notFound()
  }

  // Get artifact count for this collection
  const supabase = await createClient()
  const { count: artifactCount } = await supabase
    .from("artifacts")
    .select("*", { count: "exact", head: true })
    .eq("collection_id", collection.id)

  return (
    <AppLayout user={user}>
      <CollectionsStickyNav
        title={collection.title}
        backHref={`/collections/${collection.slug}`}
        backLabel={collection.title}
        canEdit={false}
        itemType="collection"
        showBackButton={true}
        isPrivate={!collection.is_public}
        currentUserId={user.id}
        isCurrentUserAdmin={isAdmin}
        contentOwnerId={collection.user_id}
      />
      <div className="mx-auto max-w-2xl space-y-8 pb-20">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Collection</h1>
          <p className="mt-1 text-muted-foreground">Update your collection details and settings</p>
        </div>

        <EditCollectionForm collection={collection} artifactCount={artifactCount ?? 0} />
      </div>
    </AppLayout>
  )
}
