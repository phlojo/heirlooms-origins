"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { getMediumUrl } from "@/lib/cloudinary"
import { AudioPlayer } from "@/components/audio-player"
import ReactMarkdown from "react-markdown"
import { ArtifactSwipeWrapper } from "@/components/artifact-swipe-wrapper"
import { ArtifactImageWithViewer } from "@/components/artifact-image-with-viewer"
import { ArtifactMediaGallery } from "@/components/artifact-media-gallery"
import { ArtifactGalleryEditor } from "@/components/artifact-gallery-editor"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible"
import { Separator } from "@/components/ui/separator"
import { AddMediaModal } from "@/components/add-media-modal"
import { MediaActionModal } from "@/components/media-action-modal"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { type ArtifactMediaWithDerivatives } from "@/lib/types/media"
import { getArtifactGalleryMedia } from "@/lib/actions/media"
import {
  ChevronDown,
  Plus,
  Save,
  X,
  Trash2,
  Loader2,
  Pencil,
  Share2,
  BarChart3,
  MessageSquare,
  BookImage,
  MoreVertical,
} from "lucide-react"
import { updateArtifact, deleteArtifact } from "@/lib/actions/artifacts"
import { permanentlyDeleteMedia } from "@/lib/actions/media"
import { cleanupPendingUploads } from "@/lib/actions/pending-uploads"
import { getMyCollections } from "@/lib/actions/collections"
import { useRouter } from "next/navigation"
import { isImageUrl, isVideoUrl, isAudioUrl } from "@/lib/media"
import { GenerateImageCaptionButton } from "@/components/artifact/GenerateImageCaptionButton"
import { GenerateVideoSummaryButton } from "@/components/artifact/GenerateVideoSummaryButton"
import { TranscribeAudioButtonPerMedia } from "@/components/artifact/TranscribeAudioButtonPerMedia"
import { TranscriptionInput } from "@/components/transcription-input"
import { useSupabase } from "@/lib/supabase/browser-context"
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { SectionTitle } from "@/components/ui/section-title"
import { HelpText } from "@/components/ui/help-text"
import { ArtifactTypeSelector } from "./artifact-type-selector"
import { ArtifactStickyNav } from "./artifact-sticky-nav"
import { getArtifactTypes } from "@/lib/actions/artifact-types"
import type { ArtifactType } from "@/lib/types/artifact-types"
import { toast } from "sonner"
import { useRef } from "react"

interface CollectionWithArtifactCount {
  id: string
  title: string
}

interface ArtifactDetailViewProps {
  artifact: any
  previous: any
  next: any
  currentPosition: number | null
  totalCount: number
  collectionHref: string
  canEdit: boolean
  isEditMode?: boolean
  previousUrl: string | null
  nextUrl: string | null
  galleryMedia?: ArtifactMediaWithDerivatives[]
  // For edit mode sticky nav
  isCurrentUserAdmin?: boolean
}

