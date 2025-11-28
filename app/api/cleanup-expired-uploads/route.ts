import { auditPendingUploads } from "@/lib/actions/pending-uploads"
import { deleteCloudinaryMedia } from "@/lib/actions/cloudinary"
import { deleteFromSupabaseStorage } from "@/lib/actions/supabase-storage"
import { isSupabaseStorageUrl } from "@/lib/media"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

/**
 * Cron endpoint to clean up expired uploads
 * Configure in vercel.json to run daily at midnight UTC (0 0 * * *)
 * Vercel automatically authenticates cron requests via x-vercel-cron header
 *
 * Phase 2: Handles both Cloudinary and Supabase Storage URLs
 */
export async function GET(request: Request) {
  // Verify this request is from Vercel Cron
  const cronHeader = request.headers.get("x-vercel-cron")

  // In production, Vercel adds this header automatically to cron requests
  // In development, allow any request for testing
  if (process.env.NODE_ENV === "production" && !cronHeader) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // Audit pending uploads to identify what needs cleaning
    const audit = await auditPendingUploads()

    const supabase = await createClient()
    let deletedFromStorage = 0
    let deletedFromDatabase = 0
    let deletedUserMedia = 0
    const failedDeletions: string[] = []
    const successfullyDeletedUrls: string[] = []

    // Clean up files that are safe to delete (expired and not in use)
    for (const upload of audit.details.safeToDelete) {
      let result: { error?: string }

      // Phase 2: Route deletion to correct storage backend
      if (isSupabaseStorageUrl(upload.url)) {
        console.log(`[v0] Cron: Deleting from Supabase Storage: ${upload.url}`)
        result = await deleteFromSupabaseStorage(upload.url)
      } else {
        console.log(`[v0] Cron: Deleting from Cloudinary: ${upload.url}`)
        result = await deleteCloudinaryMedia(upload.publicId, 'image')
      }

      if (!result.error) {
        deletedFromStorage++
        successfullyDeletedUrls.push(upload.url)
      } else {
        failedDeletions.push(upload.url)
      }
    }

    // Clean up already-deleted files (remove database entries)
    if (audit.details.alreadyDeleted.length > 0) {
      const alreadyDeletedIds = audit.details.alreadyDeleted.map(u => u.publicId)
      const alreadyDeletedUrls = audit.details.alreadyDeleted.map(u => u.url)

      const { error: deleteError } = await supabase
        .from("pending_uploads")
        .delete()
        .in("cloudinary_public_id", alreadyDeletedIds)

      if (!deleteError) {
        deletedFromDatabase += audit.details.alreadyDeleted.length
        successfullyDeletedUrls.push(...alreadyDeletedUrls)
      }
    }

    // Remove from database those we successfully deleted from storage
    if (deletedFromStorage > 0) {
      const successfulPublicIds = audit.details.safeToDelete
        .filter(u => successfullyDeletedUrls.includes(u.url))
        .map(u => u.publicId)

      const { error: dbDeleteError } = await supabase
        .from("pending_uploads")
        .delete()
        .in("cloudinary_public_id", successfulPublicIds)

      if (!dbDeleteError) {
        deletedFromDatabase += successfulPublicIds.length
      }
    }

    // Clean up orphaned user_media records for all deleted URLs
    // These were created immediately on upload but the storage files are now deleted
    if (successfullyDeletedUrls.length > 0) {
      const { data: deletedRecords, error: userMediaError } = await supabase
        .from("user_media")
        .delete()
        .in("public_url", successfullyDeletedUrls)
        .select("id")

      if (userMediaError) {
        console.error("[v0] Cron: Failed to remove orphaned user_media records:", userMediaError)
      } else {
        deletedUserMedia = deletedRecords?.length || 0
        console.log(`[v0] Cron: Removed ${deletedUserMedia} orphaned user_media records`)
      }
    }

    console.log(`[v0] Cron cleanup complete: ${deletedFromStorage} from storage, ${deletedFromDatabase} from pending_uploads, ${deletedUserMedia} from user_media`)

    return NextResponse.json({
      success: true,
      audit: {
        totalPending: audit.summary.totalPendingUploads,
        expiredCount: audit.summary.expiredUploads,
      },
      cleanup: {
        deletedFromStorage,
        deletedFromDatabase,
        deletedUserMedia,
        failedDeletions: failedDeletions.length,
      }
    })
  } catch (error) {
    console.error("[v0] Cleanup error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
