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
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { error: "Unauthorized" }
  }

  const publicId = await extractPublicIdFromUrl(url)
  if (!publicId) {
    return { error: "Could not extract public ID from URL" }
  }

  const { error } = await supabase
    .from("pending_uploads")
    .insert({
      user_id: user.id,
      cloudinary_url: url,
      cloudinary_public_id: publicId,
      resource_type: resourceType,
    })

  if (error) {
    console.error("[v0] Failed to track pending upload:", error)
    return { error: error.message }
  }

  return { success: true }
}

/**
 * Remove URLs from pending uploads when they're successfully saved
 */
export async function markUploadsAsSaved(urls: string[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { error: "Unauthorized" }
  }

  const { error } = await supabase
    .from("pending_uploads")
    .delete()
    .in("cloudinary_url", urls)
    .eq("user_id", user.id)

  if (error) {
    console.error("[v0] Failed to mark uploads as saved:", error)
    return { error: error.message }
  }

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

  // Delete from Cloudinary
  const deletionResults = await Promise.allSettled(
    uploads.map(upload => deleteCloudinaryMedia(upload.cloudinary_public_id))
  )

  let successCount = 0
  let failCount = 0

  deletionResults.forEach((result, index) => {
    if (result.status === 'fulfilled' && !result.value.error) {
      successCount++
    } else {
      failCount++
      console.error(`[v0] Failed to delete ${uploads[index].cloudinary_url}:`, 
        result.status === 'fulfilled' ? result.value.error : result.reason)
    }
  })

  // Remove from database regardless of Cloudinary deletion success
  // (prevents accumulating stale records)
  const { error: deleteError } = await supabase
    .from("pending_uploads")
    .delete()
    .eq("user_id", user.id)

  if (deleteError) {
    console.error("[v0] Failed to remove pending uploads from DB:", deleteError)
  }

  console.log(`[v0] Cleanup complete: ${successCount} deleted, ${failCount} failed`)

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

  // Delete from Cloudinary
  const deletionResults = await Promise.allSettled(
    uploads.map(upload => deleteCloudinaryMedia(upload.cloudinary_public_id))
  )

  let successCount = 0
  deletionResults.forEach((result, index) => {
    if (result.status === 'fulfilled' && !result.value.error) {
      successCount++
    } else {
      console.error(`[v0] Failed to delete expired upload ${uploads[index].cloudinary_url}`)
    }
  })

  // Remove from database
  const { error: deleteError } = await supabase
    .from("pending_uploads")
    .delete()
    .lt("expires_at", new Date().toISOString())

  if (deleteError) {
    console.error("[v0] Failed to remove expired uploads from DB:", deleteError)
  }

  return { success: true, deletedCount: successCount }
}
