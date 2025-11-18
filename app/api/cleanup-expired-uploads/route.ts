import { cleanupExpiredUploads } from "@/lib/actions/pending-uploads"
import { NextResponse } from "next/server"

/**
 * Cron endpoint to clean up expired uploads
 * Configure in vercel.json to run hourly or as needed
 */
export async function GET(request: Request) {
  // Verify cron secret to prevent unauthorized calls
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
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
