export const dynamic = "force-dynamic"

import { AppLayout } from "@/components/app-layout"
import { Button } from "@/components/ui/button"
import { NewArtifactForm } from "@/components/new-artifact-form"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/supabase/server"
import { getOrCreateUncategorizedCollection } from "@/lib/actions/collections"

export default async function NewArtifactPage({
  searchParams,
}: {
  searchParams: Promise<{ collectionId?: string; returnTo?: string }>
}) {
  const user = await getCurrentUser()
  if (!user) {
    redirect("/login?returnTo=/artifacts")
  }

  const { collectionId, returnTo } = await searchParams

  // Validate returnTo to prevent open redirect vulnerabilities
  const safeReturnTo = returnTo?.startsWith("/") ? returnTo : "/artifacts"

  let effectiveCollectionId = collectionId

  if (!effectiveCollectionId) {
    const result = await getOrCreateUncategorizedCollection(user.id)

    if (!result.success || !result.data) {
      redirect("/collections?error=failed-to-create-collection")
    }

    effectiveCollectionId = result.data.id
  }

  return (
    <AppLayout user={user}>
      <div className="mx-auto max-w-2xl space-y-4 pb-20">
        <Button variant="ghost" size="sm" asChild className="pl-0">
          <Link href={safeReturnTo}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        </Button>

        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create Artifact</h1>
          <p className="mt-1 text-muted-foreground">Add photos, videos, audio and your story.</p>
        </div>

        <NewArtifactForm collectionId={effectiveCollectionId} userId={user.id} />
      </div>
    </AppLayout>
  )
}
