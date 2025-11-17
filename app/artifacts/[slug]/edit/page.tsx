import { notFound, redirect } from 'next/navigation'
import { getCurrentUser } from "@/lib/supabase/server"
import { getArtifactBySlug, getAdjacentArtifacts } from "@/lib/actions/artifacts"
import { AppLayout } from "@/components/app-layout"
import { ArtifactSwipeContent } from "@/components/artifact-swipe-content"
import { isCurrentUserAdmin } from "@/lib/utils/admin"
import { ArtifactStickyNav } from "@/components/artifact-sticky-nav"

export default async function EditArtifactPage({ params }: { params: Promise<{ slug: string }> }) {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/login")
  }

  const { slug } = await params
  const artifact = await getArtifactBySlug(slug)

  if (!artifact) {
    notFound()
  }

  const isAdmin = await isCurrentUserAdmin()

  if (!isAdmin && artifact.user_id !== user.id) {
    notFound()
  }

  const { previous, next, currentPosition, totalCount } = await getAdjacentArtifacts(artifact.id, artifact.collection_id)

  const collectionHref = artifact.collection?.slug
    ? `/collections/${artifact.collection.slug}`
    : `/collections/${artifact.collection_id}`

  return (
    <AppLayout user={user}>
      <ArtifactStickyNav
        title={artifact.title}
        backHref={collectionHref}
        backLabel={`${artifact.collection?.title || "Uncategorized"} Collection`}
        previousItem={previous}
        nextItem={next}
        editHref={`/artifacts/${artifact.slug}/edit`}
        canEdit={true}
        isEditMode={true}
        collectionId={artifact.collection_id}
        collectionSlug={artifact.collection?.slug}
        collectionName={artifact.collection?.title}
        currentPosition={currentPosition}
        totalCount={totalCount}
        currentUserId={user.id}
        isCurrentUserAdmin={isAdmin}
        contentOwnerId={artifact.user_id}
      />
      
      <ArtifactSwipeContent
        artifact={artifact}
        previous={previous}
        next={next}
        currentPosition={currentPosition}
        totalCount={totalCount}
        collectionHref={collectionHref}
        canEdit={true}
        isEditMode={true}
        previousUrl={previous?.slug ? `/artifacts/${previous.slug}/edit` : null}
        nextUrl={next?.slug ? `/artifacts/${next.slug}/edit` : null}
      />
    </AppLayout>
  )
}
