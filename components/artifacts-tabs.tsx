"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Plus, Loader2, Grid3x3, Grid2x2 } from "lucide-react"
import Link from "next/link"
import { ArtifactCard } from "@/components/artifact-card"
import { ArtifactCardCompact } from "@/components/artifact-card-compact"
import { LoginModule } from "@/components/login-module"
import { useEffect, useState, useTransition } from "react"
import { usePathname } from "next/navigation"
import { getAllPublicArtifactsPaginated, getMyArtifactsPaginated } from "@/lib/actions/artifacts"
import { updateArtifactsViewPreference } from "@/lib/actions/profile"

interface Artifact {
  id: string
  title: string
  description: string | null
  media_urls: string[]
  author_name: string | null
  created_at: string
  collection: {
    id: string
    title: string
    is_public: boolean
  } | null
}

interface ArtifactsTabsProps {
  user: any
  myArtifacts: Artifact[]
  allArtifacts: Artifact[]
  initialViewPreference?: "standard" | "compact"
}

const STORAGE_KEY = "heirloom-artifacts-tab"
const PAGE_SIZE = 24

type ViewType = "standard" | "compact"

export function ArtifactsTabs({
  user,
  myArtifacts,
  allArtifacts,
  initialViewPreference = "standard",
}: ArtifactsTabsProps) {
  const [activeTab, setActiveTab] = useState<string>("all")
  const [viewType, setViewType] = useState<ViewType>(initialViewPreference)
  const pathname = usePathname()

  const [allArtifactsList, setAllArtifactsList] = useState<Artifact[]>(allArtifacts)
  const [myArtifactsList, setMyArtifactsList] = useState<Artifact[]>(myArtifacts)
  const [allHasMore, setAllHasMore] = useState(allArtifacts.length === PAGE_SIZE)
  const [myHasMore, setMyHasMore] = useState(myArtifacts.length === PAGE_SIZE)
  const [isLoadingAll, startTransitionAll] = useTransition()
  const [isLoadingMy, startTransitionMy] = useTransition()

  useEffect(() => {
    const savedTab = sessionStorage.getItem(STORAGE_KEY)
    if (savedTab) {
      setActiveTab(savedTab)
    }
  }, [])

  const handleTabChange = (value: string) => {
    setActiveTab(value)
    sessionStorage.setItem(STORAGE_KEY, value)
  }

  const handleViewToggle = async () => {
    const newView: ViewType = viewType === "standard" ? "compact" : "standard"
    setViewType(newView)

    // Save to database if user is logged in
    if (user) {
      await updateArtifactsViewPreference(newView)
    }
  }

  const handleLoadMoreAll = async () => {
    if (isLoadingAll || !allHasMore) return

    const lastArtifact = allArtifactsList[allArtifactsList.length - 1]
    const cursor = lastArtifact ? { createdAt: lastArtifact.created_at, id: lastArtifact.id } : undefined

    startTransitionAll(async () => {
      try {
        const result = await getAllPublicArtifactsPaginated(user?.id, PAGE_SIZE, cursor)
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
    const cursor = lastArtifact ? { createdAt: lastArtifact.created_at, id: lastArtifact.id } : undefined

    startTransitionMy(async () => {
      try {
        const result = await getMyArtifactsPaginated(user.id, PAGE_SIZE, cursor)
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

      <TabsContent value="all" className="mt-6">
        {allArtifactsList.length > 0 ? (
          <>
            <div
              className={
                viewType === "standard"
                  ? "grid gap-2 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6"
                  : "grid gap-2 grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8"
              }
            >
              {allArtifactsList.map((artifact) =>
                viewType === "standard" ? (
                  <ArtifactCard
                    key={artifact.id}
                    artifact={artifact}
                    showAuthor={true}
                    authorName={artifact.author_name}
                  />
                ) : (
                  <ArtifactCardCompact key={artifact.id} artifact={artifact} showAuthor={false} />
                ),
              )}
            </div>
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
            <p className="text-sm text-muted-foreground">No public artifacts available yet.</p>
          </div>
        )}
      </TabsContent>

      <TabsContent value="mine" className="mt-6">
        {!user ? (
          <div className="mx-auto max-w-md">
            <LoginModule returnTo={pathname} title="Access Your Artifacts" showBackButton={false} />
          </div>
        ) : myArtifactsList.length > 0 ? (
          <>
            <div
              className={
                viewType === "standard"
                  ? "grid gap-2 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6"
                  : "grid gap-2 grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8"
              }
            >
              {myArtifactsList.map((artifact) =>
                viewType === "standard" ? (
                  <ArtifactCard key={artifact.id} artifact={artifact} showAuthor={false} />
                ) : (
                  <ArtifactCardCompact key={artifact.id} artifact={artifact} showAuthor={false} />
                ),
              )}
            </div>
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
            <p className="text-sm text-muted-foreground">You haven't created any artifacts yet.</p>
            <Button asChild className="mt-4">
              <Link href="/artifacts/new">
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Artifact
              </Link>
            </Button>
          </div>
        )}
      </TabsContent>
    </Tabs>
  )
}
