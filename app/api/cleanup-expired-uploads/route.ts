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

// Transcription audio retention period (7 days)
const TRANSCRIPTION_RETENTION_MS = 7 * 24 * 60 * 60 * 1000

// Extract timestamp from transcription filename (e.g., "title-1764716158016.webm")
function extractTimestampFromFilename(filename: string): number | null {
  const match = filename.match(/-([\d]+)\.webm$/)
  return match ? parseInt(match[1], 10) : null
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

    // Phase 4: Clean up old transcription audio files
    // These are uploaded to {userId}/transcriptions/ for archival but never tracked in DB
    // Delete files older than TRANSCRIPTION_RETENTION_MS (7 days)
    let transcriptionsDeleted = 0
    let transcriptionsFailed = 0
    const now = Date.now()

    // List all top-level folders (user IDs)
    const { data: userFolders, error: listError } = await supabase.storage
      .from("heirlooms-media")
      .list("", { limit: 1000 })

    if (listError) {
      console.error("[v0] Cron: Failed to list storage folders:", listError)
    } else if (userFolders) {
      // Filter to only folders (no metadata = folder)
      const userIds = userFolders.filter(f => !f.metadata).map(f => f.name)

      for (const userId of userIds) {
        // Check if this user has a transcriptions folder
        const { data: transcriptionFiles, error: transcriptionError } = await supabase.storage
          .from("heirlooms-media")
          .list(`${userId}/transcriptions`, { limit: 1000 })

        if (transcriptionError) {
          // Folder might not exist, that's fine
          continue
        }

        if (!transcriptionFiles || transcriptionFiles.length === 0) {
          continue
        }

        // Check each transcription file for age
        const filesToDelete: string[] = []

        for (const file of transcriptionFiles) {
          // Skip folders
          if (!file.metadata) continue

          const timestamp = extractTimestampFromFilename(file.name)
          if (!timestamp) {
            // Can't parse timestamp, skip (don't delete unknown files)
            continue
          }

          const age = now - timestamp
          if (age > TRANSCRIPTION_RETENTION_MS) {
            filesToDelete.push(`${userId}/transcriptions/${file.name}`)
          }
        }

        if (filesToDelete.length > 0) {
          console.log(`[v0] Cron: Deleting ${filesToDelete.length} old transcription files for user ${userId}`)

          const { error: deleteError } = await supabase.storage
            .from("heirlooms-media")
            .remove(filesToDelete)

          if (deleteError) {
            console.error(`[v0] Cron: Failed to delete transcriptions for ${userId}:`, deleteError)
            transcriptionsFailed += filesToDelete.length
          } else {
            transcriptionsDeleted += filesToDelete.length
          }
        }
      }
    }

    if (transcriptionsDeleted > 0 || transcriptionsFailed > 0) {
      console.log(`[v0] Cron: Transcription cleanup: ${transcriptionsDeleted} deleted, ${transcriptionsFailed} failed`)
    }

    console.log(`[v0] Cron cleanup complete: ${deletedFromStorage} from storage, ${deletedFromDatabase} from pending_uploads, ${deletedUserMedia} from user_media, ${orphanedTempMediaDeleted} orphaned temp media, ${transcriptionsDeleted} old transcriptions`)

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
        transcriptionsDeleted,
        transcriptionsFailed,
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
