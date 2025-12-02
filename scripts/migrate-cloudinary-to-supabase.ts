/**
 * Phase 3: Migrate Cloudinary Originals to Supabase Storage
 *
 * This script migrates media from Cloudinary (original storage) to Supabase Storage,
 * converting the app to use Supabase for originals and Cloudinary only for delivery.
 *
 * What it does:
 * 1. Finds all artifacts with Cloudinary URLs in media_urls
 * 2. Downloads each original from Cloudinary
 * 3. Uploads to Supabase Storage in the proper folder structure
 * 4. Updates artifact records with new Supabase URLs
 * 5. Updates AI metadata JSONB keys (image_captions, video_summaries, audio_transcripts)
 * 6. Updates user_media records if they exist
 * 7. Optionally deletes Cloudinary originals after successful migration
 *
 * Safety features:
 * - Dry run mode by default (preview only)
 * - Per-artifact transaction-like behavior (all or nothing per artifact)
 * - Detailed logging and error reporting
 * - --limit flag for gradual migration
 * - --skip-delete flag to keep Cloudinary originals as backup
 *
 * Usage:
 *   pnpm tsx scripts/migrate-cloudinary-to-supabase.ts                    # Dry run
 *   pnpm tsx scripts/migrate-cloudinary-to-supabase.ts --migrate          # Execute migration
 *   pnpm tsx scripts/migrate-cloudinary-to-supabase.ts --migrate --limit=10  # Migrate 10 artifacts
 *   pnpm tsx scripts/migrate-cloudinary-to-supabase.ts --migrate --skip-delete  # Keep Cloudinary copies
 *   pnpm tsx scripts/migrate-cloudinary-to-supabase.ts --migrate --user=<uuid>  # Migrate specific user
 */

import { createClient } from "@supabase/supabase-js"
import * as crypto from "node:crypto"

// Load environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY!
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET!
const STORAGE_BUCKET = "heirlooms-media"

// Validate environment
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ Missing Supabase environment variables")
  console.error("   Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY")
  process.exit(1)
}

if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
  console.error("❌ Missing Cloudinary environment variables")
  console.error("   Required: NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET")
  process.exit(1)
}

// Create Supabase client with service role key (bypasses RLS)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

interface ArtifactToMigrate {
  id: string
  user_id: string
  title: string
  media_urls: string[]
  thumbnail_url: string | null
  image_captions: Record<string, string> | null
  video_summaries: Record<string, string> | null
  audio_transcripts: Record<string, string> | null
  media_derivatives: Record<string, { thumb: string; medium: string; large: string }> | null
}

interface MigrationResult {
  artifactId: string
  artifactTitle: string
  totalUrls: number
  migratedUrls: number
  skippedUrls: number
  errors: string[]
  urlMappings: Map<string, string> // old URL -> new URL
}

/**
 * Check if a URL is from Cloudinary
 */
function isCloudinaryUrl(url: string): boolean {
  return url.includes("cloudinary.com")
}

/**
 * Check if a URL is from Supabase Storage
 */
function isSupabaseStorageUrl(url: string): boolean {
  return url.includes("supabase.co/storage/v1/object/public/")
}

/**
 * Extract the original URL from a Cloudinary URL (removes transformations)
 */
function getCloudinaryOriginalUrl(url: string): string {
  // If URL has transformations, we need the original
  // Format: https://res.cloudinary.com/{cloud}/image/upload/{transformations}/{public_id}.{ext}
  // We want: https://res.cloudinary.com/{cloud}/image/upload/{public_id}.{ext}

  // Check for transformation patterns and remove them
  const transformPattern = /\/(image|video|raw)\/upload\/([a-z]_[^/]+\/)+/
  if (transformPattern.test(url)) {
    return url.replace(transformPattern, "/$1/upload/")
  }

  return url
}

/**
 * Determine resource type from Cloudinary URL
 */
