/**
 * Cleanup Orphaned Media Records
 *
 * This script identifies and optionally removes broken media references from:
 * 1. user_media records where the file no longer exists (404)
 * 2. artifact_media records pointing to non-existent user_media
 * 3. artifacts.media_urls arrays containing broken URLs (legacy)
 * 4. artifacts.thumbnail_url pointing to broken URLs (legacy)
 * 5. artifacts JSONB fields (image_captions, video_summaries, audio_transcripts)
 *
 * Usage:
 *   npx tsx scripts/cleanup-orphaned-media.ts [--dry-run] [--delete]
 *
 * Options:
 *   --dry-run  Only identify orphans, don't delete (default)
 *   --delete   Actually delete orphaned records
 *
 * Requires:
 *   NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars
 */

import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("❌ Missing required environment variables:")
  console.error("   NEXT_PUBLIC_SUPABASE_URL")
  console.error("   SUPABASE_SERVICE_ROLE_KEY")
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// Cache for URL checks to avoid redundant requests
const urlCache = new Map<string, boolean>()

interface UserMedia {
  id: string
  user_id: string
  public_url: string
  filename: string
  created_at: string
}

interface ArtifactMedia {
  id: string
  artifact_id: string
  media_id: string
}

interface LegacyArtifact {
  id: string
  title: string
  media_urls: string[] | null
  thumbnail_url: string | null
  image_captions: Record<string, string> | null
  video_summaries: Record<string, string> | null
  audio_transcripts: Record<string, string> | null
}

interface LegacyArtifactCleanup {
  artifactId: string
  artifactTitle: string
  brokenUrls: string[]
  cleanedMediaUrls: string[]
  cleanedThumbnailUrl: string | null
  cleanedImageCaptions: Record<string, string> | null
  cleanedVideoSummaries: Record<string, string> | null
  cleanedAudioTranscripts: Record<string, string> | null
}

async function checkUrlExists(url: string): Promise<boolean> {
  // Check cache first
  if (urlCache.has(url)) {
    return urlCache.get(url)!
  }

  try {
    const response = await fetch(url, { method: "HEAD" })
    const exists = response.ok
    urlCache.set(url, exists)
    return exists
  } catch {
    urlCache.set(url, false)
    return false
  }
}

async function findOrphanedUserMedia(): Promise<UserMedia[]> {
  console.log("\n🔍 Scanning user_media table for broken URLs...")

  const { data: allMedia, error } = await supabase
    .from("user_media")
    .select("id, user_id, public_url, filename, created_at")
    .order("created_at", { ascending: true })

  if (error) {
    console.error("❌ Failed to fetch user_media:", error.message)
    return []
  }

  if (!allMedia || allMedia.length === 0) {
    console.log("   No user_media records found")
    return []
  }

  console.log(`   Found ${allMedia.length} total user_media records`)
  console.log("   Checking each URL (this may take a while)...\n")

  const orphaned: UserMedia[] = []
  let checked = 0

  for (const media of allMedia) {
    checked++
    const exists = await checkUrlExists(media.public_url)

    if (!exists) {
      orphaned.push(media)
      console.log(`   ❌ [${checked}/${allMedia.length}] 404: ${media.filename}`)
    } else {
      process.stdout.write(`   ✓ [${checked}/${allMedia.length}] OK: ${media.filename}\r`)
    }
  }

  console.log("\n")
  return orphaned
}

