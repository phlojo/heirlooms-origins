"use server"

import { createClient } from "@/lib/supabase/server"
import { deleteCloudinaryMedia, extractPublicIdFromUrl } from "./cloudinary"
import { deleteFromSupabaseStorage, extractSupabaseStoragePath } from "./supabase-storage"
import { isSupabaseStorageUrl } from "@/lib/media"

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
 * Phase 2: Tracks both Cloudinary and Supabase Storage URLs
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

  // Extract identifier (Cloudinary public ID or Supabase path)
  let storageIdentifier: string
  if (isSupabaseStorageUrl(url)) {
    // For Supabase, use the file path as identifier
    const path = await extractSupabaseStoragePath(url)
    if (!path) {
      console.error('[v0] trackPendingUpload: Could not extract path from Supabase URL:', url)
      return { error: "Could not extract path from Supabase URL" }
    }
    storageIdentifier = path
    console.log('[v0] trackPendingUpload: Extracted Supabase path:', storageIdentifier)
  } else {
    // For Cloudinary, use public ID
    const publicId = await extractPublicIdFromUrl(url)
    if (!publicId) {
      console.error('[v0] trackPendingUpload: Could not extract public ID from URL:', url)
      return { error: "Could not extract public ID from URL" }
    }
    storageIdentifier = publicId
    console.log('[v0] trackPendingUpload: Extracted Cloudinary public ID:', storageIdentifier)
  }

  console.log('[v0] trackPendingUpload: Inserting into pending_uploads table...')

  // Set expiry to 24 hours from now
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

  const { error } = await supabase
    .from("pending_uploads")
    .insert({
      user_id: user.id,
      cloudinary_url: url, // Generic field - stores any media URL
      cloudinary_public_id: storageIdentifier, // Generic field - stores Cloudinary ID or Supabase path
      resource_type: resourceType,
      expires_at: expiresAt,
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
 * Phase 2: Handles both Cloudinary and Supabase Storage deletions
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
    let result: { error?: string }

    // Phase 2: Route deletion to correct storage backend
    if (isSupabaseStorageUrl(upload.cloudinary_url)) {
      console.log(`[v0] Deleting from Supabase Storage: ${upload.cloudinary_url}`)
      result = await deleteFromSupabaseStorage(upload.cloudinary_url)
    } else {
      console.log(`[v0] Deleting from Cloudinary: ${upload.cloudinary_url}`)
      result = await deleteCloudinaryMedia(upload.cloudinary_public_id, upload.resource_type as 'image' | 'video' | 'raw')
    }

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
 * DEPRECATED: This function deletes from Cloudinary and is dangerous.
 * Use auditPendingUploads() instead for safe reporting.
 * 
 * Server-side cleanup of expired uploads (call this from a cron job)
 */
export async function cleanupExpiredUploads() {
  console.warn("[v0] DEPRECATED: cleanupExpiredUploads() is deprecated. Use auditPendingUploads() instead.")
  
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

  console.log(`[v0] DEPRECATED FUNCTION CALLED: Would have cleaned up ${uploads.length} expired uploads. Use audit endpoint instead.`)

  return { 
    success: true, 
    deletedCount: 0,
    message: "DEPRECATED: Use audit endpoint instead. No files were deleted."
  }
}

export interface MediaAuditReport {
  timestamp: string
  summary: {
    totalPendingUploads: number
    expiredUploads: number
    safeToDelete: number
    dangerous: number
    alreadyDeleted: number
  }
  details: {
    safeToDelete: Array<{
      url: string
      publicId: string
      userId: string
      createdAt: string
      expiresAt: string
      existsInCloudinary: boolean
      reason: string
    }>
    dangerous: Array<{
      url: string
      publicId: string
      userId: string
      createdAt: string
      expiresAt: string
      existsInCloudinary: boolean
      foundInArtifacts: string[]
      reason: string
    }>
    alreadyDeleted: Array<{
      url: string
      publicId: string
      userId: string
      createdAt: string
      expiresAt: string
      reason: string
    }>
  }
}

/**
 * Audit pending uploads against artifacts and Cloudinary
 * This is SAFE - it only reads data and generates a report
 */
export async function auditPendingUploads(): Promise<MediaAuditReport> {
  const supabase = await createClient()

  // Get all pending uploads
  const { data: uploads, error: fetchError } = await supabase
    .from("pending_uploads")
    .select("*")

  if (fetchError) {
    console.error("[v0] Failed to fetch pending uploads:", fetchError)
    throw new Error(fetchError.message)
  }

  // Get all artifacts with their media URLs
  const { data: artifacts, error: artifactsError } = await supabase
    .from("artifacts")
    .select("id, slug, media_urls")

  if (artifactsError) {
    console.error("[v0] Failed to fetch artifacts:", artifactsError)
    throw new Error(artifactsError.message)
  }

  // Build a map of URL -> artifact slugs for quick lookup
  const urlToArtifacts = new Map<string, string[]>()
  artifacts?.forEach(artifact => {
    artifact.media_urls?.forEach((url: string) => {
      if (!urlToArtifacts.has(url)) {
        urlToArtifacts.set(url, [])
      }
      urlToArtifacts.get(url)!.push(artifact.slug)
    })
  })

  const safeToDelete: MediaAuditReport['details']['safeToDelete'] = []
  const dangerous: MediaAuditReport['details']['dangerous'] = []
  const alreadyDeleted: MediaAuditReport['details']['alreadyDeleted'] = []

  const now = new Date()

  // Check each pending upload
  for (const upload of uploads || []) {
    const isExpired = new Date(upload.expires_at) < now
    const usedInArtifacts = urlToArtifacts.get(upload.cloudinary_url) || []
    
    // Check if exists in Cloudinary
    const existsInCloudinary = await checkCloudinaryExists(upload.cloudinary_public_id, upload.resource_type)

    if (usedInArtifacts.length > 0) {
      // DANGEROUS: Still in pending_uploads but used in saved artifacts
      dangerous.push({
        url: upload.cloudinary_url,
        publicId: upload.cloudinary_public_id,
        userId: upload.user_id,
        createdAt: upload.created_at,
        expiresAt: upload.expires_at,
        existsInCloudinary,
        foundInArtifacts: usedInArtifacts,
        reason: "File is in pending_uploads but used in saved artifacts. markUploadsAsSaved() likely failed."
      })
    } else if (!existsInCloudinary) {
      // Already deleted from Cloudinary
      alreadyDeleted.push({
        url: upload.cloudinary_url,
        publicId: upload.cloudinary_public_id,
        userId: upload.user_id,
        createdAt: upload.created_at,
        expiresAt: upload.expires_at,
        reason: "File already deleted from Cloudinary. Safe to remove database entry."
      })
    } else if (isExpired) {
      // Safe to delete: expired, not used in artifacts, exists in Cloudinary
      safeToDelete.push({
        url: upload.cloudinary_url,
        publicId: upload.cloudinary_public_id,
        userId: upload.user_id,
        createdAt: upload.created_at,
        expiresAt: upload.expires_at,
        existsInCloudinary,
        reason: "File expired and not used in any artifacts. Likely from abandoned upload."
      })
    }
  }

  const expiredCount = uploads?.filter(u => new Date(u.expires_at) < now).length || 0

  return {
    timestamp: now.toISOString(),
    summary: {
      totalPendingUploads: uploads?.length || 0,
      expiredUploads: expiredCount,
      safeToDelete: safeToDelete.length,
      dangerous: dangerous.length,
      alreadyDeleted: alreadyDeleted.length,
    },
    details: {
      safeToDelete,
      dangerous,
      alreadyDeleted,
    }
  }
}

/**
 * Check if a file exists in Cloudinary
 */
async function checkCloudinaryExists(publicId: string, resourceType: string): Promise<boolean> {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME
  const apiKey = process.env.CLOUDINARY_API_KEY
  const apiSecret = process.env.CLOUDINARY_API_SECRET

  if (!cloudName || !apiKey || !apiSecret) {
    console.error("Cloudinary credentials not configured")
    return false
  }

  try {
    const timestamp = Math.round(Date.now() / 1000)
    
    // Generate signature for resource endpoint
    const crypto = await import("node:crypto")
    const stringToSign = `public_id=${publicId}&timestamp=${timestamp}${apiSecret}`
    const signature = crypto
      .createHash("sha1")
      .update(stringToSign)
      .digest("hex")

    // Try the specific resource type first
    const endpointsToTry = resourceType 
      ? [resourceType, ...(['image', 'video', 'raw'].filter(t => t !== resourceType))]
      : ['image', 'video', 'raw']

    for (const endpoint of endpointsToTry) {
      const url = `https://api.cloudinary.com/v1_1/${cloudName}/resources/${endpoint}/upload?public_ids[]=${encodeURIComponent(publicId)}&api_key=${apiKey}&timestamp=${timestamp}&signature=${signature}`
      
      const response = await fetch(url)
      const data = await response.json()

      if (data.resources && data.resources.length > 0) {
        return true
      }
    }

    return false
  } catch (error) {
    console.error("[v0] Error checking Cloudinary existence:", error)
    return false
  }
}
