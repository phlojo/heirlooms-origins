export const dynamic = "force-dynamic"

import { AppLayout } from "@/components/app-layout"
import { getCurrentUser } from "@/lib/supabase/server"
import { CollectionsTabs } from "@/components/collections-tabs"
import { ThemeToggle } from "@/components/theme-toggle"
import { getAllPublicCollectionsPaginated, getMyCollectionsPaginated } from "@/lib/actions/collections"
import { getViewPreference } from "@/lib/actions/profile"

export default async function CollectionsPage() {
  const user = await getCurrentUser()

  const myCollectionsResult = user ? await getMyCollectionsPaginated(user.id, 24) : { collections: [], hasMore: false }
  const allCollectionsResult = await getAllPublicCollectionsPaginated(user?.id, 24)
  const viewPreference = await getViewPreference()

  return (
    <AppLayout user={user}>
      <div className="space-y-00p]]">
        <div className="min-w-0">
          <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center bg-gradient-to-br from-primary to-chart-2 text-primary-foreground shadow-sm rounded-sm">
              <svg
                width="24"
                height="26"
                viewBox="0 0 80 90"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="shrink-0"
              >
                <path d="M39.6001 90L52.1001 82.7L39.6001 75.5L27.1001 82.7L39.6001 90Z" fill="currentColor" />
                <path d="M2.0001 68.3L14.6001 75.5L27.1001 68.3L14.6001 61L2.0001 68.3Z" fill="currentColor" />
                <path d="M77.2002 68.3L64.6002 61L52.1002 68.3L64.6002 75.5L77.2002 68.3Z" fill="currentColor" />
                <path d="M39.6001 61L52.1001 53.8L39.6001 46.6L27.1001 53.8L39.6001 61Z" fill="currentColor" />
                <path d="M39.6001 75.5L52.1001 68.3L39.6001 61L27.1001 68.3L39.6001 75.5Z" fill="currentColor" />
                <path d="M37.6001 43.3L37.6001 28.9L25.1001 36.1L25.1001 50.5L37.6001 43.3Z" fill="currentColor" />
                <path d="M12.6001 43.3L0.0001 50.5L0 65L12.6001 57.8L12.6001 43.3Z" fill="currentColor" />
                <path d="M37.6001 0L25.1001 7.2L25.1001 21.6L37.6001 14.4L37.6001 0Z" fill="currentColor" />
                <path d="M0 21.6L0 36.1L12.6001 28.9L12.6001 14.4L0 21.6Z" fill="currentColor" />
                <path d="M25.1001 21.6L12.6001 28.9L12.6001 43.3L25.1001 36.1L25.1001 21.6Z" fill="currentColor" />
                <path d="M41.6001 43.3L54.1001 50.5L54.1001 36.1L41.6001 28.9L41.6001 43.3Z" fill="currentColor" />
                <path d="M79.2002 65L79.2002 50.5L66.6002 43.3L66.6002 57.8L79.2002 65Z" fill="currentColor" />
                <path d="M54.1001 7.2L41.6001 0L41.6001 14.4L54.1001 21.6L54.1001 7.2Z" fill="currentColor" />
                <path d="M79.2002 21.6L66.6002 14.4L66.6002 28.9L79.2002 36.1L79.2002 21.6Z" fill="currentColor" />
                <path d="M66.6001 43.3L66.6001 28.9L54.1001 21.6L54.1001 36.1L66.6001 43.3Z" fill="currentColor" />
              </svg>
            </div>
            <span className="min-w-0">Collections</span>
            <div className="ml-auto lg:hidden">
              <ThemeToggle />
            </div>
          </h1>
        </div>

        <CollectionsTabs
          user={user}
          myCollections={myCollectionsResult.collections}
          allCollections={allCollectionsResult.collections}
          myHasMore={myCollectionsResult.hasMore}
          allHasMore={allCollectionsResult.hasMore}
          initialViewPreference={viewPreference}
        />
      </div>
    </AppLayout>
  )
}