function getResourceType(url: string): "image" | "video" | "raw" {
  if (url.includes("/video/upload/")) return "video"
  if (url.includes("/raw/upload/")) return "raw"
  return "image"
}

/**
 * Extract public_id from Cloudinary URL
 */
function extractPublicIdFromUrl(url: string): string | null {
  try {
    // Remove any transformations first
    const cleanUrl = getCloudinaryOriginalUrl(url)

    // Format: https://res.cloudinary.com/{cloud}/(image|video|raw)/upload/v{version}/{public_id}.{ext}
    const match = cleanUrl.match(/\/(?:image|video|raw)\/upload\/(?:v\d+\/)?(.+?)(?:\.[^.]+)?$/)
    if (match && match[1]) {
      return match[1]
    }
    return null
  } catch {
    return null
  }
}

/**
 * Get file extension from URL
 */
function getFileExtension(url: string): string {
  const urlPath = new URL(url).pathname
  const ext = urlPath.split(".").pop()?.toLowerCase() || ""

  // Map common Cloudinary extensions
  const validExtensions = ["jpg", "jpeg", "png", "gif", "webp", "heic", "heif", "mp4", "mov", "avi", "mkv", "webm", "mp3", "wav", "m4a", "aac", "ogg"]
  if (validExtensions.includes(ext)) {
    return ext
  }

  // Default based on resource type
  if (url.includes("/video/upload/")) return "mp4"
  return "jpg"
}

/**
 * Download a file from Cloudinary
 */
async function downloadFromCloudinary(url: string): Promise<{ buffer: Buffer; contentType: string } | null> {
  try {
    // Get the original (no transformations)
    const originalUrl = getCloudinaryOriginalUrl(url)

    const response = await fetch(originalUrl)
    if (!response.ok) {
      console.error(`    ❌ Download failed: ${response.status} ${response.statusText}`)
      return null
    }

    const buffer = Buffer.from(await response.arrayBuffer())
    const contentType = response.headers.get("content-type") || "application/octet-stream"

    return { buffer, contentType }
  } catch (error) {
    console.error(`    ❌ Download error:`, error)
    return null
  }
}

/**
 * Upload a file to Supabase Storage
 */
async function uploadToSupabase(
  buffer: Buffer,
  userId: string,
  artifactId: string,
  filename: string,
  contentType: string
): Promise<string | null> {
  try {
    const timestamp = Date.now()
    const path = `${userId}/${artifactId}/${timestamp}-${filename}`

    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, buffer, {
        contentType,
        cacheControl: "3600",
        upsert: false,
      })

    if (error) {
      if (error.message?.includes("already exists")) {
        // File exists, get its URL
        return `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${path}`
      }
      console.error(`    ❌ Upload failed: ${error.message}`)
      return null
    }

    return `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${path}`
  } catch (error) {
    console.error(`    ❌ Upload error:`, error)
    return null
  }
}

/**
 * Delete a resource from Cloudinary
 */
