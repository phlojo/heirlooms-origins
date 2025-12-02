import { AppLayout } from "@/components/app-layout"
import { notFound, redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/supabase/server"
import { getArtifactBySlug, getAdjacentArtifacts } from "@/lib/actions/artifacts"
import { ArtifactDetailView } from "@/components/artifact-detail-view"
import { ArtifactStickyNav } from "@/components/artifact-sticky-nav"
import { isCurrentUserAdmin } from "@/lib/utils/admin"
import { getArtifactGalleryMedia } from "@/lib/actions/media"

export default async function ArtifactDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ mode?: string }>
}) {
  const user = await getCurrentUser()
  const { slug } = await params
  const { mode } = await searchParams

  const isEditMode = mode === "edit"

  // If edit mode is requested, require authentication
  if (isEditMode && !user) {
    redirect("/login?returnTo=/artifacts")
  }

  const artifact = await getArtifactBySlug(slug)

  if (!artifact) {
    notFound()
  }

  const isAdmin = await isCurrentUserAdmin()

  // View permission check
  const canView = artifact.collection?.is_public || (user && artifact.user_id === user.id) || isAdmin

  if (!canView) {
    notFound()
  }

  // Edit permission check
  const canEdit = user && (artifact.user_id === user.id || isAdmin)

  // If edit mode is requested but user doesn't have permission, deny access
  if (isEditMode && !canEdit) {
    notFound()
  }

  const { previous, next, currentPosition, totalCount } = await getAdjacentArtifacts(
    artifact.id,
    artifact.collection_id,
  )

  // Fetch gallery media from new unified media model (optional - falls back to media_urls)
  const { data: galleryMedia } = await getArtifactGalleryMedia(artifact.id)

  const collectionHref = artifact.collection?.slug
    ? `/collections/${artifact.collection.slug}`
    : `/collections/${artifact.collection_id}`

  // Build navigation URLs based on current mode
  const modeParam = isEditMode ? "?mode=edit" : ""
  const previousUrl = previous?.slug ? `/artifacts/${previous.slug}${modeParam}` : null
  const nextUrl = next?.slug ? `/artifacts/${next.slug}${modeParam}` : null

  return (
    <AppLayout user={user} noTopPadding>
      {/* Sticky nav rendered from server in view mode only */}
      {!isEditMode && (
        <ArtifactStickyNav
          title={artifact.title}
          backHref={collectionHref}
          backLabel={`${artifact.collection?.title || "Uncategorized"} Collection`}
          previousItem={previous}
          nextItem={next}
          editHref={`/artifacts/${artifact.slug}?mode=edit`}
          canEdit={canEdit}
          isEditMode={false}
          collectionId={artifact.collection_id}
          collectionSlug={artifact.collection?.slug}
          collectionName={artifact.collection?.title}
          currentUserId={user?.id}
          isCurrentUserAdmin={isAdmin}
          contentOwnerId={artifact.user_id}
          isLoggedIn={!!user}
        />
      )}

      <ArtifactDetailView
        artifact={artifact}
        previous={previous}
        next={next}
        currentPosition={currentPosition}
        totalCount={totalCount}
        collectionHref={collectionHref}
        canEdit={canEdit}
        isEditMode={isEditMode}
        previousUrl={previousUrl}
        nextUrl={nextUrl}
        galleryMedia={galleryMedia || undefined}
        isCurrentUserAdmin={isAdmin}
      />
    </AppLayout>
  )
}
