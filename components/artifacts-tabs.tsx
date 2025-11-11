"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"
import { ArtifactCard } from "@/components/artifact-card"
import { LoginModule } from "@/components/login-module"
import { useEffect, useState } from "react"

interface Artifact {
  id: string
  title: string
  description: string | null
  media_urls: string[]
  author_name: string | null
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
}

const STORAGE_KEY = "heirloom-artifacts-tab"

export function ArtifactsTabs({ user, myArtifacts, allArtifacts }: ArtifactsTabsProps) {
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
          <TabsTrigger value="mine">My Artifacts</TabsTrigger>
        </TabsList>
        {user ? (
          <Button asChild>
            <Link href="/artifacts/new">
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
        {allArtifacts.length > 0 ? (
          <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {allArtifacts.map((artifact) => (
              <ArtifactCard key={artifact.id} artifact={artifact} showAuthor={true} authorName={artifact.author_name} />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed p-12 text-center">
            <p className="text-sm text-muted-foreground">No public artifacts available yet.</p>
          </div>
        )}
      </TabsContent>

      <TabsContent value="mine" className="mt-6">
        {!user ? (
          <div className="mx-auto max-w-md">
            <LoginModule returnTo="/artifacts" title="Access Your Artifacts" showBackButton={false} />
          </div>
        ) : myArtifacts.length > 0 ? (
          <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {myArtifacts.map((artifact) => (
              <ArtifactCard key={artifact.id} artifact={artifact} showAuthor={false} />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed p-12 text-center">
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
