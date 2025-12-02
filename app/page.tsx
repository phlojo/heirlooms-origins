export const dynamic = "force-dynamic"

import { getCurrentUser, createClient } from "@/lib/supabase/server"
import { LoggedOutHomepage } from "@/components/homepage/logged-out-homepage"
import { LoggedInHomepage } from "@/components/homepage/logged-in-homepage"
import { getMyArtifactsPaginated } from "@/lib/actions/artifacts"
import { getMyCollectionsPaginated } from "@/lib/actions/collections"
import { getPrimaryVisualMediaUrl, isImageUrl, isVideoUrl } from "@/lib/media"

import type { ShowcaseSortOption } from "@/components/community-showcase"

/**
 * Fetch public artifacts for showcase with support for different sort options
 *
 * Current implementation:
 * - random: Fetches more artifacts and shuffles client-side
 * - newest: Orders by created_at desc
 *
 * Future implementation (requires DB columns):
 * - most-loved: Order by love_count desc (needs love_count column)
 * - most-viewed: Order by view_count desc (needs view_count column)
 * - trending: Algorithm based on recent views/loves (needs analytics)
 */
async function getPublicShowcaseArtifacts(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sortBy: ShowcaseSortOption = "random",
  limit: number = 6
) {
  let query = supabase
    .from("artifacts")
    .select(`
      id,
      slug,
      title,
      description,
      media_urls,
      media_derivatives,
      thumbnail_url,
      user_id,
      created_at,
      artifact_type:artifact_types(id, name, icon_name)
    `)
    .not("media_urls", "is", null)

  switch (sortBy) {
    case "newest":
      query = query.order("created_at", { ascending: false }).limit(limit)
      break
    case "most-loved":
      // Future: query = query.order("love_count", { ascending: false }).limit(limit)
      // For now, fall back to newest
      query = query.order("created_at", { ascending: false }).limit(limit)
      break
    case "most-viewed":
      // Future: query = query.order("view_count", { ascending: false }).limit(limit)
      // For now, fall back to newest
      query = query.order("created_at", { ascending: false }).limit(limit)
      break
    case "trending":
      // Future: Complex query based on recent activity
      // For now, fall back to newest
      query = query.order("created_at", { ascending: false }).limit(limit)
      break
    case "random":
    default:
      // Fetch more than needed and shuffle client-side
      // PostgreSQL random() is expensive, so we fetch extra and shuffle in JS
      query = query.limit(limit * 4)
      break
  }

  const { data: artifacts } = await query

  if (sortBy === "random" && artifacts) {
    // Fisher-Yates shuffle for true randomness
    const shuffled = [...artifacts]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled.slice(0, limit)
  }

  return artifacts || []
}

