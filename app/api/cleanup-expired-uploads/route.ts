import { cleanupExpiredUploads } from "@/lib/actions/pending-uploads"
import { NextResponse } from "next/server"

/**
 * Cron endpoint to clean up expired uploads
 * Configure in vercel.json to run hourly
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

  const result = await cleanupExpiredUploads()
  
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  return NextResponse.json({ 
    success: true, 
    deletedCount: result.deletedCount 
  })
}
