"use client"

import type { User as SupabaseUser } from "@supabase/supabase-js"
import { AppLayout } from "@/components/app-layout"
import { HeirloomsLogoBadge } from "@/components/heirlooms-logo-badge"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { LayoutGrid, Plus, LogOut, ArrowRight } from "lucide-react"
import { AnimatedArtifactsIcon } from "@/components/navigation/animated-artifacts-icon"
import { ArtifactCardCompact } from "@/components/artifact-card-compact"
import { CollectionCard } from "@/components/collection-card"
import { ThemeToggle } from "@/components/theme-toggle"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useTransition } from "react"

interface DashboardArtifact {
  id: string
  slug: string
  title: string
  description?: string | null
  media_urls?: string[]
  media_derivatives?: Record<string, any> | null
  thumbnail_url?: string | null
  user_id?: string
  artifact_type?: {
    id: string
    name: string
    icon_name: string
  } | null
}

interface DashboardCollection {
  id: string
  slug?: string
  title: string
  description?: string | null
  cover_image?: string | null
  user_id: string
  is_public?: boolean
  itemCount: number
  thumbnailImages?: string[]
  isUnsorted?: boolean
}

interface LoggedInHomepageProps {
  user: SupabaseUser
  profile: {
    display_name?: string | null
    created_at?: string | null
  } | null
  recentArtifacts: DashboardArtifact[]
  collections: DashboardCollection[]
  stats: {
    artifactsCount: number
    collectionsCount: number
  }
  statBackgrounds?: {
    artifacts: string | null
    collections: string | null
  }
}

export function LoggedInHomepage({
  user,
  profile,
  stats,
  recentArtifacts,
  collections,
  statBackgrounds,
}: LoggedInHomepageProps) {
  const displayName = profile?.display_name || user.email?.split("@")[0] || "there"
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const handleSignOut = async () => {
    await fetch("/api/auth/signout", { method: "POST" })
    startTransition(() => {
      router.push("/")
      router.refresh()
    })
  }

  return (
    <AppLayout user={user}>
      <div className="w-full space-y-6 sm:space-y-8 pb-20">
        {/* Logo and Title */}
        <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight w-full min-w-0">
          <HeirloomsLogoBadge />
          Heirlooms
          <span className="text-sm font-normal text-muted-foreground">(Beta)</span>
          <div className="ml-auto lg:hidden">
            <ThemeToggle />
          </div>
        </h1>

        {/* Welcome Message */}
        <div className="w-full min-w-0">
          <p className="text-muted-foreground flex items-center gap-2 flex-wrap mb-4 w-full">
            Welcome back,
            <Link href="/profile">
              <span className="inline-flex items-center rounded-full bg-primary/10 px-4 py-1.5 text-base font-bold text-primary max-w-full truncate cursor-pointer hover:bg-primary/15 transition-colors">
                {displayName}
              </span>
            </Link>
            <Button
              onClick={handleSignOut}
              disabled={isPending}
              variant="outline"
              className="h-[34px] px-3 gap-2 shrink-0"
              aria-label="Log out"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </p>
          <p className="text-muted-foreground w-full">
            Here&apos;s what&apos;s happening in your Heirlooms today:
          </p>
        </div>

        {/* Quick Stats */}
        <div className="w-full grid grid-cols-2 gap-3 min-w-0">
          <Link href="/artifacts?tab=mine">
            <Card className="overflow-hidden relative group cursor-pointer transition-all hover:shadow-lg">
              {statBackgrounds?.artifacts && (
                <div
                  className="absolute inset-0 bg-cover bg-center opacity-10 group-hover:opacity-15 transition-opacity"
                  style={{ backgroundImage: `url(${statBackgrounds.artifacts})` }}
                />
              )}
              <CardContent className="p-6 flex flex-col items-center justify-center text-center relative z-10">
                <div className="mb-3">
                  <AnimatedArtifactsIcon className="h-8 w-8 text-primary" />
                </div>
                <p className="text-3xl font-bold">{stats.artifactsCount}</p>
                <p className="text-sm text-muted-foreground mt-1">Artifacts</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/collections?tab=mine">
            <Card className="overflow-hidden relative group cursor-pointer transition-all hover:shadow-lg">
              {statBackgrounds?.collections && (
                <div
                  className="absolute inset-0 bg-cover bg-center opacity-10 group-hover:opacity-15 transition-opacity"
                  style={{ backgroundImage: `url(${statBackgrounds.collections})` }}
                />
              )}
              <CardContent className="p-6 flex flex-col items-center justify-center text-center relative z-10">
                <div className="mb-3">
                  <LayoutGrid className="h-8 w-8 text-primary" />
                </div>
                <p className="text-3xl font-bold">{stats.collectionsCount}</p>
                <p className="text-sm text-muted-foreground mt-1">Collections</p>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Continue Where You Left Off */}
        <section className="w-full min-w-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Continue Where You Left Off</h2>
            <Link
              href="/artifacts?tab=mine"
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors self-end mb-0.5"
            >
              View All
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {recentArtifacts.slice(0, 5).map((artifact) => (
              <ArtifactCardCompact key={artifact.id} artifact={artifact} singleLineTitle={true} />
            ))}
            <Link href="/artifacts/new">
              <Card className="group overflow-hidden border-2 border-dashed border-muted-foreground/30 p-0 transition-all hover:border-primary hover:shadow-lg rounded-md flex flex-col h-full bg-transparent hover:bg-muted/30">
                <div className="relative aspect-square overflow-hidden flex items-center justify-center">
                  <AnimatedArtifactsIcon className="h-16 w-16 text-muted-foreground/40 group-hover:text-primary/60 transition-colors" />
                </div>
                <div className="px-1.5 pt-1 pb-1.5 flex-none">
                  <div className="flex items-center justify-center gap-1.5 text-muted-foreground group-hover:text-primary transition-colors">
                    <Plus className="h-4 w-4" />
                    <span className="font-medium text-xs">Add Artifact</span>
                  </div>
                </div>
              </Card>
            </Link>
          </div>
        </section>

        {/* Your Collections */}
        <section className="w-full min-w-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Your Collections</h2>
            <Link
              href="/collections?tab=mine"
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors self-end mb-0.5"
            >
              View All
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {collections
              .filter(c => !c.isUnsorted)
              .slice(0, 5)
              .map((collection) => (
                <CollectionCard key={collection.id} collection={collection} mode="mine" />
              ))}
            <Link href="/collections/new">
              <Card className="group overflow-hidden border-2 border-dashed border-muted-foreground/30 p-0 transition-all hover:border-primary hover:shadow-lg rounded-md relative aspect-[4/3] sm:aspect-[3/2] bg-transparent hover:bg-muted/30">
                {/* Icon centered in card */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <LayoutGrid className="h-16 w-16 text-muted-foreground/40 group-hover:text-primary/60 transition-colors" />
                </div>
                {/* Text overlay at bottom */}
                <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4">
                  <div className="flex items-center justify-center gap-1.5 text-muted-foreground group-hover:text-primary transition-colors">
                    <Plus className="h-4 w-4" />
                    <span className="font-semibold text-sm">Add Collection</span>
                  </div>
                </div>
              </Card>
            </Link>
          </div>
        </section>
      </div>
    </AppLayout>
  )
}
