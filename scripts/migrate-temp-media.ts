/**
 * Migrate Media from Temp Folder Script
 *
 * Finds all media (both in artifacts.media_urls AND user_media for gallery)
 * that is still in the temp folder and moves them to the proper artifact folder.
 *
 * This fixes the issue where updateArtifact() was not calling reorganizeArtifactMedia().
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

interface TempMediaItem {
  userMediaId: string
  userId: string
  artifactId: string
  artifactTitle: string
  tempUrl: string
  source: "gallery" | "media_blocks" | "thumbnail"
}

/**
 * Check if a URL is in the temp folder
 */
function isTempUrl(url: string): boolean {
  if (!url || !url.includes("supabase")) return false
  return url.includes("/temp/")
}

/**
 * Extract file path from Supabase Storage public URL
 */
function extractPathFromUrl(url: string): string | null {
  try {
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
 * Find all user_media with temp URLs that are linked to artifacts via artifact_media
 */
async function findTempGalleryMedia(): Promise<TempMediaItem[]> {
  console.log("📊 Scanning gallery media (artifact_media + user_media)...")

  const { data: links, error } = await supabase
    .from("artifact_media")
    .select(`
      artifact_id,
      user_media!inner(id, user_id, public_url),
      artifacts!inner(title)
    `)

  if (error) {
    throw new Error(`Failed to fetch artifact_media: ${error.message}`)
  }

  const tempItems: TempMediaItem[] = []

  for (const link of links || []) {
    const userMedia = link.user_media as any
    const artifact = link.artifacts as any

    if (userMedia && isTempUrl(userMedia.public_url)) {
      tempItems.push({
        userMediaId: userMedia.id,
        userId: userMedia.user_id,
        artifactId: link.artifact_id,
        artifactTitle: artifact?.title || "Unknown",
        tempUrl: userMedia.public_url,
        source: "gallery",
      })
    }
  }

  return tempItems
}

/**
 * Find all artifacts with temp URLs in media_urls or thumbnail_url
 */
async function findTempArtifactMedia(): Promise<TempMediaItem[]> {
  console.log("📊 Scanning artifact media_urls and thumbnails...")

  const { data: artifacts, error } = await supabase
    .from("artifacts")
    .select("id, user_id, title, media_urls, thumbnail_url")

  if (error) {
    throw new Error(`Failed to fetch artifacts: ${error.message}`)
  }

  const tempItems: TempMediaItem[] = []
  const seenUrls = new Set<string>()

  for (const artifact of artifacts || []) {
    // Check media_urls
    if (artifact.media_urls && Array.isArray(artifact.media_urls)) {
      for (const url of artifact.media_urls) {
        if (isTempUrl(url) && !seenUrls.has(url)) {
          seenUrls.add(url)
          tempItems.push({
            userMediaId: "", // Will look up
            userId: artifact.user_id,
            artifactId: artifact.id,
            artifactTitle: artifact.title,
            tempUrl: url,
            source: "media_blocks",
          })
        }
      }
    }

    // Check thumbnail_url
    if (artifact.thumbnail_url && isTempUrl(artifact.thumbnail_url) && !seenUrls.has(artifact.thumbnail_url)) {
      seenUrls.add(artifact.thumbnail_url)
      tempItems.push({
        userMediaId: "",
        userId: artifact.user_id,
        artifactId: artifact.id,
        artifactTitle: artifact.title,
        tempUrl: artifact.thumbnail_url,
        source: "thumbnail",
      })
    }
  }

  return tempItems
}

/**
 * Move a file and update all references
 */
async function migrateFile(
  item: TempMediaItem,
  dryRun: boolean
): Promise<{ success: boolean; newUrl?: string; error?: string }> {
  const currentPath = extractPathFromUrl(item.tempUrl)
  if (!currentPath) {
    return { success: false, error: "Invalid URL format" }
  }

  // Generate new path
  const filename = currentPath.split("/").pop()
  const newPath = `${item.userId}/${item.artifactId}/${filename}`
  const newUrl = getPublicUrl(newPath)

  if (dryRun) {
    console.log(`    Would move: ${currentPath}`)
    console.log(`            to: ${newPath}`)
    return { success: true, newUrl }
  }

  try {
    // Copy to new location
    const { error: copyError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .copy(currentPath, newPath)

    if (copyError) {
      if (copyError.message?.includes("already exists")) {
        console.log(`    Skipped (already exists): ${filename}`)
      } else {
        return { success: false, error: `Copy failed: ${copyError.message}` }
      }
    } else {
      // Delete from temp
      await supabase.storage.from(STORAGE_BUCKET).remove([currentPath])
      console.log(`    Moved: ${filename}`)
    }

    // Update user_media record
    const { error: updateError } = await supabase
      .from("user_media")
      .update({
        public_url: newUrl,
        storage_path: newUrl,
      })
      .eq("public_url", item.tempUrl)

    if (updateError) {
      console.log(`    Warning: Could not update user_media: ${updateError.message}`)
    }

    // Update artifacts.media_urls if this was from media_blocks
    if (item.source === "media_blocks") {
      const { data: artifact } = await supabase
        .from("artifacts")
        .select("media_urls")
        .eq("id", item.artifactId)
        .single()

      if (artifact?.media_urls) {
        const updatedUrls = artifact.media_urls.map((url: string) =>
          url === item.tempUrl ? newUrl : url
        )
        await supabase
          .from("artifacts")
          .update({ media_urls: updatedUrls })
          .eq("id", item.artifactId)
      }
    }

    // Update artifacts.thumbnail_url if needed
    if (item.source === "thumbnail") {
      await supabase
        .from("artifacts")
        .update({ thumbnail_url: newUrl })
        .eq("id", item.artifactId)
        .eq("thumbnail_url", item.tempUrl)
    }

    // Also check and update thumbnail_url even for gallery items
    await supabase
      .from("artifacts")
      .update({ thumbnail_url: newUrl })
      .eq("id", item.artifactId)
      .eq("thumbnail_url", item.tempUrl)

    return { success: true, newUrl }
  } catch (error) {
    return { success: false, error: `Exception: ${error}` }
  }
}

/**
 * Main migration function
 */
async function migrateTempMedia(shouldMigrate: boolean) {
  console.log("\n🔄 Temp Media Migration Script (v2 - Gallery + Media Blocks)")
  console.log("=============================================================\n")
  console.log(`Mode: ${shouldMigrate ? "🚀 MIGRATE" : "👀 DRY RUN (preview only)"}`)
  console.log(`Bug Reference: UB-251129-01\n`)

  try {
    // Find all temp media from both sources
    const [galleryItems, artifactItems] = await Promise.all([
      findTempGalleryMedia(),
      findTempArtifactMedia(),
    ])

    // Dedupe by URL
    const allItems = new Map<string, TempMediaItem>()
    for (const item of [...galleryItems, ...artifactItems]) {
      if (!allItems.has(item.tempUrl)) {
        allItems.set(item.tempUrl, item)
      }
    }

    const items = Array.from(allItems.values())

    if (items.length === 0) {
      console.log("\n✨ No temp folder media found! Everything is properly organized.")
      return
    }

    // Group by artifact for display
    const byArtifact = new Map<string, TempMediaItem[]>()
    for (const item of items) {
      const key = `${item.artifactId}|${item.artifactTitle}`
      if (!byArtifact.has(key)) {
        byArtifact.set(key, [])
      }
      byArtifact.get(key)!.push(item)
    }

    console.log(`\n📋 Found ${items.length} temp folder files in ${byArtifact.size} artifacts:\n`)

    for (const [key, artifactItems] of byArtifact) {
      const [id, title] = key.split("|")
      const galleryCt = artifactItems.filter((i) => i.source === "gallery").length
      const blocksCt = artifactItems.filter((i) => i.source === "media_blocks").length
      const thumbCt = artifactItems.filter((i) => i.source === "thumbnail").length

      console.log(`  - "${title}" (${artifactItems.length} files)`)
      console.log(`    Artifact ID: ${id}`)
      console.log(`    Sources: gallery=${galleryCt}, blocks=${blocksCt}, thumbnail=${thumbCt}`)
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

    let successCount = 0
    let errorCount = 0

    for (const [key, artifactItems] of byArtifact) {
      const [, title] = key.split("|")
      console.log(`\n  Processing: ${title} (${artifactItems.length} files)`)

      for (const item of artifactItems) {
        const result = await migrateFile(item, false)
        if (result.success) {
          successCount++
        } else {
          errorCount++
          console.log(`    ❌ Error: ${result.error}`)
        }
      }
    }

    console.log("\n✅ Migration complete!")
    console.log(`  Files migrated: ${successCount}`)
    console.log(`  Errors: ${errorCount}`)
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
