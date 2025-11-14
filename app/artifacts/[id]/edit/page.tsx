import { notFound, redirect } from 'next/navigation'
import { getCurrentUser } from "@/lib/supabase/server"
import { getArtifactById, getAdjacentArtifacts } from "@/lib/actions/artifacts"
import { AppLayout } from "@/components/app-layout"
import { ArtifactSwipeContent } from "@/components/artifact-swipe-content"

export default async function EditArtifactPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/login")
  }

  const { id } = await params
  const artifact = await getArtifactById(id)

  if (!artifact) {
    notFound()
  }

  if (artifact.user_id !== user.id) {
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
        canEdit={true}
        isEditMode={true}
        previousUrl={previous ? `/artifacts/${previous.id}/edit` : null}
        nextUrl={next ? `/artifacts/${next.id}/edit` : null}
      />
    </AppLayout>
  )
}