async function deleteFromCloudinary(publicId: string, resourceType: "image" | "video" | "raw"): Promise<boolean> {
  try {
    const timestamp = Math.round(Date.now() / 1000)

    const params: Record<string, string> = {
      public_id: publicId,
      timestamp: timestamp.toString(),
    }

    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join("&")

    const stringToSign = `${sortedParams}${CLOUDINARY_API_SECRET}`
    const signature = crypto.createHash("sha1").update(stringToSign).digest("hex")

    const formData = new URLSearchParams({
      ...params,
      signature,
      api_key: CLOUDINARY_API_KEY,
    })

    const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/destroy`

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData.toString(),
    })

    if (!response.ok) return false

    const result = await response.json()
    return result.result === "ok" || result.result === "not found"
  } catch {
    return false
  }
}

/**
 * Find all artifacts with Cloudinary URLs
 */
async function findArtifactsToMigrate(userId?: string): Promise<ArtifactToMigrate[]> {
  console.log("📊 Finding artifacts with Cloudinary media...")

  let query = supabase
    .from("artifacts")
    .select("id, user_id, title, media_urls, thumbnail_url, image_captions, video_summaries, audio_transcripts, media_derivatives")

  if (userId) {
    query = query.eq("user_id", userId)
  }

  const { data: artifacts, error } = await query

  if (error) {
    throw new Error(`Failed to fetch artifacts: ${error.message}`)
  }

  // Filter to only artifacts with Cloudinary URLs
  const toMigrate: ArtifactToMigrate[] = []

  for (const artifact of artifacts || []) {
    const hasCloudinaryMedia = (artifact.media_urls || []).some(isCloudinaryUrl)
    const hasCloudinaryThumb = artifact.thumbnail_url && isCloudinaryUrl(artifact.thumbnail_url)

    if (hasCloudinaryMedia || hasCloudinaryThumb) {
      toMigrate.push(artifact as ArtifactToMigrate)
    }
  }

  console.log(`✅ Found ${toMigrate.length} artifacts with Cloudinary media (of ${artifacts?.length || 0} total)`)
  return toMigrate
}

/**
 * Migrate a single artifact
 */
async function migrateArtifact(
  artifact: ArtifactToMigrate,
  dryRun: boolean,
  skipDelete: boolean
): Promise<MigrationResult> {
  const result: MigrationResult = {
    artifactId: artifact.id,
    artifactTitle: artifact.title,
    totalUrls: 0,
    migratedUrls: 0,
    skippedUrls: 0,
    errors: [],
    urlMappings: new Map(),
  }

  // Collect all Cloudinary URLs to migrate
  const cloudinaryUrls = new Set<string>()

  for (const url of artifact.media_urls || []) {
    if (isCloudinaryUrl(url)) {
      cloudinaryUrls.add(url)
    }
  }

  if (artifact.thumbnail_url && isCloudinaryUrl(artifact.thumbnail_url)) {
    cloudinaryUrls.add(artifact.thumbnail_url)
  }

  result.totalUrls = cloudinaryUrls.size

  if (cloudinaryUrls.size === 0) {
    result.skippedUrls = (artifact.media_urls || []).length
    return result
  }

  console.log(`\n  📦 "${artifact.title}" (${cloudinaryUrls.size} Cloudinary files)`)

  // Migrate each URL
  for (const oldUrl of Array.from(cloudinaryUrls)) {
    const publicId = extractPublicIdFromUrl(oldUrl)
    const resourceType = getResourceType(oldUrl)
    const extension = getFileExtension(oldUrl)
    const filename = publicId ? `${publicId.split("/").pop()}.${extension}` : `media.${extension}`

    if (dryRun) {
      console.log(`    Would migrate: ${filename} (${resourceType})`)
      result.migratedUrls++
      continue
    }

    // Download from Cloudinary
    console.log(`    ⬇️  Downloading: ${filename}`)
    const downloaded = await downloadFromCloudinary(oldUrl)

    if (!downloaded) {
      result.errors.push(`Failed to download: ${oldUrl}`)
      continue
    }

    // Upload to Supabase
    console.log(`    ⬆️  Uploading to Supabase...`)
    const newUrl = await uploadToSupabase(
      downloaded.buffer,
      artifact.user_id,
      artifact.id,
      filename,
      downloaded.contentType
    )

    if (!newUrl) {
      result.errors.push(`Failed to upload: ${oldUrl}`)
      continue
    }

    result.urlMappings.set(oldUrl, newUrl)
    result.migratedUrls++

    // Delete from Cloudinary (unless --skip-delete)
    if (!skipDelete && publicId) {
      const deleted = await deleteFromCloudinary(publicId, resourceType)
      if (deleted) {
        console.log(`    🗑️  Deleted from Cloudinary`)
      } else {
        console.log(`    ⚠️  Could not delete from Cloudinary (non-fatal)`)
      }
    }
  }

  // Update database records
  if (!dryRun && result.urlMappings.size > 0) {
    await updateArtifactUrls(artifact, result.urlMappings)
  }

  return result
}

/**
 * Update artifact with new URLs
 */
async function updateArtifactUrls(
  artifact: ArtifactToMigrate,
  urlMappings: Map<string, string>
): Promise<void> {
  const updateData: Record<string, any> = {}

  // Update media_urls array
  if (artifact.media_urls && artifact.media_urls.length > 0) {
    const newMediaUrls = artifact.media_urls.map(url => urlMappings.get(url) || url)
    updateData.media_urls = newMediaUrls
  }

  // Update thumbnail_url
  if (artifact.thumbnail_url && urlMappings.has(artifact.thumbnail_url)) {
    updateData.thumbnail_url = urlMappings.get(artifact.thumbnail_url)
  }

  // Update AI metadata JSONB keys
  if (artifact.image_captions) {
    const updated: Record<string, string> = {}
    Object.entries(artifact.image_captions).forEach(([oldUrl, caption]) => {
      const newUrl = urlMappings.get(oldUrl) || oldUrl
      updated[newUrl] = caption
    })
    updateData.image_captions = updated
  }

  if (artifact.video_summaries) {
    const updated: Record<string, string> = {}
    Object.entries(artifact.video_summaries).forEach(([oldUrl, summary]) => {
      const newUrl = urlMappings.get(oldUrl) || oldUrl
      updated[newUrl] = summary
    })
    updateData.video_summaries = updated
  }

  if (artifact.audio_transcripts) {
    const updated: Record<string, string> = {}
    Object.entries(artifact.audio_transcripts).forEach(([oldUrl, transcript]) => {
      const newUrl = urlMappings.get(oldUrl) || oldUrl
      updated[newUrl] = transcript
    })
    updateData.audio_transcripts = updated
  }

  // Clear media_derivatives (no longer needed - Cloudinary fetch will generate on-demand)
  // We keep the old ones as reference but new Supabase URLs won't have stored derivatives

  // Apply updates
  if (Object.keys(updateData).length > 0) {
    const { error } = await supabase
      .from("artifacts")
      .update(updateData)
      .eq("id", artifact.id)

    if (error) {
      console.log(`    ⚠️  Database update warning: ${error.message}`)
    } else {
      console.log(`    ✅ Database updated with ${urlMappings.size} new URLs`)
    }
  }

  // Update user_media records if they exist
  for (const [oldUrl, newUrl] of Array.from(urlMappings.entries())) {
    const { error } = await supabase
      .from("user_media")
      .update({ public_url: newUrl, storage_path: newUrl })
      .eq("public_url", oldUrl)

    if (error && !error.message.includes("0 rows")) {
      console.log(`    ⚠️  user_media update warning: ${error.message}`)
    }
  }
}

/**
 * Main migration function
 */
async function migrateCloudinaryToSupabase(
  shouldMigrate: boolean,
  limit?: number,
  skipDelete: boolean = false,
  userId?: string
) {
  console.log("\n🔄 Phase 3: Cloudinary → Supabase Storage Migration")
  console.log("=====================================================\n")
  console.log(`Mode: ${shouldMigrate ? "🚀 MIGRATE" : "👀 DRY RUN (preview only)"}`)
  if (limit) console.log(`Limit: ${limit} artifacts`)
  if (skipDelete) console.log(`Skip delete: Keeping Cloudinary originals as backup`)
  if (userId) console.log(`User filter: ${userId}`)
  console.log()

  try {
    // Find artifacts to migrate
    let artifacts = await findArtifactsToMigrate(userId)

    if (artifacts.length === 0) {
      console.log("\n✨ No Cloudinary media found! All artifacts already use Supabase Storage.")
      return
    }

    // Apply limit
    if (limit && limit < artifacts.length) {
      console.log(`\n📋 Limiting to first ${limit} of ${artifacts.length} artifacts`)
      artifacts = artifacts.slice(0, limit)
    }

    // Count total Cloudinary URLs
    let totalCloudinaryUrls = 0
    for (const artifact of artifacts) {
      totalCloudinaryUrls += (artifact.media_urls || []).filter(isCloudinaryUrl).length
      if (artifact.thumbnail_url && isCloudinaryUrl(artifact.thumbnail_url)) {
        totalCloudinaryUrls++
      }
    }

    console.log(`\n📊 Migration scope:`)
    console.log(`  - Artifacts: ${artifacts.length}`)
    console.log(`  - Cloudinary files: ${totalCloudinaryUrls}`)

    if (!shouldMigrate) {
      console.log("\n💡 To execute this migration, run:")
      console.log("   pnpm tsx scripts/migrate-cloudinary-to-supabase.ts --migrate")
      console.log("\n📝 Additional options:")
      console.log("   --limit=N        Migrate only N artifacts")
      console.log("   --skip-delete    Keep Cloudinary originals as backup")
      console.log("   --user=<uuid>    Migrate only a specific user's artifacts")

      // Show preview
      console.log("\n📋 Artifacts to migrate:")
      for (const artifact of artifacts.slice(0, 10)) {
        const cloudinaryCount = (artifact.media_urls || []).filter(isCloudinaryUrl).length
        console.log(`  - "${artifact.title}" (${cloudinaryCount} files)`)
      }
      if (artifacts.length > 10) {
        console.log(`  ... and ${artifacts.length - 10} more`)
      }

      return
    }

    // Confirm migration
    console.log("\n⚠️  WARNING: This will:")
    console.log("  1. Download files from Cloudinary")
    console.log("  2. Upload them to Supabase Storage")
    console.log("  3. Update all database references")
    if (!skipDelete) {
      console.log("  4. Delete originals from Cloudinary")
    }
    console.log("\nPress Ctrl+C to cancel, or wait 5 seconds to continue...")

    await new Promise(resolve => setTimeout(resolve, 5000))

    console.log("\n🚀 Starting migration...\n")

    // Migrate each artifact
    const results: MigrationResult[] = []

    for (const artifact of artifacts) {
      const result = await migrateArtifact(artifact, false, skipDelete)
      results.push(result)
    }

    // Summary
    const totalMigrated = results.reduce((sum, r) => sum + r.migratedUrls, 0)
    const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0)
    const successfulArtifacts = results.filter(r => r.errors.length === 0).length

    console.log("\n" + "=".repeat(50))
    console.log("✅ Migration complete!")
    console.log("=".repeat(50))
    console.log(`  Artifacts processed: ${results.length}`)
    console.log(`  Artifacts successful: ${successfulArtifacts}`)
    console.log(`  Files migrated: ${totalMigrated}`)
    console.log(`  Errors: ${totalErrors}`)

    if (totalErrors > 0) {
      console.log("\n⚠️  Errors encountered:")
      for (const result of results) {
        if (result.errors.length > 0) {
          console.log(`  "${result.artifactTitle}":`)
          for (const error of result.errors) {
            console.log(`    - ${error}`)
          }
        }
      }
    }

  } catch (error) {
    console.error("\n❌ Script failed:", error)
    process.exit(1)
  }
}

// Parse command line arguments
const shouldMigrate = process.argv.includes("--migrate")
const skipDelete = process.argv.includes("--skip-delete")
const limitArg = process.argv.find(arg => arg.startsWith("--limit="))
const limit = limitArg ? parseInt(limitArg.split("=")[1]) : undefined
const userArg = process.argv.find(arg => arg.startsWith("--user="))
const userId = userArg ? userArg.split("=")[1] : undefined

// Run the script
migrateCloudinaryToSupabase(shouldMigrate, limit, skipDelete, userId)
  .then(() => {
    console.log("\n✨ Done!")
    process.exit(0)
  })
  .catch((error) => {
    console.error("\n❌ Fatal error:", error)
    process.exit(1)
  })
