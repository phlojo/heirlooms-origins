"use server"

import { createClient } from "@/lib/supabase/server"
import {
  createArtifactSchema,
  updateArtifactSchema,
  type CreateArtifactInput,
  type UpdateArtifactInput,
} from "@/lib/schemas"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { deleteCloudinaryMedia, extractPublicIdFromUrl } from "./cloudinary"
import { generateSlug, generateUniqueSlug } from "@/lib/utils/slug"
import { isCurrentUserAdmin } from "@/lib/utils/admin"
import { hasVisualMedia, getPrimaryVisualMediaUrl, getStorageType } from "@/lib/media"
import { reorganizeArtifactMedia } from "./media-reorganize"
import { generateDerivativesMap } from "@/lib/utils/media-derivatives"
import { deleteFromSupabaseStorage } from "./supabase-storage"

export async function createArtifact(
  input: CreateArtifactInput,
): Promise<{ error: string; fieldErrors?: any } | never> {
  console.log("[v0] CREATE ARTIFACT - Received input:", {
    title: input.title,
    mediaCount: input.media_urls?.length || 0,
    collectionId: input.collectionId,
    typeId: input.type_id,
    hasThumbnailUrl: !!input.thumbnail_url,
    hasImageCaptions: !!input.image_captions && Object.keys(input.image_captions).length > 0,
    hasVideoSummaries: !!input.video_summaries && Object.keys(input.video_summaries).length > 0,
    hasAudioTranscripts: !!input.audio_transcripts && Object.keys(input.audio_transcripts).length > 0,
  })

  const validatedFields = createArtifactSchema.safeParse(input)

  if (!validatedFields.success) {
    console.error("[v0] CREATE ARTIFACT - Validation failed:", validatedFields.error.flatten())
    return {
      error: "Invalid input",
      fieldErrors: validatedFields.error.flatten().fieldErrors,
    }
  }

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    console.error("[v0] CREATE ARTIFACT - No user found")
    return { error: "Unauthorized" }
  }

  const uniqueMediaUrls = Array.from(new Set(validatedFields.data.media_urls || []))

  console.log("[v0] CREATE ARTIFACT - Media URLs processed:", {
    original: validatedFields.data.media_urls?.length || 0,
    unique: uniqueMediaUrls.length,
    urls: uniqueMediaUrls,
  })

  if (!hasVisualMedia(uniqueMediaUrls)) {
    console.warn(
      "[v0] CREATE ARTIFACT - WARNING: No visual media (image/video) found. Artifact will not have a thumbnail.",
      {
        title: validatedFields.data.title,
        mediaCount: uniqueMediaUrls.length,
      },
    )
  }

  const validMediaUrls = uniqueMediaUrls.filter((url) => {
    if (!url || typeof url !== "string" || url.trim() === "") {
      console.warn("[v0] CREATE ARTIFACT - Invalid media URL detected and removed:", url)
      return false
    }
    return true
  })

  if (validMediaUrls.length !== uniqueMediaUrls.length) {
    console.warn("[v0] CREATE ARTIFACT - Some invalid media URLs were filtered out", {
      original: uniqueMediaUrls.length,
      valid: validMediaUrls.length,
    })
  }

  const timestamp = Date.now()
  const baseSlug = `${generateSlug(validatedFields.data.title)}-${timestamp}`

  let slug = baseSlug
  let attempts = 0
  const maxAttempts = 5

  // Retry logic to handle potential race conditions
  while (attempts < maxAttempts) {
    const { data: existingSlug } = await supabase.from("artifacts").select("id").eq("slug", slug).maybeSingle()

    if (!existingSlug) {
      // Slug is available, proceed
      break
    }

    // Collision detected, append counter
    attempts++
    slug = `${baseSlug}-${attempts}`
    console.log(`[v0] CREATE ARTIFACT - Slug collision detected, trying: ${slug}`)
  }

  if (attempts >= maxAttempts) {
    console.error("[v0] CREATE ARTIFACT - Failed to generate unique slug after max attempts")
    return { error: "Unable to create artifact. Please try again." }
  }

  const thumbnailUrl = validatedFields.data.thumbnail_url || getPrimaryVisualMediaUrl(validMediaUrls)
  console.log("[v0] CREATE ARTIFACT - Thumbnail selection:", {
    userSelected: !!validatedFields.data.thumbnail_url,
    thumbnailUrl: thumbnailUrl || "NONE",
  })

  // PHASE 1: Generate media derivatives for predictable Cloudinary usage
  const mediaDerivatives = validMediaUrls.length > 0 ? generateDerivativesMap(validMediaUrls) : null
  console.log("[v0] CREATE ARTIFACT - Generated derivatives:", {
    mediaCount: validMediaUrls.length,
    derivativeCount: mediaDerivatives ? Object.keys(mediaDerivatives).length : 0,
  })

  const insertData: any = {
    title: validatedFields.data.title,
    description: validatedFields.data.description,
    collection_id: validatedFields.data.collectionId,
    year_acquired: validatedFields.data.year_acquired,
    origin: validatedFields.data.origin,
    media_urls: validMediaUrls,
    media_derivatives: mediaDerivatives,
    user_id: user.id,
    slug,
    thumbnail_url: thumbnailUrl,
    type_id: validatedFields.data.type_id,
  }

  if (validatedFields.data.image_captions && Object.keys(validatedFields.data.image_captions).length > 0) {
    insertData.image_captions = validatedFields.data.image_captions
    console.log(
      "[v0] CREATE ARTIFACT - Including image captions:",
      Object.keys(validatedFields.data.image_captions).length,
    )
  }

  if (validatedFields.data.video_summaries && Object.keys(validatedFields.data.video_summaries).length > 0) {
    insertData.video_summaries = validatedFields.data.video_summaries
    console.log(
      "[v0] CREATE ARTIFACT - Including video summaries:",
      Object.keys(validatedFields.data.video_summaries).length,
    )
  }

  if (validatedFields.data.audio_transcripts && Object.keys(validatedFields.data.audio_transcripts).length > 0) {
    insertData.audio_transcripts = validatedFields.data.audio_transcripts
    console.log(
      "[v0] CREATE ARTIFACT - Including audio transcripts:",
      Object.keys(validatedFields.data.audio_transcripts).length,
    )
  }

  console.log("[v0] CREATE ARTIFACT - Inserting into DB:", {
    ...insertData,
    media_urls: `[${insertData.media_urls.length} URLs]`,
    hasVisualMedia: !!thumbnailUrl,
    thumbnail_url: thumbnailUrl || "NULL",
    slug,
    hasAiData: !!(insertData.image_captions || insertData.video_summaries || insertData.audio_transcripts),
  })

  const { data, error } = await supabase.from("artifacts").insert(insertData).select().single()

  if (error) {
    console.error("[v0] CREATE ARTIFACT - Database error:", error)

    if (error.code === "23505" && error.message?.includes("artifacts_slug_key")) {
      console.error("[v0] CREATE ARTIFACT - Slug collision occurred despite checks:", slug)
      return { error: "Unable to create artifact due to a naming conflict. Please try again." }
    }

    return { error: "Failed to create artifact. Please try again." }
  }

  console.log("[v0] CREATE ARTIFACT - Success! Created artifact:", {
    id: data.id,
    slug: data.slug,
    mediaCount: data.media_urls?.length || 0,
    hasThumbnail: !!data.thumbnail_url,
    savedImageCaptions: data.image_captions ? Object.keys(data.image_captions).length : 0,
    savedVideoSummaries: data.video_summaries ? Object.keys(data.video_summaries).length : 0,
    savedAudioTranscripts: data.audio_transcripts ? Object.keys(data.audio_transcripts).length : 0,
  })

  if (!data.thumbnail_url) {
    console.log("[v0] CREATE ARTIFACT - Note: Artifact created without thumbnail (audio-only or no media)")
  }

  console.log("[v0] CREATE ARTIFACT - Marking uploads as saved:", validMediaUrls.length, "URLs")
  const { error: markError } = await supabase
    .from("pending_uploads")
    .delete()
    .in("cloudinary_url", validMediaUrls)
    .eq("user_id", user.id)

  if (markError) {
    console.error("[v0] CREATE ARTIFACT - Failed to mark uploads as saved (non-fatal):", markError)
    // Don't fail the artifact creation, but log the error
  } else {
    console.log("[v0] CREATE ARTIFACT - Successfully removed pending uploads from tracking table")
  }

  // Phase 2: Reorganize Supabase Storage media from temp to artifact folder
  if (uniqueMediaUrls.length > 0) {
    console.log("[v0] CREATE ARTIFACT - Reorganizing media files...")
    const reorganizeResult = await reorganizeArtifactMedia(data.id)

    if (reorganizeResult.error) {
      console.error("[v0] CREATE ARTIFACT - Failed to reorganize media (non-fatal):", reorganizeResult.error)
      // Don't fail artifact creation, files are still accessible from temp
    } else if (reorganizeResult.movedCount && reorganizeResult.movedCount > 0) {
      console.log("[v0] CREATE ARTIFACT - Successfully reorganized", reorganizeResult.movedCount, "media files")
    } else {
      console.log("[v0] CREATE ARTIFACT - No media files needed reorganization (likely Cloudinary)")
    }
  }

  revalidatePath("/artifacts")
  revalidatePath("/collections")
  if (validatedFields.data.collectionId) {
    revalidatePath(`/collections/${validatedFields.data.collectionId}`)
  }

  redirect(`/artifacts/${data.slug}`)
}

