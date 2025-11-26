"use server"

import { createClient } from "@/lib/supabase/server"

/**
 * Supabase Storage utilities for managing media files
 * Phase 2: Move originals from Cloudinary to Supabase Storage
 */

const STORAGE_BUCKET = "heirlooms-media"

/**
 * Upload a file to Supabase Storage
 *
 * @param file - File to upload
 * @param folder - Folder path (e.g., "userId/artifactId")
 * @returns Object with publicUrl or error
 */
export async function uploadToSupabaseStorage(
  file: File,
  folder: string
): Promise<{ publicUrl?: string; error?: string }> {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { error: "Unauthorized" }
    }

    // Generate unique filename with timestamp
    const timestamp = Date.now()
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_")
    const filePath = `${folder}/${timestamp}-${sanitizedName}`

    console.log("[supabase-storage] Uploading file:", {
      bucket: STORAGE_BUCKET,
      path: filePath,
      size: file.size,
      type: file.type,
    })

    // Upload to Supabase Storage
    const { data, error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false, // Don't overwrite existing files
      })

    if (uploadError) {
      console.error("[supabase-storage] Upload failed:", uploadError)
      return { error: uploadError.message }
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(data.path)

    console.log("[supabase-storage] Upload successful:", {
      path: data.path,
      publicUrl,
    })

    return { publicUrl }
  } catch (error) {
    console.error("[supabase-storage] Unexpected error:", error)
    return { error: "Failed to upload file to storage" }
  }
}

/**
 * Delete a file from Supabase Storage
 *
 * @param publicUrl - Public URL of the file to delete
 * @returns Success or error
 */
export async function deleteFromSupabaseStorage(
  publicUrl: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: "Unauthorized" }
    }

    // Extract file path from public URL
    const filePath = await extractSupabaseStoragePath(publicUrl)
    if (!filePath) {
      console.error("[supabase-storage] Invalid URL format:", publicUrl)
      return { success: false, error: "Invalid storage URL" }
    }

    console.log("[supabase-storage] Deleting file:", {
      bucket: STORAGE_BUCKET,
      path: filePath,
    })

    const { error: deleteError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([filePath])

    if (deleteError) {
      console.error("[supabase-storage] Delete failed:", deleteError)
      return { success: false, error: deleteError.message }
    }

    console.log("[supabase-storage] Delete successful:", filePath)
    return { success: true }
  } catch (error) {
    console.error("[supabase-storage] Unexpected error:", error)
    return { success: false, error: "Failed to delete file from storage" }
  }
}

/**
 * Get public URL for a file in Supabase Storage
 *
 * @param filePath - Path to file in storage (e.g., "userId/artifactId/filename.jpg")
 * @returns Public URL
 */
export async function getSupabasePublicUrl(filePath: string): Promise<string> {
  const supabase = await createClient()

  const {
    data: { publicUrl },
  } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(filePath)

  return publicUrl
}

/**
 * Extract file path from Supabase Storage public URL
 * Useful for cleanup and migration scripts
 *
 * @param publicUrl - Public URL from Supabase Storage
 * @returns File path or null if invalid URL
 */
export async function extractSupabaseStoragePath(publicUrl: string): Promise<string | null> {
  // Format: https://{project}.supabase.co/storage/v1/object/public/{bucket}/{path}
  const pathMatch = publicUrl.match(/\/public\/[^/]+\/(.+)$/)
  return pathMatch ? pathMatch[1] : null
}

/**
 * Move a file from temp folder to artifact folder in Supabase Storage
 * Phase 2: Two-phase upload - reorganize after artifact creation
 *
 * @param publicUrl - Current public URL (in temp folder)
 * @param artifactId - Target artifact ID for new folder
 * @returns New public URL or error
 */
export async function moveSupabaseFile(
  publicUrl: string,
  userId: string,
  artifactId: string
): Promise<{ publicUrl?: string; error?: string }> {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user || user.id !== userId) {
      return { error: "Unauthorized" }
    }

    // Extract current file path
    const currentPath = await extractSupabaseStoragePath(publicUrl)
    if (!currentPath) {
      return { error: "Invalid Supabase Storage URL" }
    }

    // Only move if currently in temp folder
    if (!currentPath.includes("/temp/")) {
      console.log("[supabase-storage] File not in temp, skipping move:", currentPath)
      return { publicUrl } // Already in correct location
    }

    // Generate new path: userId/artifactId/filename
    const filename = currentPath.split("/").pop()
    const newPath = `${userId}/${artifactId}/${filename}`

    console.log("[supabase-storage] Moving file:", {
      from: currentPath,
      to: newPath,
    })

    // Move file (copy then delete)
    const { error: copyError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .copy(currentPath, newPath)

    if (copyError) {
      console.error("[supabase-storage] Copy failed:", copyError)
      return { error: copyError.message }
    }

    // Delete original from temp
    const { error: deleteError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([currentPath])

    if (deleteError) {
      console.error("[supabase-storage] Delete original failed:", deleteError)
      // Don't fail the operation - file was copied successfully
    }

    // Get new public URL
    const {
      data: { publicUrl: newPublicUrl },
    } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(newPath)

    console.log("[supabase-storage] Move successful:", newPublicUrl)
    return { publicUrl: newPublicUrl }
  } catch (error) {
    console.error("[supabase-storage] Unexpected error:", error)
    return { error: "Failed to move file" }
  }
}
