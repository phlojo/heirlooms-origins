"use server"

import { createClient } from "@/lib/supabase/server"
import { deleteCloudinaryMedia, extractPublicIdFromUrl } from "./cloudinary"

export interface PendingUpload {
  id: string
  user_id: string
  cloudinary_url: string
  cloudinary_public_id: string
  resource_type: string
  created_at: string
  expires_at: string
}

/**
 * Track a newly uploaded file so we can clean it up if not saved
 */
export async function trackPendingUpload(url: string, resourceType: 'image' | 'video' | 'raw') {
  console.log('[v0] trackPendingUpload called with:', { url, resourceType })
  
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    console.error('[v0] trackPendingUpload: No user found')
    return { error: "Unauthorized" }
  }

  console.log('[v0] trackPendingUpload: User ID:', user.id)

  const publicId = await extractPublicIdFromUrl(url)
  if (!publicId) {
    console.error('[v0] trackPendingUpload: Could not extract public ID from URL:', url)
    return { error: "Could not extract public ID from URL" }
  }

  console.log('[v0] trackPendingUpload: Extracted public ID:', publicId)
  console.log('[v0] trackPendingUpload: Inserting into pending_uploads table...')

  const { error } = await supabase
    .from("pending_uploads")
    .insert({
      user_id: user.id,
      cloudinary_url: url,
      cloudinary_public_id: publicId,
      resource_type: resourceType,
    })

  if (error) {
    console.error("[v0] trackPendingUpload: Database insert failed:", error)
    return { error: error.message }
  }

  console.log('[v0] trackPendingUpload: Successfully inserted into database')
  return { success: true }
}

/**
 * Remove URLs from pending uploads when they're successfully saved
 */
export async function markUploadsAsSaved(urls: string[]) {
  console.log('[v0] markUploadsAsSaved called with URLs:', urls)
  
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    console.error('[v0] markUploadsAsSaved: No user found')
    return { error: "Unauthorized" }
  }

  console.log('[v0] markUploadsAsSaved: Deleting from pending_uploads for user:', user.id)

  const { error } = await supabase
    .from("pending_uploads")
    .delete()
    .in("cloudinary_url", urls)
    .eq("user_id", user.id)

  if (error) {
    console.error("[v0] Failed to mark uploads as saved:", error)
    return { error: error.message }
  }

  console.log('[v0] markUploadsAsSaved: Successfully removed', urls.length, 'URLs from pending_uploads')
  return { success: true }
}

/**
 * Clean up all pending uploads for current user
 * Returns the number of files deleted
 */
export async function cleanupPendingUploads() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { error: "Unauthorized" }
  }

  // Get all pending uploads for this user
  const { data: uploads, error: fetchError } = await supabase
    .from("pending_uploads")
    .select("*")
    .eq("user_id", user.id)

  if (fetchError) {
    console.error("[v0] Failed to fetch pending uploads:", fetchError)
    return { error: fetchError.message }
  }

  if (!uploads || uploads.length === 0) {
    return { success: true, deletedCount: 0 }
  }

  console.log(`[v0] Cleaning up ${uploads.length} pending uploads`)

  let successCount = 0
  let failCount = 0
  const successfulIds: string[] = []

  // Process each upload individually to ensure transactionality
  for (const upload of uploads) {
    const result = await deleteCloudinaryMedia(upload.cloudinary_public_id)
    
    if (!result.error) {
      successCount++
      successfulIds.push(upload.id)
    } else {
      failCount++
      console.error(`[v0] Failed to delete ${upload.cloudinary_url}:`, result.error)
    }
  }

  // Only remove successfully deleted uploads from database
  if (successfulIds.length > 0) {
    const { error: deleteError } = await supabase
      .from("pending_uploads")
      .delete()
      .in("id", successfulIds)

    if (deleteError) {
      console.error("[v0] Failed to remove pending uploads from DB:", deleteError)
    }
  }

  console.log(`[v0] Cleanup complete: ${successCount} deleted, ${failCount} failed (will retry later)`)

  return { 
    success: true, 
    deletedCount: successCount,
    failedCount: failCount 
  }
}

/**
 * Server-side cleanup of expired uploads (call this from a cron job)
 */
export async function cleanupExpiredUploads() {
  const supabase = await createClient()

  // Get expired uploads
  const { data: uploads, error: fetchError } = await supabase
    .from("pending_uploads")
    .select("*")
    .lt("expires_at", new Date().toISOString())

  if (fetchError) {
    console.error("[v0] Failed to fetch expired uploads:", fetchError)
    return { error: fetchError.message }
  }

  if (!uploads || uploads.length === 0) {
    return { success: true, deletedCount: 0 }
  }

  console.log(`[v0] Cleaning up ${uploads.length} expired uploads`)

  let successCount = 0
  const successfulIds: string[] = []

  // Process each upload individually to ensure transactionality
  for (const upload of uploads) {
    const result = await deleteCloudinaryMedia(upload.cloudinary_public_id)
    
    if (!result.error) {
      successCount++
      successfulIds.push(upload.id)
    } else {
      console.error(`[v0] Failed to delete expired upload ${upload.cloudinary_url}:`, result.error)
    }
  }

  // Only remove successfully deleted uploads from database
  if (successfulIds.length > 0) {
    const { error: deleteError } = await supabase
      .from("pending_uploads")
      .delete()
      .in("id", successfulIds)

    if (deleteError) {
      console.error("[v0] Failed to remove expired uploads from DB:", deleteError)
    }
  }

  return { success: true, deletedCount: successCount }
}
