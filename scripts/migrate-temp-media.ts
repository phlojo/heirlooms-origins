/**
 * Migrate Media from Temp Folder Script
 *
 * Finds artifacts with media still in the temp folder and moves them to the proper
 * artifact folder structure. This fixes the issue where updateArtifact() was not
 * calling reorganizeArtifactMedia().
 *
 * Bug Reference: UB-251129-01
 *
 * Usage:
 *   pnpm tsx scripts/migrate-temp-media.ts              # Dry run (preview only)
 *   pnpm tsx scripts/migrate-temp-media.ts --migrate    # Actually migrate files
 */

import { createClient } from "@supabase/supabase-js"

// Load environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const STORAGE_BUCKET = "heirlooms-media"

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ Missing Supabase environment variables")
  console.error("   Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY")
  process.exit(1)
}

// Create Supabase client with service role key (bypasses RLS)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

interface ArtifactWithTempMedia {
  id: string
  user_id: string
  title: string
  slug: string
  media_urls: string[]
  thumbnail_url: string | null
  image_captions: Record<string, string> | null
  video_summaries: Record<string, string> | null
  audio_transcripts: Record<string, string> | null
  tempUrls: string[]
}

/**
 * Check if a URL is in the temp folder
 */
function isTempUrl(url: string): boolean {
  if (!url.includes("supabase")) return false
  // Check for /temp/ in the path
  return url.includes("/temp/")
}

/**
 * Extract file path from Supabase Storage public URL
 */
function extractPathFromUrl(url: string): string | null {
  try {
    // Format: https://{project}.supabase.co/storage/v1/object/public/{bucket}/{path}
    const match = url.match(/\/public\/[^/]+\/(.+)$/)
    return match ? match[1] : null
  } catch {
    return null
  }
}

/**
 * Get public URL from file path
 */
