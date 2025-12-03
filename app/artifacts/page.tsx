export const dynamic = "force-dynamic"

import { AppLayout } from "@/components/app-layout"
import { getCurrentUser } from "@/lib/supabase/server"
import { getAllPublicArtifactsPaginated, getMyArtifactsPaginated } from "@/lib/actions/artifacts"
import { getArtifactTypes } from "@/lib/actions/artifact-types"
import { ArtifactsTabs } from "@/components/artifacts-tabs"
import { ThemeToggle } from "@/components/theme-toggle"
import { getArtifactsViewPreference } from "@/lib/actions/profile"
import { parseSortParam, parseTypeParams } from "@/lib/utils/artifact-filters"
import { HeirloomsLogoBadge } from "@/components/heirlooms-logo-badge"

export default async function ArtifactsPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; types?: string }>
}) {
  const user = await getCurrentUser()
  const params = await searchParams

  // Fetch artifact types for filtering
  const artifactTypes = await getArtifactTypes()
  const validTypeIds = artifactTypes.map((t) => t.id)

  // Parse URL parameters
  const sortBy = parseSortParam(params.sort || null)
  const typeIds = parseTypeParams(params.types || null, validTypeIds)

  // Prepare query options
  const typeFilter = typeIds.length > 0 && typeIds.length < validTypeIds.length ? typeIds : undefined

  // Fetch initial data with filters
  const myArtifactsResult = user
    ? await getMyArtifactsPaginated(user.id, {
        limit: 24,
        sortBy,
        typeIds: typeFilter,
      })
    : { artifacts: [], hasMore: false }

  const allArtifactsResult = await getAllPublicArtifactsPaginated(user?.id, {
    limit: 24,
    sortBy,
    typeIds: typeFilter,
  })

  const viewPreference = await getArtifactsViewPreference()

  return (
    <AppLayout user={user}>
      <div className="space-y-0">
        <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight">
          <HeirloomsLogoBadge />
          Artifacts
          <div className="ml-auto lg:hidden">
            <ThemeToggle />
          </div>
        </h1>

        <ArtifactsTabs
          user={user}
          myArtifacts={myArtifactsResult.artifacts}
          allArtifacts={allArtifactsResult.artifacts}
          artifactTypes={artifactTypes}
          initialViewPreference={viewPreference}
          initialSort={sortBy}
          initialTypeIds={typeIds}
        />
      </div>
    </AppLayout>
  )
}
