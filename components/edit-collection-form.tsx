"use client"

import { useState, useEffect } from "react"
import { useRouter } from 'next/navigation'
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { TranscriptionInput } from "@/components/transcription-input"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Loader2, CheckCircle2, Trash2 } from 'lucide-react'
import { updateCollection, deleteCollection } from "@/lib/actions/collections"
import { collectionSchema, type CollectionInput } from "@/lib/schemas"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useSupabase } from "@/lib/supabase/browser-context"

interface EditCollectionFormProps {
  collection: {
    id: string
    title: string
    description?: string | null
    is_public: boolean
    slug: string
  }
}

export function EditCollectionForm({ collection }: EditCollectionFormProps) {
  const router = useRouter()
  const supabase = useSupabase()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successData, setSuccessData] = useState<{ id: string; title: string } | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false)
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteArtifactsChoice, setDeleteArtifactsChoice] = useState<"delete" | "keep">("keep")
  const [userId, setUserId] = useState<string>("")

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserId(data.user.id)
      }
    })
  }, [supabase])

  const form = useForm<CollectionInput>({
    resolver: zodResolver(collectionSchema),
    defaultValues: {
      title: collection.title,
      description: collection.description || "",
      is_public: collection.is_public,
    },
  })

  useEffect(() => {
    const subscription = form.watch(() => {
      setHasUnsavedChanges(true)
    })
    return () => subscription.unsubscribe()
  }, [form])

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges && !successData) {
        e.preventDefault()
        e.returnValue = ""
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [hasUnsavedChanges, successData])

  const handleNavigation = (path: string) => {
    if (hasUnsavedChanges && !successData) {
      setPendingNavigation(path)
      setShowUnsavedDialog(true)
    } else {
      router.push(path)
    }
  }

  const confirmNavigation = () => {
    if (pendingNavigation) {
      router.push(pendingNavigation)
    }
  }

  async function onSubmit(data: CollectionInput) {
    setIsSubmitting(true)
    setError(null)

    const result = await updateCollection(collection.id, data)

    if (result.success) {
      setSuccessData({ id: result.data.slug || result.data.id, title: data.title })
      setHasUnsavedChanges(false)
      setIsSubmitting(false)
    } else {
      setIsSubmitting(false)

      if (result.fieldErrors) {
        Object.entries(result.fieldErrors).forEach(([field, messages]) => {
          form.setError(field as keyof CollectionInput, {
            message: messages.join(", "),
          })
        })
      }

      if (result.error) {
        setError(result.error)
      }
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    const result = await deleteCollection(collection.id, deleteArtifactsChoice === "delete")

    if (result.success) {
      router.push("/collections")
      router.refresh()
    } else {
      setError(result.error || "Failed to delete collection")
      setIsDeleting(false)
      setDeleteDialogOpen(false)
    }
  }

  if (successData) {
    return (
      <div className="space-y-6">
        <Alert className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950">
          <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
          <AlertDescription className="text-green-800 dark:text-green-200">
            <strong className="font-semibold">Collection updated successfully!</strong>
            <p className="mt-1">"{successData.title}" has been updated.</p>
          </AlertDescription>
        </Alert>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild className="flex-1">
            <button onClick={() => router.push(`/collections/${successData.id}`)}>View Collection</button>
          </Button>
          <Button asChild variant="outline" className="flex-1 bg-transparent">
            <button onClick={() => router.push("/collections")}>Back to Collections</button>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <TranscriptionInput
            value={form.watch("title")}
            onChange={(value) => form.setValue("title", value)}
            placeholder="Family Jewelry"
            type="input"
            fieldType="title"
            userId={userId}
            entityType="collection"
          />
          {form.formState.errors.title && (
            <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <TranscriptionInput
            value={form.watch("description") || ""}
            onChange={(value) => form.setValue("description", value)}
            placeholder="A collection of precious jewelry passed down through generations..."
            type="textarea"
            fieldType="description"
            userId={userId}
            entityType="collection"
            rows={4}
          />
          {form.formState.errors.description && (
            <p className="text-sm text-destructive">{form.formState.errors.description.message}</p>
          )}
        </div>

        <div className="flex flex-row items-start space-x-3 rounded-md border p-4">
          <Checkbox
            id="is_public"
            checked={form.watch("is_public")}
            onCheckedChange={(checked) => form.setValue("is_public", checked as boolean)}
          />
          <div className="space-y-1 leading-none">
            <Label htmlFor="is_public" className="cursor-pointer">
              Make this collection public
            </Label>
            <p className="text-sm text-muted-foreground">Public collections can be viewed by anyone</p>
          </div>
        </div>

        <div className="flex gap-4">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleNavigation(`/collections/${collection.slug}`)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        </div>

        {/* Delete Collection Section */}
        <div className="border-t pt-6 mt-8">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-destructive">Danger Zone</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Permanently delete this collection. This action cannot be undone.
              </p>
            </div>

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" type="button" disabled={isDeleting}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Collection
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Collection</AlertDialogTitle>
                  <AlertDialogDescription className="space-y-4">
                    <p>
                      You are about to permanently delete <strong>"{collection.title}"</strong>.
                    </p>
                    <div className="space-y-3">
                      <p className="font-medium text-foreground">
                        What should happen to the artifacts in this collection?
                      </p>
                      <RadioGroup
                        value={deleteArtifactsChoice}
                        onValueChange={(v) => setDeleteArtifactsChoice(v as "delete" | "keep")}
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="keep" id="keep" />
                          <Label htmlFor="keep" className="font-normal cursor-pointer">
                            Move artifacts to Unsorted collection
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="delete" id="delete" />
                          <Label htmlFor="delete" className="font-normal cursor-pointer">
                            Delete all artifacts and their media permanently
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>
                    <p className="text-xs text-muted-foreground">This action cannot be undone.</p>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={(e) => {
                      e.preventDefault()
                      handleDelete()
                    }}
                    disabled={isDeleting}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      "Delete Collection"
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </form>

      {/* Unsaved Changes Dialog */}
      <AlertDialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Are you sure you want to leave? Your changes will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingNavigation(null)}>Stay on Page</AlertDialogCancel>
            <AlertDialogAction onClick={confirmNavigation}>Leave Without Saving</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