function getPublicUrl(path: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${path}`
}

/**
 * Find all artifacts with media in temp folder
 */
async function findArtifactsWithTempMedia(): Promise<ArtifactWithTempMedia[]> {
  console.log("📊 Scanning artifacts for temp folder media...")

  const { data: artifacts, error } = await supabase
    .from("artifacts")
    .select("id, user_id, title, slug, media_urls, thumbnail_url, image_captions, video_summaries, audio_transcripts")

  if (error) {
    throw new Error(`Failed to fetch artifacts: ${error.message}`)
  }

  const affectedArtifacts: ArtifactWithTempMedia[] = []

  for (const artifact of artifacts || []) {
    const tempUrls: string[] = []

    // Check media_urls
    if (artifact.media_urls && Array.isArray(artifact.media_urls)) {
      for (const url of artifact.media_urls) {
        if (isTempUrl(url)) {
          tempUrls.push(url)
        }
      }
    }

    // Check thumbnail_url
    if (artifact.thumbnail_url && isTempUrl(artifact.thumbnail_url)) {
      if (!tempUrls.includes(artifact.thumbnail_url)) {
        tempUrls.push(artifact.thumbnail_url)
      }
    }

    if (tempUrls.length > 0) {
      affectedArtifacts.push({
        ...artifact,
        tempUrls,
      })
    }
  }

  return affectedArtifacts
}

/**
 * Migrate a single artifact's media from temp to artifact folder
 */
async function migrateArtifactMedia(
  artifact: ArtifactWithTempMedia,
  dryRun: boolean
): Promise<{ success: boolean; movedCount: number; errors: string[] }> {
  const errors: string[] = []
  const urlMapping = new Map<string, string>() // old URL -> new URL
  let movedCount = 0

  console.log(`\n  Processing: ${artifact.title} (${artifact.tempUrls.length} temp files)`)

  for (const tempUrl of artifact.tempUrls) {
    const currentPath = extractPathFromUrl(tempUrl)
    if (!currentPath) {
      errors.push(`Invalid URL: ${tempUrl}`)
      continue
    }

    // Generate new path: userId/artifactId/filename
    const filename = currentPath.split("/").pop()
    const newPath = `${artifact.user_id}/${artifact.id}/${filename}`
    const newUrl = getPublicUrl(newPath)

    if (dryRun) {
      console.log(`    Would move: ${currentPath}`)
      console.log(`            to: ${newPath}`)
      urlMapping.set(tempUrl, newUrl)
      movedCount++
      continue
    }

    // Actually move the file
    try {
      // Copy to new location
      const { error: copyError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .copy(currentPath, newPath)

      if (copyError) {
        // Check if it's because file already exists at destination
        if (copyError.message?.includes("already exists")) {
          console.log(`    Skipped (already exists): ${newPath}`)
          urlMapping.set(tempUrl, newUrl)
          movedCount++
        } else {
          errors.push(`Failed to copy ${currentPath}: ${copyError.message}`)
        }
        continue
      }

      // Delete from temp
      const { error: deleteError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .remove([currentPath])

      if (deleteError) {
        console.log(`    Warning: Copied but failed to delete original: ${currentPath}`)
        // Don't fail - file was copied successfully
      }

      console.log(`    Moved: ${filename}`)
      urlMapping.set(tempUrl, newUrl)
      movedCount++
    } catch (error) {
      errors.push(`Exception moving ${currentPath}: ${error}`)
    }
  }

  // Update artifact with new URLs
  if (movedCount > 0 && !dryRun) {
    // Update media_urls array
    const updatedMediaUrls = (artifact.media_urls || []).map(
      (url) => urlMapping.get(url) || url
    )

    // Update thumbnail_url
    const updatedThumbnailUrl = artifact.thumbnail_url
      ? urlMapping.get(artifact.thumbnail_url) || artifact.thumbnail_url
      : null

    // Update AI metadata keys
    const updatedImageCaptions: Record<string, string> = {}
    if (artifact.image_captions) {
      for (const [oldUrl, caption] of Object.entries(artifact.image_captions)) {
        const newUrl = urlMapping.get(oldUrl) || oldUrl
        updatedImageCaptions[newUrl] = caption
      }
    }

    const updatedVideoSummaries: Record<string, string> = {}
    if (artifact.video_summaries) {
      for (const [oldUrl, summary] of Object.entries(artifact.video_summaries)) {
        const newUrl = urlMapping.get(oldUrl) || oldUrl
        updatedVideoSummaries[newUrl] = summary
      }
    }

    const updatedAudioTranscripts: Record<string, string> = {}
    if (artifact.audio_transcripts) {
      for (const [oldUrl, transcript] of Object.entries(artifact.audio_transcripts)) {
        const newUrl = urlMapping.get(oldUrl) || oldUrl
        updatedAudioTranscripts[newUrl] = transcript
      }
    }

    // Update the artifact record
    const { error: updateError } = await supabase
      .from("artifacts")
      .update({
        media_urls: updatedMediaUrls,
        thumbnail_url: updatedThumbnailUrl,
        image_captions: Object.keys(updatedImageCaptions).length > 0 ? updatedImageCaptions : null,
        video_summaries: Object.keys(updatedVideoSummaries).length > 0 ? updatedVideoSummaries : null,
        audio_transcripts: Object.keys(updatedAudioTranscripts).length > 0 ? updatedAudioTranscripts : null,
      })
      .eq("id", artifact.id)

    if (updateError) {
      errors.push(`Failed to update artifact record: ${updateError.message}`)
    } else {
      console.log(`    Updated artifact record with new URLs`)
    }

    // Also update user_media records
    for (const [oldUrl, newUrl] of urlMapping) {
      const { error: userMediaError } = await supabase
        .from("user_media")
        .update({
          public_url: newUrl,
          storage_path: newUrl,
        })
        .eq("public_url", oldUrl)
        .eq("user_id", artifact.user_id)

      if (userMediaError) {
        // Non-fatal - user_media record might not exist for older artifacts
        console.log(`    Note: Could not update user_media for ${oldUrl}`)
      }
    }
  }

  return { success: errors.length === 0, movedCount, errors }
}

/**
 * Main migration function
 */
async function migrateTempMedia(shouldMigrate: boolean) {
  console.log("\n🔄 Temp Media Migration Script")
  console.log("================================\n")
  console.log(`Mode: ${shouldMigrate ? "🚀 MIGRATE" : "👀 DRY RUN (preview only)"}`)
  console.log(`Bug Reference: UB-251129-01\n`)

  try {
    const affectedArtifacts = await findArtifactsWithTempMedia()

    if (affectedArtifacts.length === 0) {
      console.log("\n✨ No artifacts found with temp folder media! Everything is properly organized.")
      return
    }

    // Calculate totals
    const totalTempFiles = affectedArtifacts.reduce((sum, a) => sum + a.tempUrls.length, 0)

    console.log(`\n📋 Found ${affectedArtifacts.length} artifacts with ${totalTempFiles} temp folder files:\n`)

    for (const artifact of affectedArtifacts) {
      console.log(`  - "${artifact.title}" (${artifact.tempUrls.length} files)`)
      console.log(`    Artifact ID: ${artifact.id}`)
      console.log(`    User ID: ${artifact.user_id}`)
    }

    if (!shouldMigrate) {
      console.log("\n💡 To actually migrate these files, run:")
      console.log("   pnpm tsx scripts/migrate-temp-media.ts --migrate")
      return
    }

    // Confirm migration
    console.log("\n⚠️  WARNING: This will move files and update database records!")
    console.log("Press Ctrl+C to cancel, or wait 5 seconds to continue...")

    await new Promise((resolve) => setTimeout(resolve, 5000))

    console.log("\n🚀 Starting migration...")

    let totalMoved = 0
    let totalErrors = 0
    const failedArtifacts: string[] = []

    for (const artifact of affectedArtifacts) {
      const result = await migrateArtifactMedia(artifact, false)
      totalMoved += result.movedCount

      if (!result.success) {
        totalErrors += result.errors.length
        failedArtifacts.push(artifact.title)
        console.log(`    ⚠️  Errors: ${result.errors.join(", ")}`)
      }
    }

    console.log("\n✅ Migration complete!")
    console.log(`  Artifacts processed: ${affectedArtifacts.length}`)
    console.log(`  Files moved: ${totalMoved}`)
    console.log(`  Errors: ${totalErrors}`)

    if (failedArtifacts.length > 0) {
      console.log(`\n⚠️  Artifacts with errors:`)
      failedArtifacts.forEach((title) => console.log(`  - ${title}`))
    }
  } catch (error) {
    console.error("\n❌ Script failed:", error)
    process.exit(1)
  }
}

// Parse command line arguments
const shouldMigrate = process.argv.includes("--migrate")

// Run the script
migrateTempMedia(shouldMigrate)
  .then(() => {
    console.log("\n✨ Done!")
    process.exit(0)
  })
  .catch((error) => {
    console.error("\n❌ Fatal error:", error)
    process.exit(1)
  })
