"use client"

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
import { X, Trash2 } from "lucide-react"

interface MediaActionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mediaUrl: string | null
  onRemove: () => void
  onDelete: () => void
}

/**
 * Modal for media block actions - allows user to choose between:
 * - Remove: Just removes from this artifact's media blocks (media stays in library)
 * - Delete: Permanently deletes from storage (removes from ALL artifacts)
 */
export function MediaActionModal({
  open,
  onOpenChange,
  mediaUrl,
  onRemove,
  onDelete,
}: MediaActionModalProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>What would you like to do?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>Choose how to handle this media:</p>

              <div className="space-y-2 pt-2">
                <Button
                  variant="outline"
                  className="w-full justify-start h-auto py-3 px-4"
                  onClick={() => {
                    onRemove()
                    onOpenChange(false)
                  }}
                >
                  <X className="h-4 w-4 mr-3 shrink-0" />
                  <div className="text-left min-w-0">
                    <div className="font-medium">Remove from artifact</div>
                    <div className="text-xs text-muted-foreground font-normal whitespace-normal">
                      Media stays in your library for use elsewhere
                    </div>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  className="w-full justify-start h-auto py-3 px-4 border-destructive/50 hover:bg-destructive/10"
                  onClick={() => {
                    onDelete()
                    onOpenChange(false)
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-3 shrink-0 text-destructive" />
                  <div className="text-left min-w-0">
                    <div className="font-medium text-destructive">Delete permanently</div>
                    <div className="text-xs text-muted-foreground font-normal whitespace-normal">
                      Deletes from storage and removes from all artifacts across all collections
                    </div>
                  </div>
                </Button>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
