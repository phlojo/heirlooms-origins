"use client"

import { useState } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { X, Trash2, Loader2 } from "lucide-react"

interface DeleteArtifactModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  artifactTitle: string
  mediaCount: number
  onDelete: (deleteMedia: boolean) => Promise<void>
  isDeleting: boolean
}

/**
 * Modal for artifact deletion - allows user to choose between:
 * - Remove: Delete artifact but keep media in library for reuse
 * - Delete: Delete artifact and permanently delete all media
 */
export function DeleteArtifactModal({
  open,
  onOpenChange,
  artifactTitle,
  mediaCount,
  onDelete,
  isDeleting,
}: DeleteArtifactModalProps) {
  const [selectedOption, setSelectedOption] = useState<"keep" | "delete">("keep")

  const handleConfirm = async () => {
    await onDelete(selectedOption === "delete")
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Artifact</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                You are about to delete <strong>"{artifactTitle}"</strong>.
              </p>

              {mediaCount > 0 && (
                <>
                  <p className="text-sm">
                    What would you like to do with the {mediaCount} media {mediaCount === 1 ? "file" : "files"}?
                  </p>

                  <div className="space-y-2 pt-2">
                    <Button
                      variant="outline"
                      className={`w-full justify-start h-auto py-3 px-4 ${
                        selectedOption === "keep" ? "ring-2 ring-primary border-primary" : ""
                      }`}
                      onClick={() => setSelectedOption("keep")}
                      disabled={isDeleting}
                    >
                      <X className="h-4 w-4 mr-3 shrink-0" />
                      <div className="text-left min-w-0">
                        <div className="font-medium">Keep media in library</div>
                        <div className="text-xs text-muted-foreground font-normal whitespace-normal">
                          Delete artifact but keep media files for use in other artifacts
                        </div>
                      </div>
                    </Button>

                    <Button
                      variant="outline"
                      className={`w-full justify-start h-auto py-3 px-4 border-destructive/50 hover:bg-destructive/10 ${
                        selectedOption === "delete" ? "ring-2 ring-destructive border-destructive" : ""
                      }`}
                      onClick={() => setSelectedOption("delete")}
                      disabled={isDeleting}
                    >
                      <Trash2 className="h-4 w-4 mr-3 shrink-0 text-destructive" />
                      <div className="text-left min-w-0">
                        <div className="font-medium text-destructive">Delete media permanently</div>
                        <div className="text-xs text-muted-foreground font-normal whitespace-normal">
                          Delete artifact and permanently remove all media from storage
                        </div>
                      </div>
                    </Button>
                  </div>
                </>
              )}

              <p className="text-xs text-muted-foreground pt-2">
                {selectedOption === "delete" && mediaCount > 0
                  ? "This will permanently delete all media files. This action cannot be undone."
                  : "This action cannot be undone."}
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              handleConfirm()
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
              "Delete Artifact"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
