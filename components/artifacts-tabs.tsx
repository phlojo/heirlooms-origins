"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Plus, Loader2, Grid3x3, Grid2x2 } from "lucide-react"
import Link from "next/link"
import { ArtifactCard } from "@/components/artifact-card"
import { ArtifactCardCompact } from "@/components/artifact-card-compact"
import { LoginModule } from "@/components/login-module"
import { FilterBar } from "@/components/artifacts/filter-bar"
import { MasonryGrid } from "@/components/masonry-grid"
import { useEffect, useState, useTransition } from "react"
import { usePathname, useSearchParams, useRouter } from "next/navigation"
import { getAllPublicArtifactsPaginated, getMyArtifactsPaginated } from "@/lib/actions/artifacts"
import { updateArtifactsViewPreference } from "@/lib/actions/profile"
import { parseSortParam, parseTypeParams, hasActiveFilters, type SortOption } from "@/lib/utils/artifact-filters"

interface Artifact {
  id: string
  slug: string
  title: string
  description: string | null
  media_urls: string[]
  created_at: string
  updated_at: string
  year_acquired?: number | null
  origin?: string | null
  thumbnail_url?: string | null
  media_derivatives?: Record<string, any> | null
  user_id?: string
  author_name?: string | null
  artifact_type?: {
    id: string
    name: string
    icon_name: string
  } | null
  collection: {
    id: string
    title: string
    is_public: boolean
  } | null
}

interface ArtifactType {
  id: string
  name: string
  icon_name: string
}

interface ArtifactsTabsProps {
  user: any
  myArtifacts: Artifact[]
  allArtifacts: Artifact[]
  artifactTypes: ArtifactType[]
  initialViewPreference?: "standard" | "compact"
  initialSort?: SortOption
  initialTypeIds?: string[]
}

const STORAGE_KEY = "heirloom-artifacts-tab"
const PAGE_SIZE = 24

type ViewType = "standard" | "compact"

