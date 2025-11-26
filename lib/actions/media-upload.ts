"use server"

import { createClient } from "@/lib/supabase/server"
import { uploadToSupabaseStorage } from "./supabase-storage"

/**
 * Phase 2: Supabase Storage upload server action
 * Used when NEXT_PUBLIC_USE_SUPABASE_STORAGE=true
 *
 * Note: Cloudinary uploads continue to use client-side direct upload with signatures
 * (see generateCloudinarySignature in lib/actions/cloudinary.ts)
 */

interface UploadMediaResult {
  url?: string
  error?: string
}

/**
 * Upload media file to Supabase Storage
 * Phase 2: Called by client when feature flag is enabled
 *
 * @param formData - FormData containing file and metadata
 * @returns URL of uploaded file or error
 */
export async function uploadMediaToSupabase(formData: FormData): Promise<UploadMediaResult> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { error: "Unauthorized" }
    }

    const file = formData.get("file") as File | null
    const artifactId = formData.get("artifactId") as string | null

    if (!file) {
      return { error: "No file provided" }
    }

    console.log("[media-upload] Supabase upload request:", {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      artifactId,
    })

    // Upload original to Supabase Storage
    const folder = artifactId ? `${user.id}/${artifactId}` : `${user.id}/temp`
    const { publicUrl, error } = await uploadToSupabaseStorage(file, folder)

    if (error || !publicUrl) {
      console.error("[media-upload] Supabase upload failed:", error)
      return { error: error || "Upload failed" }
    }

    console.log("[media-upload] Supabase upload successful:", publicUrl)

    return {
      url: publicUrl,
    }
  } catch (error) {
    console.error("[media-upload] Unexpected error:", error)
    return { error: "Upload failed" }
  }
}
