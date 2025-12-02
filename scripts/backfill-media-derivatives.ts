/**
 * Backfill Media Derivatives for Pre-Phase-1 Artifacts
 *
 * This script finds artifacts that have Cloudinary URLs but no media_derivatives,
 * and generates the derivative URL mappings so they use the controlled derivative system.
 *
 * For Supabase Storage URLs, derivatives are generated on-demand via Cloudinary fetch,
 * so they don't need stored derivatives. This script is only for legacy Cloudinary artifacts
 * that haven't been migrated to Supabase yet.
 *
 * Usage:
 *   pnpm tsx scripts/backfill-media-derivatives.ts              # Dry run
 *   pnpm tsx scripts/backfill-media-derivatives.ts --backfill   # Execute
 *   pnpm tsx scripts/backfill-media-derivatives.ts --backfill --limit=10
 */

import { createClient } from "@supabase/supabase-js"

// Load environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ Missing Supabase environment variables")
  process.exit(1)
}

if (!CLOUDINARY_CLOUD_NAME) {
  console.error("❌ Missing NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME")
  process.exit(1)
}

// Create Supabase client with service role key (bypasses RLS)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

interface ArtifactToBackfill {
  id: string
  title: string
  media_urls: string[]
  media_derivatives: Record<string, { thumb: string; medium: string; large: string }> | null
}

/**
 * Check if a URL is from Cloudinary
 */
function isCloudinaryUrl(url: string): boolean {
  return url.includes("cloudinary.com")
}

/**
 * Check if a URL is an image (for derivative generation)
 */
function isImageUrl(url: string): boolean {
  const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".heic", ".heif"]
  const lowerUrl = url.toLowerCase()
  return imageExtensions.some(ext => lowerUrl.includes(ext)) || url.includes("/image/upload/")
}

/**
 * Check if a URL is a video
 */
function isVideoUrl(url: string): boolean {
  const videoExtensions = [".mp4", ".mov", ".avi", ".mkv", ".m4v", ".flv", ".wmv", ".webm"]
  const lowerUrl = url.toLowerCase()
  return videoExtensions.some(ext => lowerUrl.includes(ext)) || url.includes("/video/upload/")
}

/**
 * Generate Cloudinary derivative URL with transformations
 */
function getCloudinaryTransformUrl(url: string, transformations: string): string {
  // Handle existing transformation URLs - replace transformations
  if (url.includes("/upload/")) {
    // Check if there are already transformations
    const uploadIndex = url.indexOf("/upload/")
    const afterUpload = url.substring(uploadIndex + 8)

    // If starts with v followed by numbers, no transformations
    if (/^v\d+\//.test(afterUpload)) {
      // Insert transformations after /upload/
      return url.replace("/upload/", `/upload/${transformations}/`)
    }

    // Has transformations - replace them
    const versionMatch = afterUpload.match(/^(.+?)(v\d+\/.+)$/)
    if (versionMatch) {
      return url.replace(`/upload/${versionMatch[1]}`, `/upload/${transformations}/`)
    }

    // Fallback - just insert transformations
    return url.replace("/upload/", `/upload/${transformations}/`)
  }

  return url
}

/**
 * Generate derivative URLs for a media item
 */
function generateDerivatives(
  url: string
): { thumb: string; medium: string; large: string } | null {
  if (!isCloudinaryUrl(url)) {
    return null // Only generate for Cloudinary URLs
  }

  const isVideo = isVideoUrl(url)

  // Transformation presets (matching lib/cloudinary.ts)
  const thumbTransform = isVideo
    ? "w_400,h_400,c_fill,so_1.0,du_0,f_jpg,q_auto"  // Video poster frame
    : "w_400,h_400,c_fill,q_auto,f_auto"

  const mediumTransform = "w_1024,c_limit,q_auto,f_auto"
  const largeTransform = "w_1600,c_limit,q_auto,f_auto"

  return {
    thumb: getCloudinaryTransformUrl(url, thumbTransform),
    medium: getCloudinaryTransformUrl(url, mediumTransform),
    large: getCloudinaryTransformUrl(url, largeTransform),
  }
}

/**
 * Find artifacts that need derivative backfill
 */
async function findArtifactsToBackfill(): Promise<ArtifactToBackfill[]> {
  console.log("📊 Finding artifacts without media_derivatives...")

  const { data: artifacts, error } = await supabase
    .from("artifacts")
    .select("id, title, media_urls, media_derivatives")

  if (error) {
    throw new Error(`Failed to fetch artifacts: ${error.message}`)
  }

  // Filter to artifacts with Cloudinary URLs but no/incomplete derivatives
  const toBackfill: ArtifactToBackfill[] = []

  for (const artifact of artifacts || []) {
    const cloudinaryUrls = (artifact.media_urls || []).filter(isCloudinaryUrl)

    if (cloudinaryUrls.length === 0) {
      continue // No Cloudinary URLs to process
    }

    // Check if derivatives exist for all Cloudinary URLs
    const derivatives = artifact.media_derivatives || {}
    const missingDerivatives = cloudinaryUrls.filter(url => !derivatives[url])

    if (missingDerivatives.length > 0) {
      toBackfill.push(artifact as ArtifactToBackfill)
    }
  }

  console.log(`✅ Found ${toBackfill.length} artifacts needing derivative backfill`)
  return toBackfill
}

