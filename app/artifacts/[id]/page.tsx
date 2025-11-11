import { AppLayout } from "@/components/app-layout"
import { notFound } from "next/navigation"
import { getCurrentUser } from "@/lib/supabase/server"
import { getArtifactById, getAdjacentArtifacts } from "@/lib/actions/artifacts"
import { ArtifactSwipeContent } from "@/components/artifact-swipe-content"

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

  const { previous, next, currentPosition, totalCount } = await getAdjacentArtifacts(id, artifact.collection_id)

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
        previousUrl={previous ? `/artifacts/${previous.id}` : null}
        nextUrl={next ? `/artifacts/${next.id}` : null}
      />
    </AppLayout>
  )
}
