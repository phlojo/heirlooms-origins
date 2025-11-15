import { AppLayout } from "@/components/app-layout"
import { notFound } from 'next/navigation'
import { getCurrentUser } from "@/lib/supabase/server"
import { getArtifactBySlug, getAdjacentArtifacts } from "@/lib/actions/artifacts"
import { ArtifactSwipeContent } from "@/components/artifact-swipe-content"
import { isCurrentUserAdmin } from "@/lib/utils/admin"

export default async function ArtifactDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const user = await getCurrentUser()

  const { slug } = await params
  const artifact = await getArtifactBySlug(slug)

  if (!artifact) {
    notFound()
  }

  const isAdmin = await isCurrentUserAdmin()

  const canView = artifact.collection?.is_public || (user && artifact.user_id === user.id) || isAdmin
  const canEdit = user && (artifact.user_id === user.id || isAdmin)

  if (!canView) {
    notFound()
  }

  const { previous, next, currentPosition, totalCount } = await getAdjacentArtifacts(artifact.id, artifact.collection_id)

  const collectionHref = artifact.collection?.slug
    ? `/collections/${artifact.collection.slug}`
    : `/collections/${artifact.collection_id}`

  return (
    <AppLayout user={user}>
      <ArtifactSwipeContent
        artifact={artifact}
        previous={previous}
        next={next}
        currentPosition={currentPosition}
        totalCount={totalCount}
        collectionHref={collectionHref}
        canEdit={canEdit}
        previousUrl={previous?.slug ? `/artifacts/${previous.slug}` : null}
        nextUrl={next?.slug ? `/artifacts/${next.slug}` : null}
      />
    </AppLayout>
  )
}