async function getPublicShowcaseData() {
  const supabase = await createClient()

  // Fetch random public artifacts for hero carousel (24 cards, circular/infinite)
  const heroCarouselArtifacts = await getPublicShowcaseArtifacts(supabase, "random", 24)

  // Fetch random public artifacts for showcase (9 for compact view, 6 for standard)
  const artifacts = await getPublicShowcaseArtifacts(supabase, "random", 9)

  // Fetch sample public collections for showcase
  const { data: collections } = await supabase
    .from("collections")
    .select("id, slug, title, description, cover_image, user_id, is_public")
    .eq("is_public", true)
    .limit(4)

  // Get background images for hero (Fisher-Yates shuffle for true randomness)
  const allImages =
    artifacts
      ?.map((artifact) => {
        const mediaUrls = artifact.media_urls as string[] | null
        return getPrimaryVisualMediaUrl(mediaUrls)
      })
      .filter((url): url is string => url !== null) || []

  const shuffledImages = [...allImages]
  for (let i = shuffledImages.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffledImages[i], shuffledImages[j]] = [shuffledImages[j], shuffledImages[i]]
  }
  const backgroundImages = shuffledImages.slice(0, 3)

  // Transform artifacts to match card prop interfaces
  const transformArtifact = (a: (typeof artifacts)[number]) => ({
    id: a.id,
    slug: a.slug,
    title: a.title,
    description: a.description,
    media_urls: a.media_urls as string[] | undefined,
    media_derivatives: a.media_derivatives as Record<string, any> | null,
    thumbnail_url: a.thumbnail_url,
    user_id: a.user_id,
    artifact_type: a.artifact_type?.[0] || null,
  })

  const heroArtifacts = heroCarouselArtifacts?.map(transformArtifact) || []
  const showcaseArtifacts = artifacts?.map(transformArtifact) || []

  const showcaseCollections = await Promise.all(
    (collections || []).map(async (c) => {
      // Get artifact count and thumbnails for each collection
      const { count } = await supabase
        .from("artifacts")
        .select("*", { count: "exact", head: true })
        .eq("collection_id", c.id)

      const { data: collectionArtifacts } = await supabase
        .from("artifacts")
        .select("media_urls, thumbnail_url")
        .eq("collection_id", c.id)
        .order("created_at", { ascending: false })
        .limit(4)

      const thumbnailImages = collectionArtifacts
        ?.map((a) => a.thumbnail_url || getPrimaryVisualMediaUrl(a.media_urls as string[] | null))
        .filter((url): url is string => url !== null) || []

      return {
        id: c.id,
        slug: c.slug,
        title: c.title,
        description: c.description,
        cover_image: c.cover_image,
        user_id: c.user_id,
        is_public: c.is_public,
        itemCount: count || 0,
        thumbnailImages,
      }
    })
  )

  return { backgroundImages, heroArtifacts, showcaseArtifacts, showcaseCollections }
}

async function getUserDashboardData(userId: string) {
  const supabase = await createClient()

  // Fetch user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, created_at")
    .eq("id", userId)
    .single()

  // Fetch recent artifacts (sorted by last edited)
  const { artifacts: recentArtifacts } = await getMyArtifactsPaginated(userId, {
    limit: 9,
    sortBy: "last-edited",
  })

  // Fetch user collections
  const { collections } = await getMyCollectionsPaginated(userId, 6)

  // Get stats
  const [artifactsCount, collectionsCount] = await Promise.all([
    supabase.from("artifacts").select("*", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("collections").select("*", { count: "exact", head: true }).eq("user_id", userId),
  ])

  // Collect all visual media URLs (images and videos, no audio) for random backgrounds
  const allVisualMedia: string[] = []
  recentArtifacts.forEach((artifact) => {
    const mediaUrls = artifact.media_urls as string[] | undefined
    if (mediaUrls) {
      mediaUrls.forEach((url) => {
        if (isImageUrl(url) || isVideoUrl(url)) {
          allVisualMedia.push(url)
        }
      })
    }
  })

  // Shuffle and pick 2 random images for stat card backgrounds
  const shuffledMedia = allVisualMedia.sort(() => Math.random() - 0.5)
  const statBackgrounds = {
    artifacts: shuffledMedia[0] || null,
    collections: shuffledMedia[1] || shuffledMedia[0] || null,
  }

  return {
    profile,
    recentArtifacts,
    collections,
    stats: {
      artifactsCount: artifactsCount.count || 0,
      collectionsCount: collectionsCount.count || 0,
    },
    statBackgrounds,
  }
}

export default async function HomePage() {
  const user = await getCurrentUser()

  if (user) {
    // Logged-in user: show dashboard
    const dashboardData = await getUserDashboardData(user.id)
    return (
      <LoggedInHomepage
        user={user}
        profile={dashboardData.profile}
        recentArtifacts={dashboardData.recentArtifacts}
        collections={dashboardData.collections}
        stats={dashboardData.stats}
        statBackgrounds={dashboardData.statBackgrounds}
      />
    )
  }

  // Logged-out user: show marketing page
  const showcaseData = await getPublicShowcaseData()
  return (
    <LoggedOutHomepage
      backgroundImages={showcaseData.backgroundImages}
      heroArtifacts={showcaseData.heroArtifacts}
      showcaseArtifacts={showcaseData.showcaseArtifacts}
      showcaseCollections={showcaseData.showcaseCollections}
    />
  )
}
