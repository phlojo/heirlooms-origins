"use server"

import { createClient } from "@/lib/supabase/server"
import {
  createArtifactSchema,
  updateArtifactSchema,
  type CreateArtifactInput,
  type UpdateArtifactInput,
} from "@/lib/schemas"
import { revalidatePath } from "next/cache"
import { redirect } from 'next/navigation'
import { deleteCloudinaryMedia, extractPublicIdFromUrl } from "./cloudinary"
import { generateSlug, generateUniqueSlug } from "@/lib/utils/slug"
import { isCurrentUserAdmin } from "@/lib/utils/admin"

export async function createArtifact(input: CreateArtifactInput): Promise<{ error: string; fieldErrors?: any } | never> {
  const validatedFields = createArtifactSchema.safeParse(input)

  if (!validatedFields.success) {
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
    return { error: "Unauthorized" }
  }

  const uniqueMediaUrls = Array.from(new Set(validatedFields.data.media_urls || []))

  const baseSlug = generateSlug(validatedFields.data.title)
  const slug = await generateUniqueSlug(baseSlug, async (slug) => {
    const { data } = await supabase.from("artifacts").select("id").eq("slug", slug).maybeSingle()
    return !!data
  })

  const insertData = {
    title: validatedFields.data.title,
    description: validatedFields.data.description,
    collection_id: validatedFields.data.collectionId,
    year_acquired: validatedFields.data.year_acquired,
    origin: validatedFields.data.origin,
    media_urls: uniqueMediaUrls,
    user_id: user.id,
    slug,
  }

  const { data, error } = await supabase.from("artifacts").insert(insertData).select().single()

  if (error) {
    console.error("Artifact creation error:", error)
    return { error: "Failed to create artifact. Please try again." }
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
      user_id,
      collection_id,
      created_at,
      updated_at,
      collection:collections(id, title)
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

export async function getAllPublicArtifactsPaginated(
  excludeUserId?: string,
  limit: number = 24,
  cursor?: { createdAt: string; id: string }
) {
  const supabase = await createClient()

  let query = supabase
    .from("artifacts")
    .select(`
      *,
      collection:collections!inner(id, title, is_public)
    `)
    .eq("collection.is_public", true)

  if (excludeUserId) {
    query = query.neq("user_id", excludeUserId)
  }

  // Cursor-based pagination using created_at and id for stable ordering
  if (cursor) {
    query = query.or(`created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`)
  }

  const { data, error } = await query
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit + 1) // Fetch one extra to determine if there are more

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

export async function getMyArtifactsPaginated(
  userId: string,
  limit: number = 24,
  cursor?: { createdAt: string; id: string }
) {
  const supabase = await createClient()

  let query = supabase
    .from("artifacts")
    .select(`
      *,
      collection:collections(id, title, is_public)
    `)
    .eq("user_id", userId)

  // Cursor-based pagination
  if (cursor) {
    query = query.or(`created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`)
  }

  const { data, error } = await query
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit + 1)

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
      collection:collections!inner(id, title, is_public)
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
      collection:collections(id, title, is_public)
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

export async function updateArtifact(input: UpdateArtifactInput, oldMediaUrls: string[] = []) {
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
    .select("user_id, collection_id, slug, title, collection:collections(slug)")
    .eq("id", validatedFields.data.id)
    .single()

  if (!existingArtifact) {
    return { success: false, error: "Artifact not found" }
  }

  if (!isAdmin && existingArtifact.user_id !== user.id) {
    return { success: false, error: "Unauthorized" }
  }

  const newMediaUrls = validatedFields.data.media_urls || []
  const removedUrls = oldMediaUrls.filter((url) => !newMediaUrls.includes(url))

  for (const url of removedUrls) {
    const publicId = await extractPublicIdFromUrl(url)
    if (publicId) {
      await deleteCloudinaryMedia(publicId)
    }
  }

  const uniqueMediaUrls = Array.from(new Set(newMediaUrls))

  let newSlug = existingArtifact.slug
  if (validatedFields.data.title !== existingArtifact.title) {
    const baseSlug = generateSlug(validatedFields.data.title)
    newSlug = await generateUniqueSlug(baseSlug, async (slug) => {
      if (slug === existingArtifact.slug) return false
      const { data } = await supabase.from("artifacts").select("id").eq("slug", slug).maybeSingle()
      return !!data
    })
  }

  const updateData: any = {
    title: validatedFields.data.title,
    description: validatedFields.data.description,
    year_acquired: validatedFields.data.year_acquired,
    origin: validatedFields.data.origin,
    media_urls: uniqueMediaUrls,
    slug: newSlug,
    updated_at: new Date().toISOString(),
  }

  if (validatedFields.data.image_captions !== undefined) {
    updateData.image_captions = validatedFields.data.image_captions
  }

  const { data, error } = await supabase
    .from("artifacts")
    .update(updateData)
    .eq("id", validatedFields.data.id)
    .select()
    .single()

  if (error) {
    console.error("Artifact update error:", error)
    return { success: false, error: "Failed to update artifact. Please try again." }
  }

  revalidatePath(`/artifacts/${existingArtifact.slug}`)
  revalidatePath(`/artifacts/${data.slug}`)
  revalidatePath("/collections")
  if (existingArtifact.collection?.slug) {
    revalidatePath(`/collections/${existingArtifact.collection.slug}`)
  } else {
    revalidatePath(`/collections/${existingArtifact.collection_id}`)
  }

  return { success: true, data }
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
    .select("user_id, slug, media_urls, image_captions, video_summaries, audio_transcripts, audio_summaries, collection:collections(slug)")
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

  const { error: updateError } = await supabase
    .from("artifacts")
    .update({
      media_urls: updatedMediaUrls,
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
  revalidatePath(`/artifacts/${artifact.slug}/edit`)
  revalidatePath("/collections")
  if (artifact.collection?.slug) {
    revalidatePath(`/collections/${artifact.collection.slug}`)
  }

  return { success: true }
}

export async function getArtifactBySlug(artifactSlug: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("artifacts")
    .select(`
      *,
      collection:collections(id, title, is_public, slug)
    `)
    .eq("slug", artifactSlug)
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
    .select("user_id, slug, media_urls, collection:collections(slug)")
    .eq("id", artifactId)
    .single()

  if (fetchError || !artifact) {
    return { success: false, error: "Artifact not found" }
  }

  if (!isAdmin && artifact.user_id !== user.id) {
    return { success: false, error: "Unauthorized" }
  }

  const mediaUrls = artifact.media_urls || []
  for (const url of mediaUrls) {
    const publicId = await extractPublicIdFromUrl(url)
    if (publicId) {
      await deleteCloudinaryMedia(publicId)
    }
  }

  const { error: deleteError } = await supabase.from("artifacts").delete().eq("id", artifactId)

  if (deleteError) {
    console.error("Error deleting artifact:", deleteError)
    return { success: false, error: "Failed to delete artifact" }
  }

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
  revalidatePath(`/artifacts/${artifact.slug}/edit`)
  if (artifact.collection?.slug) {
    revalidatePath(`/collections/${artifact.collection.slug}`)
  }

  return { success: true }
}