export async function getArtifactsByCollection(collectionId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("artifacts")
    .select(`
      id,
      slug,
      title,
      description,
      year_acquired,
      origin,
      media_urls,
      media_derivatives,
      thumbnail_url,
      user_id,
      collection_id,
      type_id,
      created_at,
      updated_at,
      collection:collections(id, title),
      artifact_type:artifact_types(id, name, icon_name)
    `)
    .eq("collection_id", collectionId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching artifacts:", error)
    return []
  }

  return data
}

export async function getArtifactById(artifactId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("artifacts")
    .select(`
      *,
      collection:collections(id, title, is_public, slug)
    `)
    .eq("id", artifactId)
    .single()

  if (error) {
    console.error("Error fetching artifact:", error)
    return null
  }

  if (data) {
    const { data: profile } = await supabase.from("profiles").select("display_name").eq("id", data.user_id).single()

    return {
      ...data,
      author_name: profile?.display_name || null,
    }
  }

  return data
}

export async function getAdjacentArtifacts(artifactId: string, collectionId: string) {
  const supabase = await createClient()

  const { data: artifacts, error } = await supabase
    .from("artifacts")
    .select("id, title, slug, created_at")
    .eq("collection_id", collectionId)
    .order("created_at", { ascending: false })

  if (error || !artifacts) {
    console.error("Error fetching adjacent artifacts:", error)
    return { previous: null, next: null, currentPosition: 0, totalCount: 0 }
  }

  const currentIndex = artifacts.findIndex((a) => a.id === artifactId)

  if (currentIndex === -1) {
    return { previous: null, next: null, currentPosition: 0, totalCount: artifacts.length }
  }

  const previous = currentIndex > 0 ? artifacts[currentIndex - 1] : null
  const next = currentIndex < artifacts.length - 1 ? artifacts[currentIndex + 1] : null

  return {
    previous,
    next,
    currentPosition: currentIndex + 1,
    totalCount: artifacts.length,
  }
}