/**
 * Backfill derivatives for a single artifact
 */
async function backfillArtifact(
  artifact: ArtifactToBackfill,
  dryRun: boolean
): Promise<{ success: boolean; count: number; error?: string }> {
  const cloudinaryUrls = (artifact.media_urls || []).filter(isCloudinaryUrl)
  const existingDerivatives = artifact.media_derivatives || {}

  // Generate derivatives for URLs that don't have them
  const newDerivatives: Record<string, { thumb: string; medium: string; large: string }> = {
    ...existingDerivatives,
  }

  let addedCount = 0

  for (const url of cloudinaryUrls) {
    if (newDerivatives[url]) {
      continue // Already has derivatives
    }

    const derivatives = generateDerivatives(url)
    if (derivatives) {
      newDerivatives[url] = derivatives
      addedCount++
    }
  }

  if (addedCount === 0) {
    return { success: true, count: 0 }
  }

  if (dryRun) {
    console.log(`    Would add ${addedCount} derivative mappings`)
    return { success: true, count: addedCount }
  }

  // Update database
  const { error } = await supabase
    .from("artifacts")
    .update({ media_derivatives: newDerivatives })
    .eq("id", artifact.id)

  if (error) {
    return { success: false, count: 0, error: error.message }
  }

  console.log(`    ✅ Added ${addedCount} derivative mappings`)
  return { success: true, count: addedCount }
}

/**
 * Main backfill function
 */
async function backfillMediaDerivatives(shouldBackfill: boolean, limit?: number) {
  console.log("\n🔧 Media Derivatives Backfill Script")
  console.log("======================================\n")
  console.log(`Mode: ${shouldBackfill ? "🚀 BACKFILL" : "👀 DRY RUN (preview only)"}`)
  if (limit) console.log(`Limit: ${limit} artifacts`)
  console.log()

  try {
    // Find artifacts to backfill
    let artifacts = await findArtifactsToBackfill()

    if (artifacts.length === 0) {
      console.log("\n✨ All artifacts already have media_derivatives!")
      return
    }

    // Apply limit
    if (limit && limit < artifacts.length) {
      console.log(`\n📋 Limiting to first ${limit} of ${artifacts.length} artifacts`)
      artifacts = artifacts.slice(0, limit)
    }

    // Count total URLs needing derivatives
    let totalMissing = 0
    for (const artifact of artifacts) {
      const cloudinaryUrls = (artifact.media_urls || []).filter(isCloudinaryUrl)
      const existing = artifact.media_derivatives || {}
      totalMissing += cloudinaryUrls.filter(url => !existing[url]).length
    }

    console.log(`\n📊 Backfill scope:`)
    console.log(`  - Artifacts: ${artifacts.length}`)
    console.log(`  - Missing derivative mappings: ${totalMissing}`)

    if (!shouldBackfill) {
      console.log("\n💡 To execute this backfill, run:")
      console.log("   pnpm tsx scripts/backfill-media-derivatives.ts --backfill")

      // Show preview
      console.log("\n📋 Artifacts to backfill:")
      for (const artifact of artifacts.slice(0, 10)) {
        const cloudinaryUrls = (artifact.media_urls || []).filter(isCloudinaryUrl)
        const existing = artifact.media_derivatives || {}
        const missing = cloudinaryUrls.filter(url => !existing[url]).length
        console.log(`  - "${artifact.title}" (${missing} missing)`)
      }
      if (artifacts.length > 10) {
        console.log(`  ... and ${artifacts.length - 10} more`)
      }

      return
    }

    console.log("\n🚀 Starting backfill...\n")

    let successCount = 0
    let errorCount = 0
    let totalAdded = 0

    for (const artifact of artifacts) {
      console.log(`  📦 "${artifact.title}"`)
      const result = await backfillArtifact(artifact, false)

      if (result.success) {
        successCount++
        totalAdded += result.count
      } else {
        errorCount++
        console.log(`    ❌ Error: ${result.error}`)
      }
    }

    console.log("\n" + "=".repeat(50))
    console.log("✅ Backfill complete!")
    console.log("=".repeat(50))
    console.log(`  Artifacts processed: ${artifacts.length}`)
    console.log(`  Successful: ${successCount}`)
    console.log(`  Errors: ${errorCount}`)
    console.log(`  Derivative mappings added: ${totalAdded}`)

  } catch (error) {
    console.error("\n❌ Script failed:", error)
    process.exit(1)
  }
}

// Parse command line arguments
const shouldBackfill = process.argv.includes("--backfill")
const limitArg = process.argv.find(arg => arg.startsWith("--limit="))
const limit = limitArg ? parseInt(limitArg.split("=")[1]) : undefined

// Run the script
backfillMediaDerivatives(shouldBackfill, limit)
  .then(() => {
    console.log("\n✨ Done!")
    process.exit(0)
  })
  .catch((error) => {
    console.error("\n❌ Fatal error:", error)
    process.exit(1)
  })
