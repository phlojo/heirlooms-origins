"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Loader2 } from "lucide-react"
import { createCollection } from "@/lib/actions/collections"
import { collectionSchema, type CollectionInput } from "@/lib/schemas"
import { TranscriptionInput } from "@/components/transcription-input"
import { useSupabase } from "@/lib/supabase/browser-context"
import { ArtifactTypeSelector } from "@/components/artifact-type-selector"
import { FormField, FormItem, FormMessage, Form } from "@/components/ui/form"
import { getArtifactTypes } from "@/lib/actions/artifact-types"

export function NewCollectionForm() {
  const router = useRouter()
  const supabase = useSupabase()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string>("")
  const [types, setTypes] = useState<any[]>([])

  // Get user ID for transcription audio storage
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserId(data.user.id)
      }
    })
  }, [supabase])

  // Load artifact types
  useEffect(() => {
    getArtifactTypes().then((result) => {
      setTypes(Array.isArray(result) ? result : [])
    })
  }, [])

  const form = useForm<CollectionInput>({
    resolver: zodResolver(collectionSchema),
    defaultValues: {
      title: "",
      description: "",
      is_public: true,
      primary_type_id: null,
    },
  })

  async function onSubmit(data: CollectionInput) {
    setIsSubmitting(true)
    setError(null)

    const result = await createCollection(data)

    if (result.success) {
      // Navigate directly to the new collection
      router.push(`/collections/${result.data.slug || result.data.id}`)
      return
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

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="title" className="text-sm font-medium">
            Title
          </Label>
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
          <Label htmlFor="description" className="text-sm font-medium">
            Description
          </Label>
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

        <FormField
          control={form.control}
          name="primary_type_id"
          render={({ field }) => (
            <FormItem>
              <ArtifactTypeSelector
                types={types}
                selectedTypeId={field.value}
                onSelectType={field.onChange}
                required={false}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Set a preferred type for artifacts in this collection (optional)
              </p>
              <FormMessage />
            </FormItem>
          )}
        />

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
          <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Collection
          </Button>
        </div>
      </form>
    </Form>
  )
}