async function findOrphanedArtifactMedia(): Promise<ArtifactMedia[]> {
  console.log("🔍 Scanning artifact_media for orphaned links...")

  // Find artifact_media records where the media_id doesn't exist in user_media
  const { data: orphaned, error } = await supabase
    .from("artifact_media")
    .select("id, artifact_id, media_id")
    .not("media_id", "in", supabase.from("user_media").select("id"))

  if (error) {
    // The above query syntax might not work, let's do it manually
    console.log("   Using manual lookup method...")

    const { data: allArtifactMedia } = await supabase
      .from("artifact_media")
      .select("id, artifact_id, media_id")

    const { data: allUserMedia } = await supabase
      .from("user_media")
      .select("id")

    if (!allArtifactMedia || !allUserMedia) {
      console.error("❌ Failed to fetch data for comparison")
      return []
    }

    const validMediaIds = new Set(allUserMedia.map(m => m.id))
    const orphanedLinks = allArtifactMedia.filter(am => !validMediaIds.has(am.media_id))

    console.log(`   Found ${orphanedLinks.length} orphaned artifact_media links`)
    return orphanedLinks
  }

  console.log(`   Found ${orphaned?.length || 0} orphaned artifact_media links`)
  return orphaned || []
}

async function findLegacyArtifactsWithBrokenMedia(): Promise<LegacyArtifactCleanup[]> {
  console.log("\n🔍 Scanning legacy artifacts.media_urls for broken URLs...")

  const { data: artifacts, error } = await supabase
    .from("artifacts")
    .select("id, title, media_urls, thumbnail_url, image_captions, video_summaries, audio_transcripts")
    .not("media_urls", "is", null)

  if (error) {
    console.error("❌ Failed to fetch artifacts:", error.message)
    return []
  }

  if (!artifacts || artifacts.length === 0) {
    console.log("   No artifacts with media_urls found")
    return []
  }

  console.log(`   Found ${artifacts.length} artifacts with media_urls`)

  // Collect all unique URLs first
  const allUrls = new Set<string>()
  for (const artifact of artifacts as LegacyArtifact[]) {
    if (artifact.media_urls) {
      artifact.media_urls.forEach(url => allUrls.add(url))
    }
    if (artifact.thumbnail_url) {
      allUrls.add(artifact.thumbnail_url)
    }
  }

  console.log(`   Checking ${allUrls.size} unique URLs...\n`)

  // Check all URLs
  let checked = 0
  const brokenUrls = new Set<string>()

  for (const url of allUrls) {
    checked++
    const exists = await checkUrlExists(url)

    if (!exists) {
      brokenUrls.add(url)
      console.log(`   ❌ [${checked}/${allUrls.size}] 404: ${url.slice(0, 70)}...`)
    } else {
      process.stdout.write(`   ✓ [${checked}/${allUrls.size}] OK\r`)
    }
  }

  console.log("\n")

  if (brokenUrls.size === 0) {
    console.log("   No broken URLs found in legacy artifacts")
    return []
  }

  // Build cleanup list
  const cleanupList: LegacyArtifactCleanup[] = []

  for (const artifact of artifacts as LegacyArtifact[]) {
    const artifactBrokenUrls: string[] = []

    // Check media_urls
    const cleanedMediaUrls = (artifact.media_urls || []).filter(url => {
      if (brokenUrls.has(url)) {
        artifactBrokenUrls.push(url)
        return false
      }
      return true
    })

    // Check thumbnail_url
    let cleanedThumbnailUrl = artifact.thumbnail_url
    if (artifact.thumbnail_url && brokenUrls.has(artifact.thumbnail_url)) {
      artifactBrokenUrls.push(artifact.thumbnail_url)
      // Set to first valid media URL or null
      cleanedThumbnailUrl = cleanedMediaUrls.length > 0 ? cleanedMediaUrls[0] : null
    }

    // Clean JSONB fields - remove keys that are broken URLs
    let cleanedImageCaptions = artifact.image_captions
    if (artifact.image_captions) {
      cleanedImageCaptions = { ...artifact.image_captions }
      for (const url of Object.keys(cleanedImageCaptions)) {
        if (brokenUrls.has(url)) {
          delete cleanedImageCaptions[url]
        }
      }
    }

    let cleanedVideoSummaries = artifact.video_summaries
    if (artifact.video_summaries) {
      cleanedVideoSummaries = { ...artifact.video_summaries }
      for (const url of Object.keys(cleanedVideoSummaries)) {
        if (brokenUrls.has(url)) {
          delete cleanedVideoSummaries[url]
        }
      }
    }

    let cleanedAudioTranscripts = artifact.audio_transcripts
    if (artifact.audio_transcripts) {
      cleanedAudioTranscripts = { ...artifact.audio_transcripts }
      for (const url of Object.keys(cleanedAudioTranscripts)) {
        if (brokenUrls.has(url)) {
          delete cleanedAudioTranscripts[url]
        }
      }
    }

    if (artifactBrokenUrls.length > 0) {
      cleanupList.push({
        artifactId: artifact.id,
        artifactTitle: artifact.title,
        brokenUrls: artifactBrokenUrls,
        cleanedMediaUrls,
        cleanedThumbnailUrl,
        cleanedImageCaptions,
        cleanedVideoSummaries,
        cleanedAudioTranscripts,
      })
    }
  }

  console.log(`   Found ${cleanupList.length} artifacts with broken media references`)
  return cleanupList
}

