"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Author } from "@/components/author"
import { ArtifactCard } from "@/components/artifact-card"
import { CollectionThumbnailGrid } from "@/components/collection-thumbnail-grid"
import MediaImage from "@/components/media-image"
import { ArrowLeft, Pencil, ChevronLeft, ChevronRight, Grid3x3, List } from "lucide-react"
import { useRouter } from "next/navigation"
import { getPrimaryVisualMediaUrl } from "@/lib/media"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface CollectionDetailViewProps {
  collection: {
    id: string
    slug: string
    title: string
    description?: string
    cover_image?: string
    is_public: boolean
    user_id: string
    created_at: string
    updated_at: string
  }
  artifacts: Array<{
    id: string
    slug: string
    title: string
    description?: string
    media_urls?: string[]
    thumbnail_url?: string | null
    user_id: string
    artifact_type?: {
      id: string
      name: string
      icon_name: string
    } | null
    collection?: {
      id: string
      title: string
    } | null
  }>
  previous: { id: string; title: string; slug: string } | null
  next: { id: string; title: string; slug: string } | null
  canEdit: boolean
  previousUrl: string | null
  nextUrl: string | null
}

export function CollectionDetailView({
  collection,
  artifacts,
  previous,
  next,
  canEdit,
  previousUrl,
  nextUrl,
}: CollectionDetailViewProps) {
  const router = useRouter()
  const [comingSoonOpen, setComingSoonOpen] = useState(false)
  const [comingSoonFeature, setComingSoonFeature] = useState("")

  const handleComingSoon = (feature: string) => {
    setComingSoonFeature(feature)
    setComingSoonOpen(true)
  }

  // Determine collection thumbnail
  const thumbnailImages = artifacts
    .slice(0, 5)
    .map((artifact) => getPrimaryVisualMediaUrl(artifact.media_urls))
    .filter(Boolean) as string[]

  const isUncategorized = collection.slug.startsWith("uncategorized")

  return (
    <div className="space-y-6 px-4 lg:px-8 pt-4">
      {/* Navigation Bar */}
      <div className="flex items-center justify-between gap-4">
        <Button variant="ghost" size="sm" asChild className="gap-2">
          <Link href="/collections">
            <ArrowLeft className="h-4 w-4" />
            Back to Collections
          </Link>
        </Button>

        <div className="flex items-center gap-2">
          {previousUrl && (
            <Button variant="outline" size="icon" asChild className="rounded-lg bg-transparent">
              <Link href={previousUrl}>
                <ChevronLeft className="h-4 w-4" />
              </Link>
            </Button>
          )}
          {nextUrl && (
            <Button variant="outline" size="icon" asChild className="rounded-lg bg-transparent">
              <Link href={nextUrl}>
                <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Collection Header */}
      <Card className="overflow-hidden border">
        <div className="relative aspect-[21/9] overflow-hidden bg-muted">
          {thumbnailImages.length > 0 ? (
            <CollectionThumbnailGrid images={thumbnailImages} title={collection.title} />
          ) : collection.cover_image ? (
            <MediaImage
              src={collection.cover_image}
              alt={collection.title}
              className="w-full h-full"
              objectFit="cover"
            />
          ) : (
            <CollectionThumbnailGrid images={[]} title={collection.title} />
          )}
        </div>

        <div className="p-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-3xl font-bold tracking-tight">{collection.title}</h1>
                {!collection.is_public && <Badge variant="purple">Private</Badge>}
                {isUncategorized && <Badge variant="blue">System Collection</Badge>}
              </div>
              {collection.description && (
                <p className="text-muted-foreground leading-relaxed">{collection.description}</p>
              )}
            </div>

            {canEdit && (
              <Button asChild className="shrink-0 bg-purple-600 hover:bg-purple-700 text-white">
                <Link href={`/collections/${collection.slug}/edit`}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </Link>
              </Button>
            )}
          </div>

          <div className="flex items-center justify-between pt-2 border-t">
            <div className="flex items-center gap-4">
              <Author userId={collection.user_id} size="md" />
              <div className="h-4 w-px bg-border" />
              <p className="text-sm text-muted-foreground">
                {artifacts.length} {artifacts.length === 1 ? "artifact" : "artifacts"}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Artifacts Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Artifacts in this Collection</h2>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => handleComingSoon("Grid View")} className="rounded-lg">
              <Grid3x3 className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => handleComingSoon("List View")} className="rounded-lg">
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {artifacts.length === 0 ? (
          <Card className="p-12">
            <div className="text-center space-y-2">
              <p className="text-muted-foreground">This collection is empty</p>
              {canEdit && (
                <Button asChild variant="outline" className="mt-4 bg-transparent">
                  <Link href="/artifacts/new">Add Your First Artifact</Link>
                </Button>
              )}
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {artifacts.map((artifact) => (
              <ArtifactCard key={artifact.id} artifact={artifact} showAuthor={false} />
            ))}
          </div>
        )}
      </div>

      {/* Coming Soon Dialog */}
      <Dialog open={comingSoonOpen} onOpenChange={setComingSoonOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Coming Soon</DialogTitle>
            <DialogDescription>{comingSoonFeature} is coming in a future update!</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  )
}
