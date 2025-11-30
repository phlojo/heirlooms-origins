import { auditPendingUploads } from "@/lib/actions/pending-uploads"
import { deleteCloudinaryMedia } from "@/lib/actions/cloudinary"
import { isSupabaseStorageUrl } from "@/lib/media"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

// Service role client for admin operations (bypasses RLS)
function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Extract file path from Supabase Storage public URL
function extractStoragePath(publicUrl: string): string | null {
  const match = publicUrl.match(/\/public\/[^/]+\/(.+)$/)
  return match ? match[1] : null
}

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

    // Use service role client for admin operations (cron has no user session)
    const supabase = createServiceClient()
    let deletedFromStorage = 0
    let deletedFromDatabase = 0
    let deletedUserMedia = 0
    const failedDeletions: string[] = []
    const successfullyDeletedUrls: string[] = []

    // Clean up files that are safe to delete (expired and not in use)
    for (const upload of audit.details.safeToDelete) {
      let deleteError: string | null = null

      // Phase 2: Route deletion to correct storage backend
      if (isSupabaseStorageUrl(upload.url)) {
        console.log(`[v0] Cron: Deleting from Supabase Storage: ${upload.url}`)
        const filePath = extractStoragePath(upload.url)
        if (filePath) {
          const { error } = await supabase.storage
            .from("heirlooms-media")
            .remove([filePath])
          if (error) deleteError = error.message
        } else {
          deleteError = "Invalid storage URL"
        }
      } else {
        console.log(`[v0] Cron: Deleting from Cloudinary: ${upload.url}`)
        const result = await deleteCloudinaryMedia(upload.publicId, 'image')
        if (result.error) deleteError = result.error
      }

      if (!deleteError) {
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

    // Phase 3: Clean up orphaned user_media with temp URLs not linked to any artifact
    // These slip through when files are "saved" (removed from pending_uploads) but
    // reorganizeArtifactMedia() failed to move them, and the artifact was later deleted
    let orphanedTempMediaDeleted = 0
    const orphanedTempMediaFailed: string[] = []

    // Find user_media records with temp URLs that aren't linked to any artifact
    const { data: orphanedTempMedia, error: orphanedError } = await supabase
      .from("user_media")
      .select("id, public_url, user_id")
      .like("public_url", "%/temp/%")

    if (orphanedError) {
      console.error("[v0] Cron: Failed to query orphaned temp media:", orphanedError)
    } else if (orphanedTempMedia && orphanedTempMedia.length > 0) {
      console.log(`[v0] Cron: Found ${orphanedTempMedia.length} user_media with temp URLs, checking links...`)

      for (const media of orphanedTempMedia) {
        // Check if this media is linked to any artifact
        const { data: links } = await supabase
          .from("artifact_media")
          .select("id")
          .eq("media_id", media.id)
          .limit(1)

        const isLinked = links && links.length > 0

        if (!isLinked) {
          // Not linked to any artifact - safe to delete
          console.log(`[v0] Cron: Deleting orphaned temp media: ${media.public_url}`)

          // Delete from storage first
          if (isSupabaseStorageUrl(media.public_url)) {
            const filePath = extractStoragePath(media.public_url)
            if (filePath) {
              const { error } = await supabase.storage
                .from("heirlooms-media")
                .remove([filePath])
              if (error) {
                // File might already be gone, that's OK
                console.log(`[v0] Cron: Storage delete note: ${error.message}`)
              }
            }
          }

          // Delete the user_media record
          const { error: deleteMediaError } = await supabase
            .from("user_media")
            .delete()
            .eq("id", media.id)

          if (deleteMediaError) {
            console.error(`[v0] Cron: Failed to delete user_media ${media.id}:`, deleteMediaError)
            orphanedTempMediaFailed.push(media.public_url)
          } else {
            orphanedTempMediaDeleted++
          }
        }
      }

      console.log(`[v0] Cron: Cleaned ${orphanedTempMediaDeleted} orphaned temp user_media records`)
    }

    console.log(`[v0] Cron cleanup complete: ${deletedFromStorage} from storage, ${deletedFromDatabase} from pending_uploads, ${deletedUserMedia} from user_media, ${orphanedTempMediaDeleted} orphaned temp media`)

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
        orphanedTempMediaDeleted,
        failedDeletions: failedDeletions.length,
        orphanedTempMediaFailed: orphanedTempMediaFailed.length,
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