async function deleteOrphanedRecords(
  userMediaIds: string[],
  artifactMediaIds: string[]
): Promise<void> {
  console.log("\n🗑️  Deleting orphaned records from new media tables...")

  // Delete artifact_media first (foreign key dependency)
  if (artifactMediaIds.length > 0) {
    const { error: amError } = await supabase
      .from("artifact_media")
      .delete()
      .in("id", artifactMediaIds)

    if (amError) {
      console.error(`   ❌ Failed to delete artifact_media: ${amError.message}`)
    } else {
      console.log(`   ✓ Deleted ${artifactMediaIds.length} artifact_media records`)
    }
  }

  // Delete user_media
  if (userMediaIds.length > 0) {
    const { error: umError } = await supabase
      .from("user_media")
      .delete()
      .in("id", userMediaIds)

    if (umError) {
      console.error(`   ❌ Failed to delete user_media: ${umError.message}`)
    } else {
      console.log(`   ✓ Deleted ${userMediaIds.length} user_media records`)
    }
  }
}

async function cleanupLegacyArtifacts(cleanupList: LegacyArtifactCleanup[]): Promise<void> {
  console.log("\n🗑️  Cleaning up legacy artifact media references...")

  let updated = 0
  let failed = 0

  for (const item of cleanupList) {
    const { error } = await supabase
      .from("artifacts")
      .update({
        media_urls: item.cleanedMediaUrls,
        thumbnail_url: item.cleanedThumbnailUrl,
        image_captions: item.cleanedImageCaptions,
        video_summaries: item.cleanedVideoSummaries,
        audio_transcripts: item.cleanedAudioTranscripts,
      })
      .eq("id", item.artifactId)

    if (error) {
      console.error(`   ❌ Failed to update "${item.artifactTitle}": ${error.message}`)
      failed++
    } else {
      console.log(`   ✓ Cleaned "${item.artifactTitle}" (removed ${item.brokenUrls.length} broken URLs)`)
      updated++
    }
  }

  console.log(`\n   Updated: ${updated}, Failed: ${failed}`)
}