export interface ArtifactQueryOptions {
  limit?: number
  cursor?: {
    createdAt?: string
    updatedAt?: string
    title?: string
    id: string
  }
  sortBy?: "newest" | "oldest" | "title-asc" | "title-desc" | "last-edited"
  typeIds?: string[]
}

export async function getAllPublicArtifactsPaginated(
  excludeUserId?: string,
  options: ArtifactQueryOptions = {},
) {
  const { limit = 24, cursor, sortBy = "newest", typeIds } = options

  const supabase = await createClient()

  let query = supabase
    .from("artifacts")
    .select(`
      *,
      collection:collections!inner(id, title, is_public),
      artifact_type:artifact_types(id, name, icon_name)
    `)
    .eq("collection.is_public", true)

  if (excludeUserId) {
    query = query.neq("user_id", excludeUserId)
  }

  // Apply type filter if provided
  if (typeIds && typeIds.length > 0) {
    query = query.in("type_id", typeIds)
  }

  // Apply cursor-based pagination based on sort order
  if (cursor) {
    switch (sortBy) {
      case "newest":
        query = query.or(
          `created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`,
        )
        break
      case "oldest":
        query = query.or(
          `created_at.gt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.gt.${cursor.id})`,
        )
        break
      case "title-asc":
        query = query.or(`title.gt.${cursor.title},and(title.eq.${cursor.title},id.gt.${cursor.id})`)
        break
      case "title-desc":
        query = query.or(`title.lt.${cursor.title},and(title.eq.${cursor.title},id.lt.${cursor.id})`)
        break
      case "last-edited":
        query = query.or(
          `updated_at.lt.${cursor.updatedAt},and(updated_at.eq.${cursor.updatedAt},id.lt.${cursor.id})`,
        )
        break
    }
  }

  // Apply sorting
  switch (sortBy) {
    case "newest":
      query = query.order("created_at", { ascending: false }).order("id", { ascending: false })
      break
    case "oldest":
      query = query.order("created_at", { ascending: true }).order("id", { ascending: true })
      break
    case "title-asc":
      query = query.order("title", { ascending: true }).order("id", { ascending: true })
      break
    case "title-desc":
      query = query.order("title", { ascending: false }).order("id", { ascending: false })
      break
    case "last-edited":
      query = query.order("updated_at", { ascending: false }).order("id", { ascending: false })
      break
  }

  const { data, error } = await query.limit(limit + 1)

  if (error) {
    console.error("Error fetching public artifacts:", error)
    return { artifacts: [], hasMore: false }
  }

  const hasMore = data.length > limit
  const artifacts = hasMore ? data.slice(0, limit) : data

  const userIds = [...new Set(artifacts.map((artifact) => artifact.user_id))]
  const { data: profiles } = await supabase.from("profiles").select("id, display_name").in("id", userIds)

  const profileMap = new Map(profiles?.map((p) => [p.id, p.display_name]) || [])

  const enrichedArtifacts = artifacts.map((artifact) => ({
    ...artifact,
    author_name: profileMap.get(artifact.user_id) || null,
  }))

  return {
    artifacts: enrichedArtifacts,
    hasMore,
  }
}

