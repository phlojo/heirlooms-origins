import { auditPendingUploads } from "@/lib/actions/pending-uploads"
import { NextResponse } from "next/server"

export const maxDuration = 60 // Maximum allowed for cron jobs

/**
 * Cron job endpoint to audit pending uploads
 * Safe - only reads data and generates reports
 * 
 * To set up in Vercel:
 * 1. Go to your project settings
 * 2. Add a Cron Job with schedule: "0 2 * * *" (daily at 2 AM)
 * 3. Set path: /api/cron/audit-media
 * 4. Optional: Add CRON_SECRET env var for security
 */
export async function GET(request: Request) {
  try {
    // Optional: Verify cron secret for security
    const authHeader = request.headers.get("authorization")
    if (process.env.CRON_SECRET) {
      if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
    }

    console.log("[v0] Starting media audit...")
    const report = await auditPendingUploads()
    console.log("[v0] Media audit complete")

    // Log summary to Vercel logs
    console.log("\n=== MEDIA AUDIT SUMMARY ===")
    console.log(`Total pending uploads: ${report.summary.totalPendingUploads}`)
    console.log(`Expired uploads: ${report.summary.expiredUploads}`)
    console.log(`Safe to delete: ${report.summary.safeToDelete}`)
    console.log(`⚠️  DANGEROUS (used in artifacts): ${report.summary.dangerous}`)
    console.log(`Already deleted: ${report.summary.alreadyDeleted}`)
    console.log("===========================\n")

    if (report.summary.dangerous > 0) {
      console.error("\n🚨 ALERT: Found media marked for cleanup but still in use!")
      report.details.dangerous.forEach(item => {
        console.error(`  - ${item.url}`)
        console.error(`    Used in artifacts: ${item.foundInArtifacts.join(", ")}`)
      })
    }

    // Return full report as JSON (can be viewed in browser or consumed by monitoring)
    return NextResponse.json(report, { 
      status: 200,
      headers: {
        "Content-Type": "application/json",
      }
    })
  } catch (error) {
    console.error("[v0] Media audit failed:", error)
    return NextResponse.json(
      { 
        error: "Audit failed", 
        message: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    )
  }
}
