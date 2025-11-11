"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"
import { CollectionCard } from "@/components/collection-card"
import { EmptyCollections } from "@/components/empty-collections"
import { LoginModule } from "@/components/login-module"
import { useEffect, useState } from "react"

interface Collection {
  id: string
  name: string
  description: string | null
  slug: string
  thumbnailImages: string[]
  itemCount: number
}

interface CollectionsTabsProps {
  user: any
  myCollections: Collection[]
  allCollections: Collection[]
}

const STORAGE_KEY = "heirloom-collections-tab"

export function CollectionsTabs({ user, myCollections, allCollections }: CollectionsTabsProps) {
  const [activeTab, setActiveTab] = useState<string>("all")

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

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
      <div className="sticky top-0 lg:top-16 z-10 -mx-6 bg-background px-6 py-4 flex items-center justify-between border-b lg:-mx-8 lg:px-8 opacity-95">
        <TabsList>
          <TabsTrigger value="all">Community</TabsTrigger>
          <TabsTrigger value="mine">My Collections</TabsTrigger>
        </TabsList>
        {user ? (
          <Button asChild>
            <Link href="/collections/new">
              <Plus className="mr-2 h-4 w-4" />
              New
            </Link>
          </Button>
        ) : (
          <Button asChild variant="default">
            <Link href="/login">Sign In</Link>
          </Button>
        )}
      </div>

      <TabsContent value="all" className="mt-6">
        {allCollections.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {allCollections.map((collection) => (
              <CollectionCard key={collection.id} collection={collection} mode="all" />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed p-12 text-center">
            <p className="text-sm text-muted-foreground">No public collections available yet.</p>
          </div>
        )}
      </TabsContent>

      <TabsContent value="mine" className="mt-6">
        {!user ? (
          <div className="mx-auto max-w-md">
            <LoginModule returnTo="/collections" title="Access Your Collections" showBackButton={false} />
          </div>
        ) : myCollections.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {myCollections.map((collection) => (
              <CollectionCard key={collection.id} collection={collection} mode="mine" />
            ))}
          </div>
        ) : (
          <EmptyCollections />
        )}
      </TabsContent>
    </Tabs>
  )
}
