"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Plus, Loader2, LayoutGrid, List } from "lucide-react"
import Link from "next/link"
import { CollectionCard } from "@/components/collection-card"
import { CollectionCardHorizontal } from "@/components/collection-card-horizontal"
import { UncategorizedCollectionCard } from "@/components/uncategorized-collection-card"
import { EmptyCollections } from "@/components/empty-collections"
import { LoginModule } from "@/components/login-module"
import { useEffect, useState, useTransition, useMemo } from "react"
import { usePathname } from "next/navigation"
import { getAllPublicCollectionsPaginated, getMyCollectionsPaginated } from "@/lib/actions/collections"
import { updateViewPreference } from "@/lib/actions/profile"

interface Collection {
  id: string
  name: string
  description: string | null
  slug: string
  thumbnailImages: string[]
  itemCount: number
  isUnsorted?: boolean
  created_at: string
}

interface CollectionsTabsProps {
  user: any
  myCollections: Collection[]
  allCollections: Collection[]
  myHasMore: boolean
  allHasMore: boolean
  initialViewPreference?: "gallery" | "list"
}

const STORAGE_KEY = "heirloom-collections-tab"
const PAGE_SIZE = 24

type ViewType = "gallery" | "list"

export function CollectionsTabs({
  user,
  myCollections,
  allCollections,
  myHasMore: initialMyHasMore,
  allHasMore: initialAllHasMore,
  initialViewPreference = "gallery",
}: CollectionsTabsProps) {
  const [activeTab, setActiveTab] = useState<string>("all")
  const [viewType, setViewType] = useState<ViewType>(initialViewPreference)
  const pathname = usePathname()

  const [allCollectionsList, setAllCollectionsList] = useState<Collection[]>(allCollections)
  const [myCollectionsList, setMyCollectionsList] = useState<Collection[]>(myCollections)
  const [allHasMore, setAllHasMore] = useState(initialAllHasMore)
  const [myHasMore, setMyHasMore] = useState(initialMyHasMore)
  const [isLoadingAll, setIsLoadingAll] = useState(false)
  const [isLoadingMy, setIsLoadingMy] = useState(false)

  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    const savedTab = sessionStorage.getItem(STORAGE_KEY)
    if (savedTab) {
      setActiveTab(savedTab)
    }
  }, [])

  const handleTabChange = (value: string) => {
    startTransition(() => {
      setActiveTab(value)
      sessionStorage.setItem(STORAGE_KEY, value)
    })
  }

  const handleViewToggle = async () => {
    const newView: ViewType = viewType === "gallery" ? "list" : "gallery"
    setViewType(newView)

    // Save to database if user is logged in
    if (user) {
      await updateViewPreference(newView)
    }
  }

  const handleLoadMoreAll = useMemo(
    () => async () => {
      if (isLoadingAll || !allHasMore) return

      setIsLoadingAll(true)
      try {
        const lastCollection = allCollectionsList[allCollectionsList.length - 1]
        const cursor = lastCollection ? { createdAt: lastCollection.created_at, id: lastCollection.id } : undefined

        const result = await getAllPublicCollectionsPaginated(user?.id, PAGE_SIZE, cursor)

        setAllCollectionsList((prev) => [...prev, ...result.collections])
        setAllHasMore(result.hasMore)
      } catch (error) {
        console.error("Error loading more collections:", error)
      } finally {
        setIsLoadingAll(false)
      }
    },
    [isLoadingAll, allHasMore, allCollectionsList, user?.id],
  )

  const handleLoadMoreMy = useMemo(
    () => async () => {
      if (isLoadingMy || !myHasMore || !user) return

      setIsLoadingMy(true)
      try {
        const lastCollection = myCollectionsList[myCollectionsList.length - 1]
        const cursor = lastCollection ? { createdAt: lastCollection.created_at, id: lastCollection.id } : undefined

        const result = await getMyCollectionsPaginated(user.id, PAGE_SIZE, cursor)

        setMyCollectionsList((prev) => [...prev, ...result.collections])
        setMyHasMore(result.hasMore)
      } catch (error) {
        console.error("Error loading more collections:", error)
      } finally {
        setIsLoadingMy(false)
      }
    },
    [isLoadingMy, myHasMore, myCollectionsList, user],
  )

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
      <div className="sticky top-0 lg:top-16 z-10 -mx-3.5 lg:-mx-8 bg-background px-3.5 lg:px-8 py-4 flex items-center justify-between border-b opacity-95">
        <div className="flex items-center gap-2">
          <TabsList>
            <TabsTrigger value="all">Community</TabsTrigger>
            <TabsTrigger value="mine">My Collections</TabsTrigger>
          </TabsList>
          <Button
            variant="outline"
            size="icon"
            onClick={handleViewToggle}
            className="h-9 w-9 shrink-0 bg-transparent"
            aria-label={`Switch to ${viewType === "gallery" ? "list" : "gallery"} view`}
          >
            {viewType === "gallery" ? <List className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
          </Button>
        </div>
        {user ? (
          <Button asChild>
            <Link href="/collections/new">
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

      <TabsContent value="all" className={`mt-6 transition-opacity ${isPending ? "opacity-50" : "opacity-100"}`}>
        {allCollectionsList.length > 0 ? (
          <>
            <div
              className={viewType === "gallery" ? "grid gap-2 md:grid-cols-2 lg:grid-cols-3" : "flex flex-col gap-2"}
            >
              {allCollectionsList.map((collection) =>
                viewType === "gallery" ? (
                  <CollectionCard key={collection.id} collection={collection} mode="all" />
                ) : (
                  <CollectionCardHorizontal key={collection.id} collection={collection} mode="all" />
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
                    "Load more collections"
                  )}
                </Button>
              </div>
            ) : (
              <div className="pb-20" />
            )}
          </>
        ) : (
          <div className="rounded-lg border border-dashed p-12 text-center pb-20">
            <p className="text-sm text-muted-foreground">No public collections available yet.</p>
          </div>
        )}
      </TabsContent>

      <TabsContent value="mine" className={`mt-6 transition-opacity ${isPending ? "opacity-50" : "opacity-100"}`}>
        {!user ? (
          <div className="mx-auto max-w-md">
            <LoginModule returnTo={pathname} title="Access Your Collections" showBackButton={false} />
          </div>
        ) : myCollectionsList.length > 0 ? (
          <>
            <div
              className={viewType === "gallery" ? "grid gap-2 md:grid-cols-2 lg:grid-cols-3" : "flex flex-col gap-2"}
            >
              {myCollectionsList.map((collection) =>
                viewType === "gallery" ? (
                  collection.isUnsorted ? (
                    <UncategorizedCollectionCard key={collection.id} collection={collection} mode="mine" />
                  ) : (
                    <CollectionCard key={collection.id} collection={collection} mode="mine" />
                  )
                ) : (
                  <CollectionCardHorizontal key={collection.id} collection={collection} mode="mine" />
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
                    "Load more collections"
                  )}
                </Button>
              </div>
            ) : (
              <div className="pb-20" />
            )}
          </>
        ) : (
          <div className="pb-20">
            <EmptyCollections />
          </div>
        )}
      </TabsContent>
    </Tabs>
  )
}
