"use client"

import { useState, useEffect } from "react"
import { getUserMediaLibrary } from "@/lib/actions/media"
import { type UserMediaWithDerivatives } from "@/lib/types/media"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2, Search, Check, Image as ImageIcon, Video, Music } from "lucide-react"
import { cn } from "@/lib/utils"

interface MediaPickerProps {
  onSelect: (selectedMedia: UserMediaWithDerivatives[]) => void
  multiSelect?: boolean
  filterType?: "image" | "video" | "audio"
  excludeUrls?: string[] // Media already in use
}

export function MediaPicker({
  onSelect,
  multiSelect = true,
  filterType,
  excludeUrls = [],
}: MediaPickerProps) {
  const [allMedia, setAllMedia] = useState<UserMediaWithDerivatives[]>([])
  const [filteredMedia, setFilteredMedia] = useState<UserMediaWithDerivatives[]>([])
  const [selectedMedia, setSelectedMedia] = useState<Set<string>>(new Set())
  const [failedThumbnailIds, setFailedThumbnailIds] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState<"all" | "image" | "video" | "audio">(
    filterType || "all"
  )

  // Load media library
  useEffect(() => {
    const loadMedia = async () => {
      setIsLoading(true)
      try {
        const { data, error } = await getUserMediaLibrary({
          media_type: filterType,
          limit: 100,
        })

        if (error) {
          console.error("[MediaPicker] Failed to load media:", error)
          return
        }

        // Filter out excluded URLs
        const available = (data || []).filter((m) => !excludeUrls.includes(m.public_url))
        setAllMedia(available)
        setFilteredMedia(available)
      } finally {
        setIsLoading(false)
      }
    }

    loadMedia()
  }, [filterType, excludeUrls])

  // Filter by tab and search
  useEffect(() => {
    let filtered = allMedia

    // Filter by type
    if (activeTab !== "all") {
      filtered = filtered.filter((m) => m.media_type === activeTab)
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter((m) => m.filename.toLowerCase().includes(query))
    }

    setFilteredMedia(filtered)
  }, [activeTab, searchQuery, allMedia])

  const handleToggleSelect = (media: UserMediaWithDerivatives) => {
    const newSelected = new Set(selectedMedia)

    if (newSelected.has(media.id)) {
      newSelected.delete(media.id)
    } else {
      if (!multiSelect) {
        newSelected.clear()
      }
      newSelected.add(media.id)
    }

    setSelectedMedia(newSelected)
  }

  // Handle failed thumbnail load - show fallback UI instead of hiding
  const handleThumbnailError = (mediaId: string) => {
    setFailedThumbnailIds(prev => new Set([...prev, mediaId]))
  }

  const handleConfirmSelection = () => {
    const selected = allMedia.filter((m) => selectedMedia.has(m.id))
    onSelect(selected)
  }

  const getMediaIcon = (type: string) => {
    switch (type) {
      case "image":
        return <ImageIcon className="h-4 w-4" />
      case "video":
        return <Video className="h-4 w-4" />
      case "audio":
        return <Music className="h-4 w-4" />
      default:
        return null
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (allMedia.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 text-muted-foreground">
        <ImageIcon className="h-12 w-12 opacity-50" />
        <p className="text-sm">No media in your library yet</p>
        <p className="text-xs">Upload some media to get started</p>
      </div>
    )
  }

  return (
    <div className="flex max-h-[420px] flex-col gap-3">
      {/* Search */}
      <div className="relative flex-shrink-0">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search by filename..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Type Filter Tabs */}
      {!filterType && (
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full flex-shrink-0">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="image">Images</TabsTrigger>
            <TabsTrigger value="video">Videos</TabsTrigger>
            <TabsTrigger value="audio">Audio</TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      {/* Media Grid */}
      <ScrollArea className="h-[264px] flex-shrink-0">
        {filteredMedia.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            No media found matching your criteria
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2 p-1">
            {filteredMedia.map((media) => {
              const isSelected = selectedMedia.has(media.id)
              const hasThumbnailFailed = failedThumbnailIds.has(media.id)

              return (
                <button
                  key={media.id}
                  onClick={() => handleToggleSelect(media)}
                  className={cn(
                    "group relative aspect-square overflow-hidden rounded border-2 transition-all",
                    isSelected
                      ? "border-primary ring-2 ring-primary ring-offset-2"
                      : "border-transparent hover:border-muted-foreground/50"
                  )}
                >
                  {/* Media Preview - use smallThumbnailUrl (120x120) for compact grid */}
                  {media.media_type === "image" && (
                    hasThumbnailFailed ? (
                      <div className="flex h-full w-full items-center justify-center bg-muted">
                        <ImageIcon className="h-8 w-8 text-muted-foreground" />
                      </div>
                    ) : (
                      <img
                        src={media.smallThumbnailUrl || media.thumbnailUrl || media.public_url}
                        alt={media.filename}
                        className="h-full w-full object-cover"
                        onError={() => handleThumbnailError(media.id)}
                      />
                    )
                  )}
                  {media.media_type === "video" && (
                    <div className="relative h-full w-full bg-black">
                      {!hasThumbnailFailed && (media.smallThumbnailUrl || media.thumbnailUrl) ? (
                        <img
                          src={media.smallThumbnailUrl || media.thumbnailUrl}
                          alt={media.filename}
                          className="h-full w-full object-cover"
                          onError={() => handleThumbnailError(media.id)}
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <Video className="h-8 w-8 text-white/50" />
                        </div>
                      )}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                        <Video className="h-6 w-6 text-white" />
                      </div>
                    </div>
                  )}
                  {media.media_type === "audio" && (
                    <div className="flex h-full w-full items-center justify-center bg-muted">
                      <Music className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}

                  {/* Selection Indicator */}
                  {isSelected && (
                    <div className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Check className="h-4 w-4" />
                    </div>
                  )}

                  {/* Info Overlay */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
                    <div className="flex items-center gap-1 text-xs text-white">
                      {getMediaIcon(media.media_type)}
                      <span className="truncate">{media.filename}</span>
                    </div>
                    <div className="text-xs text-white/70">{formatFileSize(media.file_size_bytes)}</div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </ScrollArea>

      {/* Action Buttons */}
      <div className="flex flex-shrink-0 items-center justify-between border-t pt-4">
        <p className="text-sm text-muted-foreground">
          {selectedMedia.size === 0 ? (
            "Select media to add"
          ) : (
            <span>
              <strong>{selectedMedia.size}</strong> item{selectedMedia.size !== 1 ? "s" : ""} selected
            </span>
          )}
        </p>
        <Button onClick={handleConfirmSelection} disabled={selectedMedia.size === 0}>
          Add Selected
        </Button>
      </div>
    </div>
  )
}
