"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Loader2, CheckCircle2 } from "lucide-react"
import { createCollection } from "@/lib/actions/collections"
import { collectionSchema, type CollectionInput } from "@/lib/schemas"
import Link from "next/link"

export function NewCollectionForm() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successData, setSuccessData] = useState<{ id: string; title: string } | null>(null)

  const form = useForm<CollectionInput>({
    resolver: zodResolver(collectionSchema),
    defaultValues: {
      title: "",
      description: "",
      is_public: true, // Updated default value for is_public
    },
  })

  async function onSubmit(data: CollectionInput) {
    setIsSubmitting(true)
    setError(null)

    const result = await createCollection(data)

    if (result.success) {
      setSuccessData({ id: result.data.slug || result.data.id, title: data.title })
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

  if (successData) {
    return (
      <div className="space-y-6">
        <Alert className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950">
          <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
          <AlertDescription className="text-green-800 dark:text-green-200">
            <strong className="font-semibold">Collection created successfully!</strong>
            <p className="mt-1">"{successData.title}" has been added to your collections.</p>
          </AlertDescription>
        </Alert>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild className="flex-1">
            <Link href={`/collections/${successData.id}`}>View Collection</Link>
          </Button>
          <Button asChild variant="outline" className="flex-1 bg-transparent">
            <Link href="/collections">Back to Collections</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input id="title" placeholder="Family Jewelry" {...form.register("title")} />
        {form.formState.errors.title && (
          <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="A collection of precious jewelry passed down through generations..."
          className="min-h-[100px]"
          {...form.register("description")}
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
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create Collection
        </Button>
      </div>
    </form>
  )
}