async function main() {
  const args = process.argv.slice(2)
  const shouldDelete = args.includes("--delete")
  const isDryRun = !shouldDelete || args.includes("--dry-run")

  console.log("╔════════════════════════════════════════════════════════════╗")
  console.log("║           Orphaned Media Cleanup Script                    ║")
  console.log("╚════════════════════════════════════════════════════════════╝")
  console.log(`\nMode: ${isDryRun ? "🔍 DRY RUN (no changes will be made)" : "⚠️  DELETE MODE"}`)

  // =========================================================================
  // NEW MEDIA TABLES (user_media, artifact_media)
  // =========================================================================

  // Find orphaned user_media (broken URLs)
  const orphanedUserMedia = await findOrphanedUserMedia()

  // Find orphaned artifact_media (missing user_media references)
  const orphanedArtifactMedia = await findOrphanedArtifactMedia()

  // Also find artifact_media pointing to the broken user_media we found
  const orphanedUserMediaIds = new Set(orphanedUserMedia.map(m => m.id))
  let linkedArtifactMedia: ArtifactMedia[] = []

  if (orphanedUserMediaIds.size > 0) {
    const { data } = await supabase
      .from("artifact_media")
      .select("id, artifact_id, media_id")
      .in("media_id", Array.from(orphanedUserMediaIds))

    linkedArtifactMedia = data || []
  }

  const allOrphanedArtifactMedia = [
    ...orphanedArtifactMedia,
    ...linkedArtifactMedia
  ]

  // Deduplicate
  const uniqueArtifactMediaIds = [...new Set(allOrphanedArtifactMedia.map(am => am.id))]

  // =========================================================================
  // LEGACY ARTIFACTS TABLE (media_urls array, thumbnail_url, JSONB fields)
  // =========================================================================

  const legacyCleanupList = await findLegacyArtifactsWithBrokenMedia()

  // =========================================================================
  // SUMMARY
  // =========================================================================

  console.log("\n" + "═".repeat(60))
  console.log("📊 SUMMARY")
  console.log("═".repeat(60))

  console.log("\n   NEW MEDIA TABLES:")
  console.log(`     Orphaned user_media (404 URLs):     ${orphanedUserMedia.length}`)
  console.log(`     Orphaned artifact_media links:      ${uniqueArtifactMediaIds.length}`)

  console.log("\n   LEGACY ARTIFACTS TABLE:")
  console.log(`     Artifacts with broken media:        ${legacyCleanupList.length}`)

  const totalBrokenLegacyUrls = legacyCleanupList.reduce((sum, item) => sum + item.brokenUrls.length, 0)
  console.log(`     Total broken URLs in artifacts:     ${totalBrokenLegacyUrls}`)

  // Show details
  if (orphanedUserMedia.length > 0) {
    console.log("\n   Broken user_media records:")
    for (const media of orphanedUserMedia.slice(0, 10)) {
      console.log(`     - ${media.filename} (${media.id.slice(0, 8)}...)`)
    }
    if (orphanedUserMedia.length > 10) {
      console.log(`     ... and ${orphanedUserMedia.length - 10} more`)
    }
  }

  if (legacyCleanupList.length > 0) {
    console.log("\n   Artifacts with broken media_urls:")
    for (const item of legacyCleanupList.slice(0, 10)) {
      console.log(`     - "${item.artifactTitle}" (${item.brokenUrls.length} broken URLs)`)
    }
    if (legacyCleanupList.length > 10) {
      console.log(`     ... and ${legacyCleanupList.length - 10} more`)
    }
  }

  const hasOrphans =
    orphanedUserMedia.length > 0 ||
    uniqueArtifactMediaIds.length > 0 ||
    legacyCleanupList.length > 0

  if (!hasOrphans) {
    console.log("\n✅ No orphaned records found! Database is clean.")
    return
  }

  if (isDryRun) {
    console.log("\n" + "─".repeat(60))
    console.log("ℹ️  This was a dry run. To actually clean up these records, run:")
    console.log("   npx tsx scripts/cleanup-orphaned-media.ts --delete")
    console.log("─".repeat(60))
  } else {
    console.log("\n⚠️  Proceeding with cleanup in 5 seconds... (Ctrl+C to cancel)")
    await new Promise(resolve => setTimeout(resolve, 5000))

    // Clean new media tables
    if (orphanedUserMedia.length > 0 || uniqueArtifactMediaIds.length > 0) {
      await deleteOrphanedRecords(
        orphanedUserMedia.map(m => m.id),
        uniqueArtifactMediaIds
      )
    }

    // Clean legacy artifacts
    if (legacyCleanupList.length > 0) {
      await cleanupLegacyArtifacts(legacyCleanupList)
    }

    console.log("\n✅ Cleanup complete!")
  }
}

main().catch(console.error)