export async function getMyArtifactsPaginated(userId: string, options: ArtifactQueryOptions = {}) {
  const { limit = 24, cursor, sortBy = "newest", typeIds } = options

  const supabase = await createClient()

  let query = supabase
    .from("artifacts")
    .select(`
      *,
      collection:collections(id, title, is_public),
      artifact_type:artifact_types(id, name, icon_name)
    `)
    .eq("user_id", userId)

  // Apply type filter if provided
  if (typeIds && typeIds.length > 0) {
    query = query.in("type_id", typeIds)
  }

  // Apply cursor-based pagination based on sort order
  if (cursor) {
    switch (sortBy) {
      case "newest":
        query = query.or(
          `created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`,
        )
        break
      case "oldest":
        query = query.or(
          `created_at.gt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.gt.${cursor.id})`,
        )
        break
      case "title-asc":
        query = query.or(`title.gt.${cursor.title},and(title.eq.${cursor.title},id.gt.${cursor.id})`)
        break
      case "title-desc":
        query = query.or(`title.lt.${cursor.title},and(title.eq.${cursor.title},id.lt.${cursor.id})`)
        break
      case "last-edited":
        query = query.or(
          `updated_at.lt.${cursor.updatedAt},and(updated_at.eq.${cursor.updatedAt},id.lt.${cursor.id})`,
        )
        break
    }
  }

  // Apply sorting
  switch (sortBy) {
    case "newest":
      query = query.order("created_at", { ascending: false }).order("id", { ascending: false })
      break
    case "oldest":
      query = query.order("created_at", { ascending: true }).order("id", { ascending: true })
      break
    case "title-asc":
      query = query.order("title", { ascending: true }).order("id", { ascending: true })
      break
    case "title-desc":
      query = query.order("title", { ascending: false }).order("id", { ascending: false })
      break
    case "last-edited":
      query = query.order("updated_at", { ascending: false }).order("id", { ascending: false })
      break
  }

  const { data, error } = await query.limit(limit + 1)

  if (error) {
    console.error("Error fetching my artifacts:", error)
    return { artifacts: [], hasMore: false }
  }

  const hasMore = data.length > limit
  const artifacts = hasMore ? data.slice(0, limit) : data

  const enrichedArtifacts = artifacts.map((artifact) => ({
    ...artifact,
    author_name: null,
  }))

  return {
    artifacts: enrichedArtifacts,
    hasMore,
  }
}

