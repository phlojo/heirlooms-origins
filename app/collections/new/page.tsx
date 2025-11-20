export const dynamic = "force-dynamic"

import { AppLayout } from "@/components/app-layout"
import { NewCollectionForm } from "@/components/new-collection-form"
import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default async function NewCollectionPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/login")
  }

  return (
    <AppLayout user={user}>
      <div className="mx-auto max-w-2xl space-y-8">
        <Button variant="ghost" size="sm" asChild className="pl-0">
          <Link href="/collections">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        </Button>

        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create Collection</h1>
          <p className="mt-1 text-muted-foreground">Start a new collection to organize your artifacts</p>
        </div>

        <NewCollectionForm />
      </div>
    </AppLayout>
  )
}