export function ArtifactDetailView({
  artifact,
  previous,
  next,
  currentPosition,
  totalCount,
  collectionHref,
  canEdit,
  isEditMode = false,
  previousUrl,
  nextUrl,
  galleryMedia,
  isCurrentUserAdmin = false,
}: ArtifactDetailViewProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [collections, setCollections] = useState<CollectionWithArtifactCount[]>([])
  const [loadingCollections, setLoadingCollections] = useState(false)
  const [artifactTypes, setArtifactTypes] = useState<ArtifactType[]>([])
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(artifact.type_id || null)
  const shouldWarnOnUnloadRef = useRef(true)
  const [currentGalleryMedia, setCurrentGalleryMedia] = useState<ArtifactMediaWithDerivatives[]>(
    galleryMedia || []
  )

  const [isImageFullscreen, setIsImageFullscreen] = useState(false)
  const [isAttributesOpen, setIsAttributesOpen] = useState(false)
  const [isProvenanceOpen, setIsProvenanceOpen] = useState(false)
  const [isAddMediaOpen, setIsAddMediaOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [mediaActionModalOpen, setMediaActionModalOpen] = useState(false)
  const [mediaToAction, setMediaToAction] = useState<string | null>(null)
  const [comingSoonOpen, setComingSoonOpen] = useState(false)
  const [comingSoonFeature, setComingSoonFeature] = useState("")

  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)

  const [originalState] = useState({
    title: artifact.title,
    description: artifact.description || "",
    media_urls: artifact.media_urls || [],
    image_captions: artifact.image_captions || {},
    video_summaries: artifact.video_summaries || {},
    audio_transcripts: artifact.audio_transcripts || {},
    thumbnail_url: artifact.thumbnail_url || "",
    collection_id: artifact.collection_id,
    type_id: artifact.type_id || null,
  })

  const [editTitle, setEditTitle] = useState(artifact.title)
  const [editDescription, setEditDescription] = useState(artifact.description || "")
  const [editMediaUrls, setEditMediaUrls] = useState<string[]>(artifact.media_urls || [])
  const [editImageCaptions, setEditImageCaptions] = useState<Record<string, string>>(artifact.image_captions || {})
  const [editVideoSummaries, setEditVideoSummaries] = useState<Record<string, string>>(artifact.video_summaries || {})
  const [editAudioTranscripts, setEditAudioTranscripts] = useState<Record<string, string>>(artifact.audio_transcripts || {})
  const [editThumbnailUrl, setEditThumbnailUrl] = useState<string>(artifact.thumbnail_url || "")
  const [editCollectionId, setEditCollectionId] = useState<string>(artifact.collection_id)
  // Track URLs uploaded during this edit session (for cleanup on cancel)
  const [pendingUploadUrls, setPendingUploadUrls] = useState<string[]>([])

  const router = useRouter()
  const supabase = useSupabase()
  const [userId, setUserId] = useState<string>("")
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id)
        // Query profile for the specific authenticated user
        supabase
          .from("profiles")
          .select("is_admin")
          .eq("id", user.id)
          .single()
          .then(({ data: profileData }) => {
            setIsAdmin(profileData?.is_admin || false)
          })
      }
    })
  }, [supabase])

  useEffect(() => {
    if (isEditMode && userId) {
      console.log("[v0] Fetching collections for userId:", userId)
      console.log("[v0] Current artifact collection_id:", artifact.collection_id)
      setLoadingCollections(true)
      getMyCollections(userId)
        .then((result) => {
          console.log("[v0] Collections fetched:", result)
          if (result.collections) {
            setCollections(result.collections)
            // If editCollectionId is not yet set or empty, set it to the artifact's current collection
            if (!editCollectionId || editCollectionId === "") {
              setEditCollectionId(artifact.collection_id)
            }
          }
        })
        .finally(() => {
          setLoadingCollections(false)
        })

      getArtifactTypes().then((types) => {
        setArtifactTypes(types)
      })
    }
  }, [isEditMode, userId])

  const totalMedia = editMediaUrls.length
  const audioFiles = editMediaUrls.filter((url) => isAudioUrl(url)).length
  const videoFiles = editMediaUrls.filter((url) => isVideoUrl(url)).length
  const imageFiles = totalMedia - audioFiles - videoFiles

  const imageCaptions = isEditMode ? editImageCaptions : artifact.image_captions || {}
  const videoSummaries = isEditMode ? editVideoSummaries : artifact.video_summaries || {}
  const audioTranscripts = isEditMode ? editAudioTranscripts : artifact.audio_transcripts || {}
  const allMediaUrls: string[] = isEditMode ? Array.from(new Set(editMediaUrls)) : Array.from(new Set(artifact.media_urls || []))

  // Gallery URLs (used to check if media is in gallery for delete warnings)
  const galleryUrls = new Set(currentGalleryMedia.map(gm => gm.media.public_url))

  // Media blocks show ALL media URLs - same media can be in both gallery and blocks
  const mediaUrls: string[] = allMediaUrls

  /**
   * Get the next available thumbnail from all visual media (gallery + media blocks)
   * Priority: gallery items first (in order), then media blocks
   * Only considers images and videos
   */
  const getNextAvailableThumbnail = (excludeUrl?: string): string => {
    // Get gallery visual URLs (in gallery order)
    const galleryVisualUrls = currentGalleryMedia
      .map(gm => gm.media.public_url)
      .filter(url => url !== excludeUrl && (isImageUrl(url) || isVideoUrl(url)))

    // Get media block visual URLs not already in gallery
    const blockVisualUrls = allMediaUrls
      .filter(url => url !== excludeUrl && !galleryUrls.has(url) && (isImageUrl(url) || isVideoUrl(url)))

    // Combined: gallery first, then unique block items
    const allVisualUrls = [...galleryVisualUrls, ...blockVisualUrls]

    return allVisualUrls[0] || ""
  }

  const audioUrlsFiltered: string[] = mediaUrls.filter(isAudioUrl)
  const videoUrlsFiltered: string[] = mediaUrls.filter(isVideoUrl)
  const imageUrlsFiltered: string[] = mediaUrls.filter((url) => isImageUrl(url))

  const hasUnsavedChanges =
    isEditMode &&
    (editTitle !== originalState.title ||
      editDescription !== originalState.description ||
      JSON.stringify(editMediaUrls) !== JSON.stringify(originalState.media_urls) ||
      JSON.stringify(editImageCaptions) !== JSON.stringify(originalState.image_captions) ||
      JSON.stringify(editVideoSummaries) !== JSON.stringify(originalState.video_summaries) ||
      JSON.stringify(editAudioTranscripts) !== JSON.stringify(originalState.audio_transcripts) ||
      editThumbnailUrl !== originalState.thumbnail_url ||
      selectedTypeId !== originalState.type_id ||
      editCollectionId !== originalState.collection_id)

  useEffect(() => {
    if (!isEditMode || !hasUnsavedChanges) {
      shouldWarnOnUnloadRef.current = false
      return
    }

    shouldWarnOnUnloadRef.current = true

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!shouldWarnOnUnloadRef.current) return
      e.preventDefault()
      e.returnValue = ""
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [isEditMode, hasUnsavedChanges])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const result = await updateArtifact(
        {
          id: artifact.id,
          title: editTitle,
          description: editDescription,
          media_urls: editMediaUrls,
          image_captions: editImageCaptions,
          video_summaries: editVideoSummaries,
          audio_transcripts: editAudioTranscripts,
          thumbnail_url: editThumbnailUrl || null,
          collectionId: editCollectionId,
          type_id: selectedTypeId,
        },
        originalState.media_urls,
      )
      toast.success("Artifact updated successfully")
      // Disable beforeunload warning before redirecting
      shouldWarnOnUnloadRef.current = false
      // Use the returned slug from server in case it changed
      const slug = result.slug || artifact.slug
      window.location.href = `/artifacts/${slug}`
    } catch (error) {
      console.error("[v0] Error saving artifact:", error)
      toast.error("Failed to save changes")
      setIsSaving(false)
    }
  }

  const handleMediaAction = (urlToAction: string) => {
    setMediaToAction(urlToAction)
    setMediaActionModalOpen(true)
  }

  const handleRemoveMedia = () => {
    if (!mediaToAction) return

    // In edit mode, just remove from local state (changes applied on save)
    setEditMediaUrls((prev) => prev.filter((url) => url !== mediaToAction))
    setEditImageCaptions((prev) => {
      const updated = { ...prev }
      delete updated[mediaToAction]
      return updated
    })
    setEditVideoSummaries((prev) => {
      const updated = { ...prev }
      delete updated[mediaToAction]
      return updated
    })
    setEditAudioTranscripts((prev) => {
      const updated = { ...prev }
      delete updated[mediaToAction]
      return updated
    })

    // Auto-select new thumbnail if current thumbnail was removed
    // Consider both gallery and media blocks for next available
    if (editThumbnailUrl === mediaToAction) {
      const newThumbnail = getNextAvailableThumbnail(mediaToAction)
      setEditThumbnailUrl(newThumbnail)
    }

    toast.success("Media removed from artifact")
    setMediaToAction(null)
  }

  const handlePermanentlyDeleteMedia = async () => {
    if (!mediaToAction) return

    // Remove from local state
    setEditMediaUrls((prev) => prev.filter((url) => url !== mediaToAction))
    setEditImageCaptions((prev) => {
      const updated = { ...prev }
      delete updated[mediaToAction]
      return updated
    })
    setEditVideoSummaries((prev) => {
      const updated = { ...prev }
      delete updated[mediaToAction]
      return updated
    })
    setEditAudioTranscripts((prev) => {
      const updated = { ...prev }
      delete updated[mediaToAction]
      return updated
    })

    // Also remove from gallery display if present
    setCurrentGalleryMedia((prev) => prev.filter(gm => gm.media.public_url !== mediaToAction))

    // Auto-select new thumbnail if current thumbnail was deleted
    // Consider both gallery and media blocks for next available
    if (editThumbnailUrl === mediaToAction) {
      const newThumbnail = getNextAvailableThumbnail(mediaToAction)
      setEditThumbnailUrl(newThumbnail)
    }

    // Permanently delete from storage
    const result = await permanentlyDeleteMedia(mediaToAction)
    if (result.error) {
      toast.error("Failed to delete media from storage")
    } else {
      toast.success("Media permanently deleted")
    }

    setMediaToAction(null)
  }

  const handleDeleteArtifact = async () => {
    setIsDeleting(true)
    try {
      const result = await deleteArtifact(artifact.id)
      if (result.success) {
        // Disable beforeunload warning before redirecting
        shouldWarnOnUnloadRef.current = false
        // Use hard navigation to prevent the page from trying to re-fetch deleted artifact
        window.location.href = collectionHref
      } else {
        alert(result.error || "Failed to delete artifact")
        setIsDeleting(false)
        setDeleteDialogOpen(false)
      }
    } catch (error) {
      console.error("[v0] Failed to delete artifact:", error)
      alert("Failed to delete artifact. Please try again.")
      setIsDeleting(false)
      setDeleteDialogOpen(false)
    }
  }

  const handleMediaAdded = async (newUrls: string[]) => {
    if (isEditMode) {
      const combinedUrls = [...editMediaUrls, ...newUrls]
      const uniqueUrls = Array.from(new Set(combinedUrls))
      setEditMediaUrls(uniqueUrls)

      // Track newly uploaded URLs for cleanup on cancel
      // Only track URLs that are actually new (not already in original artifact)
      const originalUrls = artifact.media_urls || []
      const trulyNewUrls = newUrls.filter(url => !originalUrls.includes(url))
      if (trulyNewUrls.length > 0) {
        setPendingUploadUrls(prev => [...prev, ...trulyNewUrls])
      }

      if (!editThumbnailUrl && newUrls.length > 0) {
        const firstVisual = newUrls.find((url) => isImageUrl(url) || isVideoUrl(url))
        if (firstVisual) {
          setEditThumbnailUrl(firstVisual)
        }
      }
    } else {
      try {
        const currentUrls = artifact.media_urls || []
        const combinedUrls = [...currentUrls, ...newUrls]
        const uniqueUrls = Array.from(new Set(combinedUrls))

        await updateArtifact(
          {
            id: artifact.id,
            title: artifact.title,
            description: artifact.description,
            media_urls: uniqueUrls,
          },
          artifact.slug,
        )

        router.refresh()
      } catch (error) {
        console.error("[v0] Failed to add media:", error)
      }
    }
  }

  const handleComingSoon = (feature: string) => {
    setComingSoonFeature(feature)
    setComingSoonOpen(true)
  }

  const handleCancel = () => {
    if (hasUnsavedChanges) {
      setCancelDialogOpen(true)
    } else {
      // Disable beforeunload warning before redirecting
      shouldWarnOnUnloadRef.current = false
      window.location.href = `/artifacts/${artifact.slug}`
    }
  }

  const handleSelectThumbnail = (url: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    e?.preventDefault()
    setEditThumbnailUrl(url)
  }

  const confirmCancel = async () => {
    setCancelDialogOpen(false)
    setSelectedTypeId(originalState.type_id)

    // Clean up any newly uploaded media that wasn't saved
    if (pendingUploadUrls.length > 0) {
      console.log("[v0] CANCEL EDIT - Cleaning up", pendingUploadUrls.length, "pending uploads")
      await cleanupPendingUploads(pendingUploadUrls)
    }

    // Disable beforeunload warning before redirecting
    shouldWarnOnUnloadRef.current = false
    window.location.href = `/artifacts/${artifact.slug}`
  }

  const handleCaptionGenerated = (url: string, newCaption: string) => {
    if (isEditMode) {
      setEditImageCaptions((prev) => ({
        ...prev,
        [url]: newCaption,
      }))
    }
  }

  const handleSummaryGenerated = (url: string, newSummary: string) => {
    if (isEditMode) {
      setEditVideoSummaries((prev) => ({
        ...prev,
        [url]: newSummary,
      }))
    }
  }

  const handleTranscriptGenerated = (url: string, newTranscript: string) => {
    if (isEditMode) {
      setEditAudioTranscripts((prev) => ({
        ...prev,
        [url]: newTranscript,
      }))
    }
  }

  const handleTypeChange = (typeId: string | null) => {
    setSelectedTypeId(typeId)
  }

  const handleGalleryUpdate = async () => {
    // Refetch gallery media after changes
    const { data } = await getArtifactGalleryMedia(artifact.id)
    if (data) {
      setCurrentGalleryMedia(data)
    }
  }

  return (
    <ArtifactSwipeWrapper
      previousUrl={isEditMode ? null : previousUrl}
      nextUrl={isEditMode ? null : nextUrl}
      disableSwipe={isImageFullscreen || isEditMode}
    >
      {/* Edit mode sticky nav with title input */}
      {isEditMode && (
        <ArtifactStickyNav
          title={artifact.title}
          backHref={undefined}
          backLabel={`${artifact.collection?.title || "Uncategorized"} Collection`}
          previousItem={null}
          nextItem={null}
          isEditMode={true}
          collectionId={artifact.collection_id}
          collectionSlug={artifact.collection?.slug}
          collectionName={artifact.collection?.title}
          currentPosition={currentPosition ?? undefined}
          totalCount={totalCount}
          currentUserId={userId}
          isCurrentUserAdmin={isCurrentUserAdmin}
          contentOwnerId={artifact.user_id}
          editTitle={editTitle}
          onEditTitleChange={setEditTitle}
          userId={userId}
        />
      )}
      <div className={`overflow-x-hidden pb-[240px]`}>
        {!isEditMode && canEdit && (
          <div className="flex items-center justify-between gap-3 pt-4 mb-4">
            <Button asChild className="bg-purple-600 hover:bg-purple-700 text-white">
              <Link href={`/artifacts/${artifact.slug}?mode=edit`}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit Artifact
              </Link>
            </Button>

            <div className="flex items-center gap-2">
              <Button onClick={() => handleComingSoon("Share")} variant="outline" size="icon" className="rounded-lg">
                <Share2 className="h-4 w-4" />
              </Button>
              <Button
                onClick={() => handleComingSoon("Analytics")}
                variant="outline"
                size="icon"
                className="rounded-lg"
              >
                <BarChart3 className="h-4 w-4" />
              </Button>
              <Button onClick={() => handleComingSoon("Comments")} variant="outline" size="icon" className="rounded-lg">
                <MessageSquare className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Gallery Editor/Viewer */}
        {isEditMode ? (
          <ArtifactGalleryEditor
            artifactId={artifact.id}
            userId={userId}
            galleryMedia={currentGalleryMedia}
            onUpdate={handleGalleryUpdate}
            currentThumbnailUrl={editThumbnailUrl}
            onSelectThumbnail={handleSelectThumbnail}
          />
        ) : (
          currentGalleryMedia && currentGalleryMedia.length > 0 && (
            <ArtifactMediaGallery media={currentGalleryMedia} />
          )
        )}

        {/* Description Section */}
        {(isEditMode || artifact.description || artifact.ai_description) && (
          <section className="space-y-4 py-4">
            {isEditMode && <SectionTitle>Description</SectionTitle>}
            {isEditMode ? (
              <TranscriptionInput
                value={editDescription}
                onChange={setEditDescription}
                placeholder="Tell the story of this artifact..."
                type="textarea"
                fieldType="description"
                userId={userId}
                entityType="artifact"
                rows={4}
              />
            ) : (
              <div className="text-pretty text-muted-foreground prose prose-sm max-w-none dark:prose-invert">
                {artifact.description && (
                  <ReactMarkdown>{artifact.description}</ReactMarkdown>
                )}
                {artifact.ai_description && (
                  <div className={artifact.description ? "mt-4 pt-4 border-t" : ""}>
                    <p className="text-xs font-semibold text-purple-600 mb-2">AI-Enhanced Description</p>
                    <ReactMarkdown>{artifact.ai_description}</ReactMarkdown>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {isEditMode && (
          <section className="space-y-2">
            <SectionTitle as="label" htmlFor="collection">Collection</SectionTitle>
            <Select
              value={editCollectionId}
              onValueChange={setEditCollectionId}
              disabled={isSaving || loadingCollections}
            >
              <SelectTrigger id="collection" className="w-full text-base md:text-sm">
                <SelectValue placeholder="Select a collection..." />
              </SelectTrigger>
              <SelectContent className="text-base md:text-sm">
                {collections.map((collection) => (
                  <SelectItem key={collection.id} value={collection.id} className="text-base md:text-sm">
                    {collection.title}
                  </SelectItem>
                ))}
                {collections.length === 0 && !loadingCollections && (
                  <SelectItem value="no-collections" disabled className="text-base md:text-sm">
                    No collections found
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            <HelpText>Move this artifact to a different collection</HelpText>
          </section>
        )}

        {isEditMode && artifactTypes.length > 0 && <div className="pt-4" />}
        {isEditMode && artifactTypes.length > 0 && (
          <ArtifactTypeSelector
            types={artifactTypes}
            selectedTypeId={selectedTypeId}
            onSelectType={handleTypeChange}
            required={false}
            defaultOpen={false}
            storageKey="artifactTypeSelector_edit_open"
          />
        )}

        {isEditMode && artifactTypes.length > 0 && <div className="pt-4" />}

        {/* Attributes Section - Only show in edit mode until attributes are implemented */}
        {isEditMode && (
          <section className="mb-0">
            <Collapsible open={isAttributesOpen} onOpenChange={setIsAttributesOpen}>
              <div className="rounded-md border border-input bg-transparent dark:bg-input/30 shadow-xs">
                <CollapsibleTrigger className="flex w-full items-center justify-between px-3 py-2 hover:opacity-80 transition-opacity">
                  <SectionTitle className="pl-0">Attributes</SectionTitle>
                  <ChevronDown
                    className={`h-4 w-4 text-muted-foreground opacity-50 transition-transform ${isAttributesOpen ? "rotate-180" : ""}`}
                  />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="px-3 pb-3">
                    <p className="text-sm text-muted-foreground italic">
                      No attributes added yet. Future updates will include fields for make, model, year, measurements,
                      materials, and condition.
                    </p>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          </section>
        )}

        <Separator className="my-4" />

        {/* Media Blocks Section */}
        <section className="space-y-6 mb-6 overflow-x-hidden">
          {isEditMode && (
            <div className="flex items-center justify-between">
              <div>
                <SectionTitle>Media Blocks</SectionTitle>
                <HelpText className="mt-0.5">
                  Click "Save" at the bottom to persist changes
                </HelpText>
              </div>
              {canEdit && (
                <Button
                  onClick={() => setIsAddMediaOpen(true)}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                  size="sm"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Media
                </Button>
              )}
            </div>
          )}

        {mediaUrls.length > 0 ? (
          <div className="space-y-6">
            {mediaUrls.map((url) => {
              if (isAudioUrl(url)) {
                const transcript = audioTranscripts[url]
                return (
                  <div key={url} className="space-y-3">
                    {isEditMode && (
                      <div className="flex items-center justify-between">
                        <SectionTitle as="h3">
                          Audio{audioUrlsFiltered.length > 1 ? ` ${audioUrlsFiltered.indexOf(url) + 1}` : ""}
                        </SectionTitle>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMediaAction(url)}
                          className="text-muted-foreground hover:text-foreground"
                          title="Media options"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                    <div className="space-y-3">
                      <AudioPlayer src={url} title="Audio Recording" />

                      {isEditMode && (
                        <div className="mt-3">
                          <TranscribeAudioButtonPerMedia
                            artifactId={artifact.id}
                            audioUrl={url}
                            onTranscriptGenerated={handleTranscriptGenerated}
                            currentTranscript={transcript}
                          />
                        </div>
                      )}

                      {transcript && (
                        <div className="rounded-lg border bg-muted/30 p-4 mt-3">
                          <h4 className="text-sm font-semibold mb-2">Transcript</h4>
                          <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap italic">
                            {transcript}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              } else if (isVideoUrl(url)) {
                const summary = videoSummaries[url]
                const isSelectedThumbnail = isEditMode && editThumbnailUrl === url
                return (
                  <div key={url} className="space-y-3">
                    {isEditMode && (
                      <div className="flex items-center justify-between">
                        <SectionTitle as="h3">
                          Video{videoUrlsFiltered.length > 1 ? ` ${videoUrlsFiltered.indexOf(url) + 1}` : ""}
                        </SectionTitle>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={(e) => handleSelectThumbnail(url, e)}
                            className={
                              isSelectedThumbnail ? "text-yellow-500" : "text-muted-foreground hover:text-yellow-500"
                            }
                            title="Set as thumbnail"
                          >
                            <BookImage className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMediaAction(url)}
                            className="text-muted-foreground hover:text-foreground"
                            title="Media options"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                    <div className="w-full max-w-full overflow-hidden overflow-x-hidden">
                      <video src={url} controls className="w-full max-w-full h-auto rounded shadow-md" style={{ maxHeight: "70vh" }}>
                        Your browser does not support the video tag.
                      </video>
                    </div>
                    <div className="space-y-3">
                      {isEditMode ? (
                        <>
                          <div className="space-y-2">
                            <SectionTitle as="label" variant="purple">Caption</SectionTitle>
                            <TranscriptionInput
                              value={summary || ""}
                              onChange={(newSummary) => {
                                setEditVideoSummaries((prev) => ({
                                  ...prev,
                                  [url]: newSummary,
                                }))
                              }}
                              placeholder="Add a caption for this video..."
                              type="textarea"
                              fieldType="description"
                              userId={userId}
                              entityType="artifact"
                              rows={3}
                              className="text-base md:text-sm italic"
                            />
                          </div>
                          <GenerateVideoSummaryButton
                            artifactId={artifact.id}
                            videoUrl={url}
                            onSummaryGenerated={handleSummaryGenerated}
                            currentSummary={summary}
                          />
                        </>
                      ) : (
                        summary && (
                          <div className="rounded-lg border bg-muted/30 p-3">
                            <p className="text-sm text-foreground leading-relaxed italic">{summary}</p>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )
              } else {
                const caption = imageCaptions[url]
                const isSelectedThumbnail = isEditMode && editThumbnailUrl === url
                return (
                  <div key={url} className="space-y-3">
                    {isEditMode && (
                      <div className="flex items-center justify-between">
                        <SectionTitle as="h3">
                          Photo{imageUrlsFiltered.length > 1 ? ` ${imageUrlsFiltered.indexOf(url) + 1}` : ""}
                        </SectionTitle>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={(e) => handleSelectThumbnail(url, e)}
                            className={
                              isSelectedThumbnail ? "text-yellow-500" : "text-muted-foreground hover:text-yellow-500"
                            }
                            title="Set as thumbnail"
                          >
                            <BookImage className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMediaAction(url)}
                            className="text-muted-foreground hover:text-foreground"
                            title="Media options"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                    <ArtifactImageWithViewer
                      src={getMediumUrl(url, artifact.media_derivatives) || "/placeholder.svg"}
                      alt={`${artifact.title} - Image ${imageUrlsFiltered.indexOf(url) + 1}`}
                      setIsImageFullscreen={setIsImageFullscreen}
                    />
                    <div className="space-y-3">
                      {isEditMode ? (
                        <>
                          <div className="space-y-2">
                            <SectionTitle as="label" variant="purple">Caption</SectionTitle>
                            <TranscriptionInput
                              value={caption || ""}
                              onChange={(newCaption) => {
                                setEditImageCaptions((prev) => ({
                                  ...prev,
                                  [url]: newCaption,
                                }))
                              }}
                              placeholder="Add a caption for this image..."
                              type="textarea"
                              fieldType="description"
                              userId={userId}
                              entityType="artifact"
                              rows={3}
                              className="text-base md:text-sm italic"
                            />
                          </div>
                          <GenerateImageCaptionButton
                            artifactId={artifact.id}
                            imageUrl={url}
                            onCaptionGenerated={handleCaptionGenerated}
                            currentCaption={caption}
                          />
                        </>
                      ) : (
                        caption && (
                          <div className="rounded-lg border bg-muted/30 p-3">
                            <p className="text-sm text-foreground leading-relaxed italic">{caption}</p>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )
              }
            })}
          </div>
        ) : (
          <div className="min-h-[200px] rounded-lg border bg-muted/30 flex items-center justify-center mx-6 lg:px-8">
            <p className="text-sm text-muted-foreground">No media available</p>
          </div>
        )}
        </section>

        {/* Provenance Section */}
        <section className="pb-8">
          <Collapsible open={isProvenanceOpen} onOpenChange={setIsProvenanceOpen}>
            <div className="rounded-md border border-input bg-transparent dark:bg-input/30 shadow-xs">
              <CollapsibleTrigger className="flex w-full items-center justify-between px-3 py-2 hover:opacity-80 transition-opacity">
                <SectionTitle className="pl-0">Provenance</SectionTitle>
                <ChevronDown
                  className={`h-4 w-4 text-muted-foreground opacity-50 transition-transform ${isProvenanceOpen ? "rotate-180" : ""}`}
                />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-3 pb-3">
                  <dl className="space-y-3 text-sm">
                    {artifact.author_name && (
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Author</dt>
                        <dd className="font-medium">{artifact.author_name}</dd>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Collection</dt>
                      <dd className="font-medium">
                        <Link href={collectionHref} className="text-primary hover:underline">
                          {artifact.collection?.title || "Unknown"}
                        </Link>
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Created</dt>
                      <dd className="font-medium">{new Date(artifact.created_at).toLocaleDateString()}</dd>
                    </div>
                    {artifact.updated_at && artifact.updated_at !== artifact.created_at && (
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Last Modified</dt>
                        <dd className="font-medium">{new Date(artifact.updated_at).toLocaleDateString()}</dd>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Total Media Items</dt>
                      <dd className="font-medium">
                        {totalMedia} {totalMedia === 1 ? "file" : "files"}
                      </dd>
                    </div>
                    {imageFiles > 0 && (
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Photos</dt>
                        <dd className="font-medium">{imageFiles}</dd>
                      </div>
                    )}
                    {videoFiles > 0 && (
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Videos</dt>
                        <dd className="font-medium">{videoFiles}</dd>
                      </div>
                    )}
                    {audioFiles > 0 && (
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Audio Recordings</dt>
                        <dd className="font-medium">{audioFiles}</dd>
                      </div>
                    )}
                    {artifact.transcript && (
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">AI Transcription</dt>
                        <dd className="font-medium text-green-600">Available</dd>
                      </div>
                    )}
                    {artifact.ai_description && (
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">AI Description</dt>
                        <dd className="font-medium text-green-600">Generated</dd>
                      </div>
                    )}
                    {imageCaptions && Object.keys(imageCaptions).length > 0 && (
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">AI Image Captions</dt>
                        <dd className="font-medium text-green-600">{Object.keys(imageCaptions).length}</dd>
                      </div>
                    )}
                    {videoSummaries && Object.keys(videoSummaries).length > 0 && (
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">AI Video Summaries</dt>
                        <dd className="font-medium text-green-600">{Object.keys(videoSummaries).length}</dd>
                      </div>
                    )}
                  </dl>
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        </section>

        {isEditMode && canEdit && (
          <section className="border-t pt-6 pb-8">
            <div className="space-y-4">
              <div>
                <SectionTitle as="h3" variant="destructive">Danger Zone</SectionTitle>
                <HelpText className="mt-1">
                  Permanently delete this artifact. This action cannot be undone and all media will be lost.
                </HelpText>
              </div>

              <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" type="button" disabled={isDeleting}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Artifact
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Artifact</AlertDialogTitle>
                    <AlertDialogDescription className="space-y-3">
                      <span className="block">
                        You are about to permanently delete <strong>"{artifact.title}"</strong>.
                      </span>
                      <span className="block text-destructive font-medium">
                        All media files ({totalMedia} {totalMedia === 1 ? "file" : "files"}) will be permanently deleted
                        from storage.
                      </span>
                      <span className="block text-xs text-muted-foreground">This action cannot be undone.</span>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={(e) => {
                        e.preventDefault()
                        handleDeleteArtifact()
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
            </div>
          </section>
        )}
      </div>

      {isEditMode && canEdit && (
        <AddMediaModal
          open={isAddMediaOpen}
          onOpenChange={setIsAddMediaOpen}
          artifactId={artifact.id}
          userId={artifact.user_id}
          onMediaAdded={handleMediaAdded}
        />
      )}

      {/* Coming Soon Dialog */}
      <Dialog open={comingSoonOpen} onOpenChange={setComingSoonOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{comingSoonFeature}</DialogTitle>
            <DialogDescription>
              This feature is coming soon! We're working hard to bring you the ability to{" "}
              {comingSoonFeature.toLowerCase()} your artifacts.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      {/* Media Action Modal (Remove/Delete) */}
      <MediaActionModal
        open={mediaActionModalOpen}
        onOpenChange={setMediaActionModalOpen}
        mediaUrl={mediaToAction}
        onRemove={handleRemoveMedia}
        onDelete={handlePermanentlyDeleteMedia}
      />

      {/* Save Module */}
      {isEditMode && canEdit && (
        <div className="fixed bottom-[calc(120px+env(safe-area-inset-bottom))] left-0 right-0 flex justify-center pointer-events-none z-40">
          <div className="pointer-events-auto bg-card/95 backdrop-blur-sm border rounded-3xl shadow-lg p-4 mx-4 w-auto">
            <div className="flex items-center gap-3">
              <Button onClick={handleSave} disabled={isSaving} className="bg-green-600 hover:bg-green-700 text-white">
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
              <Button onClick={handleCancel} variant="outline" disabled={isSaving}>
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard Changes?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. If you cancel now, all changes will be lost. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Editing</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmCancel}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Discard Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ArtifactSwipeWrapper>
  )
}

// Removed the redundant isAudioFile, isVideoFile, isImageUrl, isVideoUrl functions
// as they are now imported from "@/lib/media" and replaced with isAudioUrl, isVideoUrl, isImageUrl respectively