export async function getAllPublicArtifacts(excludeUserId?: string) {
  const supabase = await createClient()

  let query = supabase
    .from("artifacts")
    .select(`
      *,
      collection:collections!inner(id, title, is_public),
      artifact_type:artifact_types(id, name, icon_name)
    `)
    .eq("collection.is_public", true)

  if (excludeUserId) {
    query = query.neq("user_id", excludeUserId)
  }

  const { data, error } = await query.order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching public artifacts:", error)
    return []
  }

  const userIds = [...new Set(data.map((artifact) => artifact.user_id))]
  const { data: profiles } = await supabase.from("profiles").select("id, display_name").in("id", userIds)

  const profileMap = new Map(profiles?.map((p) => [p.id, p.display_name]) || [])

  return data.map((artifact) => ({
    ...artifact,
    author_name: profileMap.get(artifact.user_id) || null,
  }))
}

export async function getMyArtifacts(userId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("artifacts")
    .select(`
      *,
      collection:collections(id, title, is_public),
      artifact_type:artifact_types(id, name, icon_name)
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching my artifacts:", error)
    return []
  }

  return data.map((artifact) => ({
    ...artifact,
    author_name: null,
  }))
}

export async function updateArtifact(
  input: UpdateArtifactInput & { collectionId?: string },
  oldMediaUrls: string[] = [],
) {
  const validatedFields = updateArtifactSchema.safeParse(input)

  if (!validatedFields.success) {
    return {
      success: false,
      error: "Invalid input",
      fieldErrors: validatedFields.error.flatten().fieldErrors,
    }
  }

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Unauthorized" }
  }

  const isAdmin = await isCurrentUserAdmin()

  const { data: existingArtifact } = await supabase
    .from("artifacts")
    .select(
      "user_id, collection_id, slug, title, media_urls, collection:collections(slug), image_captions, video_summaries, audio_transcripts, audio_summaries",
    )
    .eq("id", validatedFields.data.id)
    .single()

  if (!existingArtifact) {
    return { success: false, error: "Artifact not found" }
  }

  if (!isAdmin && existingArtifact.user_id !== user.id) {
    return { success: false, error: "Unauthorized" }
  }

  const newMediaUrls = validatedFields.data.media_urls || []

  const validNewMediaUrls = newMediaUrls.filter((url) => {
    if (!url || typeof url !== "string" || url.trim() === "") {
      console.warn("[v0] UPDATE ARTIFACT - Invalid media URL detected and removed:", url)
      return false
    }
    return true
  })

  const originalUrls = existingArtifact.media_urls || []
  const newlyUploadedUrls = validNewMediaUrls.filter((url) => !originalUrls.includes(url))

  console.log("[v0] UPDATE ARTIFACT - Media analysis:", {
    originalCount: originalUrls.length,
    newCount: validNewMediaUrls.length,
    newlyUploaded: newlyUploadedUrls.length,
    newlyUploadedUrls,
  })

  const removedUrls = oldMediaUrls.filter((url) => !validNewMediaUrls.includes(url))

  for (const url of removedUrls) {
    const publicId = await extractPublicIdFromUrl(url)
    if (publicId) {
      await deleteCloudinaryMedia(publicId)
    }
  }

  const updatedImageCaptions =
    validatedFields.data.image_captions !== undefined
      ? validatedFields.data.image_captions
      : { ...(existingArtifact.image_captions || {}) }

  const updatedVideoSummaries =
    validatedFields.data.video_summaries !== undefined
      ? validatedFields.data.video_summaries
      : { ...(existingArtifact.video_summaries || {}) }

  const updatedAudioTranscripts =
    validatedFields.data.audio_transcripts !== undefined
      ? validatedFields.data.audio_transcripts
      : { ...(existingArtifact.audio_transcripts || {}) }

  const updatedAudioSummaries = existingArtifact.audio_summaries ? { ...existingArtifact.audio_summaries } : {}

  // Remove AI data for deleted media URLs
  for (const removedUrl of removedUrls) {
    delete updatedImageCaptions[removedUrl]
    delete updatedVideoSummaries[removedUrl]
    delete updatedAudioTranscripts[removedUrl]
    delete updatedAudioSummaries[removedUrl]
  }

  const uniqueMediaUrls = Array.from(new Set(validNewMediaUrls))

  const hadVisualMedia = hasVisualMedia(oldMediaUrls)
  const hasVisualMediaNow = hasVisualMedia(uniqueMediaUrls)

  if (hadVisualMedia && !hasVisualMediaNow) {
    console.warn("[v0] UPDATE ARTIFACT - WARNING: Removing all visual media. Artifact will lose its thumbnail.", {
      artifactId: validatedFields.data.id,
      oldMediaCount: oldMediaUrls.length,
      newMediaCount: uniqueMediaUrls.length,
    })
  }

  let thumbnailUrl: string | null
  if (validatedFields.data.thumbnail_url !== undefined) {
    // User explicitly set a thumbnail
    thumbnailUrl = validatedFields.data.thumbnail_url
  } else {
    // Check if current thumbnail was deleted
    const currentThumbnail = existingArtifact.thumbnail_url
    if (currentThumbnail && removedUrls.includes(currentThumbnail)) {
      // Thumbnail was deleted, auto-select new one
      thumbnailUrl = getPrimaryVisualMediaUrl(uniqueMediaUrls)
      console.log("[v0] UPDATE ARTIFACT - Thumbnail was deleted, auto-selecting new thumbnail:", thumbnailUrl || "NONE")
    } else {
      // Keep existing thumbnail or auto-select if none
      thumbnailUrl = currentThumbnail || getPrimaryVisualMediaUrl(uniqueMediaUrls)
    }
  }

  console.log("[v0] UPDATE ARTIFACT - Thumbnail update:", {
    userProvided: validatedFields.data.thumbnail_url !== undefined,
    thumbnailUrl: thumbnailUrl || "NONE",
  })

  let newSlug = existingArtifact.slug
  if (validatedFields.data.title !== existingArtifact.title) {
    const baseSlug = generateSlug(validatedFields.data.title)
    newSlug = await generateUniqueSlug(baseSlug, async (slug) => {
      if (slug === existingArtifact.slug) return false
      const { data } = await supabase.from("artifacts").select("id").eq("slug", slug).maybeSingle()
      return !!data
    })
  }

  const oldCollectionId = existingArtifact.collection_id
  const newCollectionId = input.collectionId || oldCollectionId
  const collectionChanged = newCollectionId !== oldCollectionId

  if (collectionChanged) {
    console.log("[v0] UPDATE ARTIFACT - Collection change detected:", {
      from: oldCollectionId,
      to: newCollectionId,
    })
  }

  const updateData: any = {
    title: validatedFields.data.title,
    description: validatedFields.data.description,
    year_acquired: validatedFields.data.year_acquired,
    origin: validatedFields.data.origin,
    media_urls: uniqueMediaUrls,
    slug: newSlug,
    thumbnail_url: thumbnailUrl,
    updated_at: new Date().toISOString(),
    image_captions: updatedImageCaptions,
    video_summaries: updatedVideoSummaries,
    audio_transcripts: updatedAudioTranscripts,
    audio_summaries: updatedAudioSummaries,
    type_id: validatedFields.data.type_id,
  }

  if (collectionChanged) {
    updateData.collection_id = newCollectionId
  }

  console.log("[v0] UPDATE ARTIFACT - Updating with validated data:", {
    artifactId: validatedFields.data.id,
    mediaCount: uniqueMediaUrls.length,
    hasThumbnail: !!thumbnailUrl,
    thumbnail_url: thumbnailUrl || "NULL",
    collectionChanged,
    removedMediaCount: removedUrls.length,
    cleanedAiData: removedUrls.length > 0,
  })

  const { data: updatedArtifact, error: updateError } = await supabase
    .from("artifacts")
    .update(updateData)
    .eq("id", validatedFields.data.id)
    .select()
    .single()

  if (updateError) {
    console.error("Artifact update error:", updateError)
    return { success: false, error: "Failed to update artifact. Please try again." }
  }

  console.log("[v0] UPDATE ARTIFACT - Success!", {
    artifactId: updatedArtifact.id,
    slug: updatedArtifact.slug,
    mediaCount: updatedArtifact.media_urls?.length || 0,
    hasThumbnail: !!updatedArtifact.thumbnail_url,
  })

  if (newlyUploadedUrls.length > 0) {
    console.log("[v0] UPDATE ARTIFACT - Marking newly uploaded media as saved:", newlyUploadedUrls.length, "URLs")
    const { error: markError } = await supabase
      .from("pending_uploads")
      .delete()
      .in("cloudinary_url", newlyUploadedUrls)
      .eq("user_id", user.id)

    if (markError) {
      console.error("[v0] UPDATE ARTIFACT - Failed to mark uploads as saved (non-fatal):", markError)
    } else {
      console.log("[v0] UPDATE ARTIFACT - Successfully removed pending uploads from tracking table")
    }
  }

  revalidatePath(`/artifacts/${existingArtifact.slug}`)
  revalidatePath(`/artifacts/${updatedArtifact.slug}`)
  revalidatePath("/collections")

  if (existingArtifact.collection?.slug) {
    revalidatePath(`/collections/${existingArtifact.collection.slug}`)
  }

  if (collectionChanged) {
    // Fetch new collection slug for revalidation
    const { data: newCollection } = await supabase.from("collections").select("slug").eq("id", newCollectionId).single()

    if (newCollection?.slug) {
      revalidatePath(`/collections/${newCollection.slug}`)
    }
  }

  return { success: true, data: updatedArtifact, slug: updatedArtifact.slug }
}

export async function deleteMediaFromArtifact(artifactId: string, mediaUrl: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Unauthorized" }
  }

  const isAdmin = await isCurrentUserAdmin()

  const { data: artifact, error: fetchError } = await supabase
    .from("artifacts")
    .select(
      "user_id, slug, media_urls, image_captions, video_summaries, audio_transcripts, audio_summaries, collection:collections(slug)",
    )
    .eq("id", artifactId)
    .single()

  if (fetchError || !artifact) {
    return { success: false, error: "Artifact not found" }
  }

  if (!isAdmin && artifact.user_id !== user.id) {
    return { success: false, error: "Unauthorized" }
  }

  const updatedMediaUrls = (artifact.media_urls || []).filter((url: string) => url !== mediaUrl)

  const updatedImageCaptions = { ...(artifact.image_captions || {}) }
  delete updatedImageCaptions[mediaUrl]

  const updatedVideoSummaries = { ...(artifact.video_summaries || {}) }
  delete updatedVideoSummaries[mediaUrl]

  const updatedAudioTranscripts = { ...(artifact.audio_transcripts || {}) }
  delete updatedAudioTranscripts[mediaUrl]

  const updatedAudioSummaries = { ...(artifact.audio_summaries || {}) }
  delete updatedAudioSummaries[mediaUrl]

  const newThumbnailUrl = getPrimaryVisualMediaUrl(updatedMediaUrls)

  const { error: updateError } = await supabase
    .from("artifacts")
    .update({
      media_urls: updatedMediaUrls,
      thumbnail_url: newThumbnailUrl, // Phase 2: Update thumbnail
      image_captions: updatedImageCaptions,
      video_summaries: updatedVideoSummaries,
      audio_transcripts: updatedAudioTranscripts,
      audio_summaries: updatedAudioSummaries,
      updated_at: new Date().toISOString(),
    })
    .eq("id", artifactId)

  if (updateError) {
    console.error("Error deleting media:", updateError)
    return { success: false, error: "Failed to delete media" }
  }

  const publicId = await extractPublicIdFromUrl(mediaUrl)
  if (publicId) {
    await deleteCloudinaryMedia(publicId)
  }

  revalidatePath(`/artifacts/${artifact.slug}`)
  revalidatePath("/collections")
  if (artifact.collection?.slug) {
    revalidatePath(`/collections/${artifact.collection.slug}`)
  }

  return { success: true }
}

export async function getArtifactBySlug(artifactSlug: string) {
  const supabase = await createClient()

  console.log("[getArtifactBySlug] Looking up artifact with slug:", artifactSlug)

  const { data, error } = await supabase
    .from("artifacts")
    .select(`
      *,
      collection:collections(id, title, is_public, slug),
      artifact_type:artifact_types(id, name, icon_name)
    `)
    .eq("slug", artifactSlug)
    .single()

  if (error) {
    console.error("[getArtifactBySlug] Error fetching artifact:", {
      slug: artifactSlug,
      error: error,
      errorCode: error.code,
      errorMessage: error.message,
      errorDetails: error.details,
    })
    return null
  }

  if (data) {
    const { data: profile } = await supabase.from("profiles").select("display_name").eq("id", data.user_id).single()

    return {
      ...data,
      author_name: profile?.display_name || null,
    }
  }

  return data
}

export async function deleteArtifact(artifactId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Unauthorized" }
  }

  const isAdmin = await isCurrentUserAdmin()

  const { data: artifact, error: fetchError } = await supabase
    .from("artifacts")
    .select("user_id, slug, media_urls, thumbnail_url, collection:collections(slug)")
    .eq("id", artifactId)
    .single()

  if (fetchError || !artifact) {
    return { success: false, error: "Artifact not found" }
  }

  if (!isAdmin && artifact.user_id !== user.id) {
    return { success: false, error: "Unauthorized" }
  }

  // Delete all media from storage (both Supabase and Cloudinary)
  const mediaUrls = artifact.media_urls || []
  const deletedCloudinaryIds = new Set<string>()
  const deletedSupabaseUrls = new Set<string>()

  console.log("[deleteArtifact] Deleting media for artifact:", {
    artifactId,
    mediaCount: mediaUrls.length,
  })

  for (const url of mediaUrls) {
    const storageType = getStorageType(url)

    if (storageType === "supabase") {
      // Delete from Supabase Storage
      const { success, error } = await deleteFromSupabaseStorage(url)
      if (success) {
        deletedSupabaseUrls.add(url)
        console.log("[deleteArtifact] Deleted from Supabase Storage:", url)
      } else {
        console.error("[deleteArtifact] Failed to delete from Supabase Storage:", { url, error })
      }
    } else if (storageType === "cloudinary") {
      // Delete from Cloudinary
      const publicId = await extractPublicIdFromUrl(url)
      if (publicId) {
        await deleteCloudinaryMedia(publicId)
        deletedCloudinaryIds.add(publicId)
        console.log("[deleteArtifact] Deleted from Cloudinary:", publicId)
      }
    } else {
      console.warn("[deleteArtifact] Unknown storage type for URL:", url)
    }
  }

  // Delete thumbnail if it's different from media URLs
  if (artifact.thumbnail_url) {
    const storageType = getStorageType(artifact.thumbnail_url)

    if (storageType === "supabase" && !deletedSupabaseUrls.has(artifact.thumbnail_url)) {
      const { success, error } = await deleteFromSupabaseStorage(artifact.thumbnail_url)
      if (success) {
        console.log("[deleteArtifact] Deleted separate thumbnail from Supabase:", artifact.thumbnail_url)
      } else {
        console.error("[deleteArtifact] Failed to delete thumbnail from Supabase:", { url: artifact.thumbnail_url, error })
      }
    } else if (storageType === "cloudinary") {
      const thumbnailPublicId = await extractPublicIdFromUrl(artifact.thumbnail_url)
      if (thumbnailPublicId && !deletedCloudinaryIds.has(thumbnailPublicId)) {
        await deleteCloudinaryMedia(thumbnailPublicId)
        console.log("[deleteArtifact] Deleted separate thumbnail from Cloudinary:", thumbnailPublicId)
      }
    }
  }

  // Delete artifact from database
  const { error: deleteError } = await supabase.from("artifacts").delete().eq("id", artifactId)

  if (deleteError) {
    console.error("[deleteArtifact] Error deleting artifact from database:", deleteError)
    return { success: false, error: "Failed to delete artifact" }
  }

  console.log("[deleteArtifact] Successfully deleted artifact:", artifactId)

  revalidatePath(`/artifacts/${artifact.slug}`)
  revalidatePath("/collections")
  if (artifact.collection?.slug) {
    revalidatePath(`/collections/${artifact.collection.slug}`)
  }

  return { success: true }
}

export async function updateMediaCaption(artifactId: string, mediaUrl: string, caption: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Unauthorized" }
  }

  const isAdmin = await isCurrentUserAdmin()

  const { data: artifact, error: fetchError } = await supabase
    .from("artifacts")
    .select("user_id, slug, image_captions, collection:collections(slug)")
    .eq("id", artifactId)
    .single()

  if (fetchError || !artifact) {
    return { success: false, error: "Artifact not found" }
  }

  if (!isAdmin && artifact.user_id !== user.id) {
    return { success: false, error: "Unauthorized" }
  }

  const updatedImageCaptions = {
    ...(artifact.image_captions || {}),
    [mediaUrl]: caption,
  }

  const { error: updateError } = await supabase
    .from("artifacts")
    .update({
      image_captions: updatedImageCaptions,
      updated_at: new Date().toISOString(),
    })
    .eq("id", artifactId)

  if (updateError) {
    console.error("Error updating caption:", updateError)
    return { success: false, error: "Failed to update caption" }
  }

  revalidatePath(`/artifacts/${artifact.slug}`)
  if (artifact.collection?.slug) {
    revalidatePath(`/collections/${artifact.collection.slug}`)
  }

  return { success: true }
}
