import { AppLayout } from "@/components/app-layout"
import { getCurrentUser } from "@/lib/supabase/server"
import { HomeCard } from "@/components/home-card"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export default async function HomePage() {
  const user = await getCurrentUser()

  const supabase = await createClient()

  const { data: artifacts } = await supabase
    .from("artifacts")
    .select("media_urls")
    .not("media_urls", "is", null)
    .limit(20)

  // Extract first image URL from each artifact's media_urls array
  const allImages =
    artifacts
      ?.map((artifact) => {
        const mediaUrls = artifact.media_urls as string[] | null
        return mediaUrls && mediaUrls.length > 0 ? mediaUrls[0] : null
      })
      .filter((url): url is string => url !== null) || []

  const shuffled = allImages.sort(() => Math.random() - 0.5)
  const backgroundImages = shuffled.slice(0, 3)

  return (
    <AppLayout user={user}>
      <div className="space-y-4">
        <div>
          <h1 className="flex items-center gap-3 font-bold tracking-tight text-3xl">
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
            Welcome to Heirlooms
          </h1>
          <p className="mt-2 text-lg text-muted-foreground">
            Preserve what matters to you and discover collections from the community.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          <HomeCard
            title="Artifacts"
            description="Capture your artifacts and browse those shared by the community."
            href="/artifacts"
            backgroundImage={backgroundImages[1]}
          />
          <HomeCard
            title="Collections"
            description="Organize your collections and explore those created by the community."
            href="/collections"
            backgroundImage={backgroundImages[0]}
          />
          <HomeCard
            title="Stories"
            description="Tell the stories behind your artifacts and read those shared by others."
            href="/stories"
            backgroundImage={backgroundImages[2]}
          />
        </div>
      </div>
    </AppLayout>
  )
}
