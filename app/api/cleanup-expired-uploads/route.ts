import { auditPendingUploads } from "@/lib/actions/pending-uploads"
import { deleteCloudinaryMedia } from "@/lib/actions/cloudinary"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

/**
 * Cron endpoint to clean up expired uploads
 * Configure in vercel.json to run daily at midnight UTC (0 0 * * *)
 * Vercel automatically authenticates cron requests via x-vercel-cron header
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
    let deletedFromCloudinary = 0
    let deletedFromDatabase = 0
    const failedDeletions: string[] = []

    // Clean up files that are safe to delete (expired and not in use)
    for (const upload of audit.details.safeToDelete) {
      const result = await deleteCloudinaryMedia(upload.publicId, 'image')

      if (!result.error) {
        deletedFromCloudinary++
      } else {
        failedDeletions.push(upload.url)
      }
    }

    // Clean up already-deleted files (remove database entries)
    if (audit.details.alreadyDeleted.length > 0) {
      const alreadyDeletedIds = audit.details.alreadyDeleted.map(u => u.publicId)
      const { error: deleteError } = await supabase
        .from("pending_uploads")
        .delete()
        .in("cloudinary_public_id", alreadyDeletedIds)

      if (!deleteError) {
        deletedFromDatabase += audit.details.alreadyDeleted.length
      }
    }

    // Remove from database those we successfully deleted from Cloudinary
    if (deletedFromCloudinary > 0) {
      const successfulPublicIds = audit.details.safeToDelete
        .slice(0, deletedFromCloudinary)
        .map(u => u.publicId)

      const { error: dbDeleteError } = await supabase
        .from("pending_uploads")
        .delete()
        .in("cloudinary_public_id", successfulPublicIds)

      if (!dbDeleteError) {
        deletedFromDatabase += deletedFromCloudinary
      }
    }

    console.log(`[v0] Cleanup complete: ${deletedFromCloudinary} from Cloudinary, ${deletedFromDatabase} from database`)

    return NextResponse.json({
      success: true,
      audit: {
        totalPending: audit.summary.totalPendingUploads,
        expiredCount: audit.summary.expiredUploads,
      },
      cleanup: {
        deletedFromCloudinary,
        deletedFromDatabase,
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