export function ArtifactsTabs({
  user,
  myArtifacts,
  allArtifacts,
  artifactTypes,
  initialViewPreference = "standard",
  initialSort = "newest",
  initialTypeIds = [],
}: ArtifactsTabsProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [activeTab, setActiveTab] = useState<string>("all")
  const [viewType, setViewType] = useState<ViewType>(initialViewPreference)
  const [sortBy, setSortBy] = useState<SortOption>(initialSort)
  const [selectedTypes, setSelectedTypes] = useState<string[]>(initialTypeIds)

  const [allArtifactsList, setAllArtifactsList] = useState<Artifact[]>(allArtifacts)
  const [myArtifactsList, setMyArtifactsList] = useState<Artifact[]>(myArtifacts)
  const [allHasMore, setAllHasMore] = useState(allArtifacts.length === PAGE_SIZE)
  const [myHasMore, setMyHasMore] = useState(myArtifacts.length === PAGE_SIZE)
  const [isLoadingAll, startTransitionAll] = useTransition()
  const [isLoadingMy, startTransitionMy] = useTransition()

  const allTypeIds = artifactTypes.map((t) => t.id)
  const hasFilters = hasActiveFilters(sortBy, selectedTypes, allTypeIds)

  useEffect(() => {
    const savedTab = sessionStorage.getItem(STORAGE_KEY)
    if (savedTab) {
      setActiveTab(savedTab)
    }
  }, [])

  // Update URL when filters change
  const updateURL = (newSort: SortOption, newTypes: string[]) => {
    const params = new URLSearchParams(searchParams.toString())
    if (newSort !== "newest") {
      params.set("sort", newSort)
    } else {
      params.delete("sort")
    }
    if (newTypes.length > 0 && newTypes.length < allTypeIds.length) {
      params.set("types", newTypes.join(","))
    } else {
      params.delete("types")
    }
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

  const handleTabChange = (value: string) => {
    setActiveTab(value)
    sessionStorage.setItem(STORAGE_KEY, value)

    // Reset type filters when switching tabs (keep sort)
    if (selectedTypes.length > 0) {
      setSelectedTypes([])
      const params = new URLSearchParams(searchParams.toString())
      params.delete("types")
      router.push(`${pathname}?${params.toString()}`, { scroll: false })
    }
  }

  const handleViewToggle = async () => {
    const newView: ViewType = viewType === "standard" ? "compact" : "standard"
    setViewType(newView)

    // Save to database if user is logged in
    if (user) {
      await updateArtifactsViewPreference(newView)
    }
  }

  const handleSortChange = (newSort: SortOption) => {
    setSortBy(newSort)
    updateURL(newSort, selectedTypes)
    // Refetch data with new sort
    refetchAll(newSort, selectedTypes)
  }

  const handleTypeChange = (newTypes: string[]) => {
    setSelectedTypes(newTypes)
    updateURL(sortBy, newTypes)
    // Refetch data with new types
    refetchAll(sortBy, newTypes)
  }

  const handleClearFilters = () => {
    setSortBy("newest")
    setSelectedTypes([])
    updateURL("newest", [])
    // Refetch data with default filters
    refetchAll("newest", [])
  }

  const refetchAll = async (sort: SortOption, types: string[]) => {
    startTransitionAll(async () => {
      try {
        const typeFilter = types.length > 0 && types.length < allTypeIds.length ? types : undefined
        const result = await getAllPublicArtifactsPaginated(user?.id, {
          limit: PAGE_SIZE,
          sortBy: sort,
          typeIds: typeFilter,
        })
        setAllArtifactsList(result.artifacts)
        setAllHasMore(result.hasMore)
      } catch (error) {
        console.error("Error refetching artifacts:", error)
      }
    })

    if (user) {
      startTransitionMy(async () => {
        try {
          const typeFilter = types.length > 0 && types.length < allTypeIds.length ? types : undefined
          const result = await getMyArtifactsPaginated(user.id, {
            limit: PAGE_SIZE,
            sortBy: sort,
            typeIds: typeFilter,
          })
          setMyArtifactsList(result.artifacts)
          setMyHasMore(result.hasMore)
        } catch (error) {
          console.error("Error refetching my artifacts:", error)
        }
      })
    }
  }

  const getCursor = (artifact: Artifact, sort: SortOption) => {
    switch (sort) {
      case "newest":
      case "oldest":
        return { createdAt: artifact.created_at, id: artifact.id }
      case "title-asc":
      case "title-desc":
        return { title: artifact.title, id: artifact.id }
      case "last-edited":
        return { updatedAt: artifact.updated_at, id: artifact.id }
    }
  }

  const handleLoadMoreAll = async () => {
    if (isLoadingAll || !allHasMore) return

    const lastArtifact = allArtifactsList[allArtifactsList.length - 1]
    const cursor = lastArtifact ? getCursor(lastArtifact, sortBy) : undefined

    startTransitionAll(async () => {
      try {
        const typeFilter = selectedTypes.length > 0 && selectedTypes.length < allTypeIds.length ? selectedTypes : undefined
        const result = await getAllPublicArtifactsPaginated(user?.id, {
          limit: PAGE_SIZE,
          cursor,
          sortBy,
          typeIds: typeFilter,
        })
        setAllArtifactsList((prev) => [...prev, ...result.artifacts])
        setAllHasMore(result.hasMore)
      } catch (error) {
        console.error("Error loading more artifacts:", error)
      }
    })
  }

  const handleLoadMoreMy = async () => {
    if (isLoadingMy || !myHasMore || !user) return

    const lastArtifact = myArtifactsList[myArtifactsList.length - 1]
    const cursor = lastArtifact ? getCursor(lastArtifact, sortBy) : undefined

    startTransitionMy(async () => {
      try {
        const typeFilter = selectedTypes.length > 0 && selectedTypes.length < allTypeIds.length ? selectedTypes : undefined
        const result = await getMyArtifactsPaginated(user.id, {
          limit: PAGE_SIZE,
          cursor,
          sortBy,
          typeIds: typeFilter,
        })
        setMyArtifactsList((prev) => [...prev, ...result.artifacts])
        setMyHasMore(result.hasMore)
      } catch (error) {
        console.error("Error loading more artifacts:", error)
      }
    })
  }

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
      <div className="sticky top-0 lg:top-16 z-10 -mx-3.5 lg:-mx-8 bg-background px-3.5 lg:px-8 py-4 flex items-center justify-between border-b opacity-95">
        <div className="flex items-center gap-2">
          <TabsList>
            <TabsTrigger value="all">Community</TabsTrigger>
            <TabsTrigger value="mine">My Artifacts</TabsTrigger>
          </TabsList>
          <Button
            variant="outline"
            size="icon"
            onClick={handleViewToggle}
            className="h-9 w-9 shrink-0 bg-transparent"
            aria-label={`Switch to ${viewType === "standard" ? "compact" : "standard"} view`}
          >
            {viewType === "standard" ? <Grid2x2 className="h-4 w-4" /> : <Grid3x3 className="h-4 w-4" />}
          </Button>
        </div>
        {user ? (
          <Button asChild>
            <Link href="/artifacts/new">
              <Plus className="mr-2 h-4 w-4" />
              New
            </Link>
          </Button>
        ) : (
          <Button asChild variant="default" className="lg:hidden">
            <Link href={`/login?returnTo=${encodeURIComponent(pathname)}`}>Sign In</Link>
          </Button>
        )}
      </div>

      <TabsContent value="all" className="mt-2">
        <FilterBar
          sortBy={sortBy}
          selectedTypes={selectedTypes}
          artifactTypes={artifactTypes}
          onSortChange={handleSortChange}
          onTypeChange={handleTypeChange}
          onClearFilters={handleClearFilters}
          hasActiveFilters={hasFilters}
          artifactCount={allArtifactsList.length}
        />

        {allArtifactsList.length > 0 ? (
          <>
            <MasonryGrid isCompact={viewType === "compact"} gutter={8}>
              {allArtifactsList.map((artifact) =>
                viewType === "standard" ? (
                  <ArtifactCard
                    key={artifact.id}
                    artifact={artifact as any}
                    showAuthor={true}
                    authorName={artifact.author_name}
                  />
                ) : (
                  <ArtifactCardCompact key={artifact.id} artifact={artifact as any} showAuthor={false} />
                ),
              )}
            </MasonryGrid>
            {allHasMore ? (
              <div className="mt-8 pb-12 flex justify-center">
                <Button
                  onClick={handleLoadMoreAll}
                  disabled={isLoadingAll}
                  size="lg"
                  variant="outline"
                  className="min-w-[200px] bg-transparent"
                >
                  {isLoadingAll ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    "Load more artifacts"
                  )}
                </Button>
              </div>
            ) : (
              <div className="pb-20" />
            )}
          </>
        ) : (
          <div className="rounded-lg border border-dashed p-12 text-center pb-20">
            <p className="text-sm text-muted-foreground">
              {hasFilters ? "No artifacts match your filters." : "No public artifacts available yet."}
            </p>
            {hasFilters && (
              <Button onClick={handleClearFilters} variant="outline" className="mt-4">
                Clear Filters
              </Button>
            )}
          </div>
        )}
      </TabsContent>

      <TabsContent value="mine" className="mt-2">
        {!user ? (
          <div className="mx-auto max-w-md">
            <LoginModule returnTo={pathname} title="Access Your Artifacts" showBackButton={false} />
          </div>
        ) : (
          <>
            <FilterBar
              sortBy={sortBy}
              selectedTypes={selectedTypes}
              artifactTypes={artifactTypes}
              onSortChange={handleSortChange}
              onTypeChange={handleTypeChange}
              onClearFilters={handleClearFilters}
              hasActiveFilters={hasFilters}
              artifactCount={myArtifactsList.length}
            />

            {myArtifactsList.length > 0 ? (
              <>
                <MasonryGrid isCompact={viewType === "compact"} gutter={8}>
                  {myArtifactsList.map((artifact) =>
                    viewType === "standard" ? (
                      <ArtifactCard key={artifact.id} artifact={artifact as any} showAuthor={false} />
                    ) : (
                      <ArtifactCardCompact key={artifact.id} artifact={artifact as any} showAuthor={false} />
                    ),
                  )}
                </MasonryGrid>
                {myHasMore ? (
                  <div className="mt-8 pb-12 flex justify-center">
                    <Button
                      onClick={handleLoadMoreMy}
                      disabled={isLoadingMy}
                      size="lg"
                      variant="outline"
                      className="min-w-[200px] bg-transparent"
                    >
                      {isLoadingMy ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        "Load more artifacts"
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="pb-20" />
                )}
              </>
            ) : (
              <div className="rounded-lg border border-dashed p-12 text-center pb-20">
                <p className="text-sm text-muted-foreground">
                  {hasFilters ? "No artifacts match your filters." : "You haven't created any artifacts yet."}
                </p>
                {hasFilters ? (
                  <Button onClick={handleClearFilters} variant="outline" className="mt-4">
                    Clear Filters
                  </Button>
                ) : (
                  <Button asChild className="mt-4">
                    <Link href="/artifacts/new">
                      <Plus className="mr-2 h-4 w-4" />
                      Create Your First Artifact
                    </Link>
                  </Button>
                )}
              </div>
            )}
          </>
        )}
      </TabsContent>
    </Tabs>
  )
}
