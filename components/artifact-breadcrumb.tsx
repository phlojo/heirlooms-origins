"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { LayoutGrid, ChevronRight } from "lucide-react"
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

interface ArtifactBreadcrumbProps {
  collectionId?: string
  collectionSlug?: string
  collectionName?: string
  /** Whether user is logged in (affects label and destination) */
  isLoggedIn?: boolean
  /** Whether in edit mode (shows confirmation dialog) */
  isEditMode?: boolean
  /** Whether there are unsaved changes (for edit mode warning) */
  hasUnsavedChanges?: boolean
  /** Callback to clean up pending uploads on cancel */
  onAbandonChanges?: () => Promise<void>
}

export function ArtifactBreadcrumb({
  collectionId,
  collectionSlug,
  collectionName,
  isLoggedIn = false,
  isEditMode = false,
  hasUnsavedChanges = false,
  onAbandonChanges,
}: ArtifactBreadcrumbProps) {
  const router = useRouter()
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null)

  // Logged in: "My Collections" -> /collections?tab=mine
  // Not logged in: "Collections" -> /collections?tab=all
  const collectionsLabel = isLoggedIn ? "My Collections" : "Collections"
  const collectionsHref = isLoggedIn ? "/collections?tab=mine" : "/collections?tab=all"

  // Collection route is /collections/[slug] - use slug if available, fall back to ID
  const collectionHref = collectionSlug
    ? `/collections/${collectionSlug}`
    : collectionId
      ? `/collections/${collectionId}`
      : null

  const handleNavigationClick = (e: React.MouseEvent, href: string) => {
    if (!isEditMode) {
      // Normal navigation, let Link handle it
      return
    }

    // In edit mode, intercept the click
    e.preventDefault()

    if (hasUnsavedChanges) {
      // Show confirmation dialog
      setPendingNavigation(href)
      setShowConfirmDialog(true)
    } else {
      // No unsaved changes, navigate directly
      router.push(href)
    }
  }

  const handleConfirmNavigation = async () => {
    if (onAbandonChanges) {
      await onAbandonChanges()
    }
    setShowConfirmDialog(false)
    if (pendingNavigation) {
      window.location.href = pendingNavigation
    }
  }

  const handleCancelNavigation = () => {
    setShowConfirmDialog(false)
    setPendingNavigation(null)
  }

  return (
    <>
      <nav className="flex items-center gap-1 text-xs" aria-label="Breadcrumb">
        {/* Collections pill */}
        <Link
          href={collectionsHref}
          onClick={(e) => handleNavigationClick(e, collectionsHref)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
        >
          <LayoutGrid className="h-3.5 w-3.5" />
          <span>{collectionsLabel}</span>
        </Link>

        {/* Separator */}
        {collectionName && (
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
        )}

        {/* Current Collection pill */}
        {collectionName && collectionHref && (
          <Link
            href={collectionHref}
            onClick={(e) => handleNavigationClick(e, collectionHref)}
            className="px-2.5 py-1 rounded-full bg-muted hover:bg-accent text-muted-foreground hover:text-foreground transition-colors truncate max-w-[200px]"
            title={collectionName}
          >
            {collectionName}
          </Link>
        )}

        {/* Collection name without link (when no href) */}
        {collectionName && !collectionHref && (
          <span
            className="px-2.5 py-1 rounded-full bg-muted text-muted-foreground truncate max-w-[200px]"
            title={collectionName}
          >
            {collectionName}
          </span>
        )}
      </nav>

      {/* Unsaved changes confirmation dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. If you leave now, your changes will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelNavigation}>
              Stay and keep editing
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmNavigation}>
              Leave without saving
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
