"use client"

import { useState, useTransition } from "react"
import { useRouter } from 'next/navigation'
import { Trash2, Loader2 } from 'lucide-react'
import { Button } from "@/components/ui/button"
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
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { deleteCollection } from "@/lib/actions/collections"
import { toast } from "sonner"

interface DeleteCollectionButtonProps {
  collectionId: string
  collectionTitle: string
  artifactCount?: number
}

export function DeleteCollectionButton({ collectionId, collectionTitle, artifactCount = 0 }: DeleteCollectionButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [deleteArtifacts, setDeleteArtifacts] = useState<"delete" | "keep">("keep")
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const handleDelete = async () => {
    setIsDeleting(true)

    try {
      const result = await deleteCollection(collectionId, deleteArtifacts === "delete")

      if (result.success) {
        toast.success(
          deleteArtifacts === "delete"
            ? "Collection and artifacts deleted successfully"
            : "Collection deleted. Artifacts moved to Unsorted",
        )
        startTransition(() => {
          router.push("/collections")
          router.refresh()
        })
      } else {
        toast.error(result.error || "Failed to delete collection")
        setIsDeleting(false)
        setIsOpen(false)
      }
    } catch (error) {
      console.error("[v0] Delete collection error:", error)
      toast.error("An unexpected error occurred")
      setIsDeleting(false)
      setIsOpen(false)
    }
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" disabled={isDeleting || isPending}>
          <Trash2 className="mr-2 h-4 w-4" />
          Delete Collection
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Collection</AlertDialogTitle>
          <AlertDialogDescription>
            You are about to delete the collection <strong>"{collectionTitle}"</strong>. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {artifactCount > 0 && (
          <div className="space-y-4 py-4">
            <Label className="text-base font-semibold">What should happen to the artifacts in this collection?</Label>
            <RadioGroup value={deleteArtifacts} onValueChange={(value) => setDeleteArtifacts(value as "delete" | "keep")}>
              <div className="flex items-start space-x-3 space-y-0">
                <RadioGroupItem value="keep" id="keep" />
                <Label htmlFor="keep" className="font-normal cursor-pointer">
                  <div className="font-medium">Move to Unsorted</div>
                  <div className="text-sm text-muted-foreground">
                    Keep artifacts and move them to your Unsorted collection
                  </div>
                </Label>
              </div>
              <div className="flex items-start space-x-3 space-y-0">
                <RadioGroupItem value="delete" id="delete" />
                <Label htmlFor="delete" className="font-normal cursor-pointer">
                  <div className="font-medium">Delete artifacts</div>
                  <div className="text-sm text-muted-foreground">
                    Permanently delete all artifacts and their media from storage
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting || isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              handleDelete()
            }}
            disabled={isDeleting || isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting || isPending ? (
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
  )
}
