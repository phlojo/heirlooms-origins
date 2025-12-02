/**
 * Cloudinary Media Cleanup Script
 *
 * Finds and optionally deletes Cloudinary media that isn't referenced in any artifact.
 *
 * Usage:
 *   pnpm tsx scripts/cleanup-cloudinary.ts              # Dry run (preview only)
 *   pnpm tsx scripts/cleanup-cloudinary.ts --delete     # Actually delete orphaned media
 */

import { createClient } from "@supabase/supabase-js"
import * as crypto from "node:crypto"

// Load environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY!
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET!

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ Missing Supabase environment variables")
  process.exit(1)
}

if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
  console.error("❌ Missing Cloudinary environment variables")
  process.exit(1)
}

// Create Supabase client with service role key (bypasses RLS)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

interface CloudinaryResource {
  public_id: string
  url: string
  secure_url: string
  resource_type: "image" | "video" | "raw"
  type?: "upload" | "fetch"
  format: string
  bytes: number
  created_at: string
}

/**
 * Fetch all media URLs from Supabase artifacts
 */
async function getAllArtifactMediaUrls(): Promise<Set<string>> {
  console.log("📊 Fetching all artifact media URLs from Supabase...")

  const { data: artifacts, error } = await supabase
    .from("artifacts")
    .select("media_urls, thumbnail_url")

  if (error) {
    throw new Error(`Failed to fetch artifacts: ${error.message}`)
  }

  const mediaUrls = new Set<string>()

  for (const artifact of artifacts || []) {
    // Add all media URLs
    if (artifact.media_urls && Array.isArray(artifact.media_urls)) {
      artifact.media_urls.forEach((url: string) => {
        if (url.includes("cloudinary.com")) {
          mediaUrls.add(url)
        }
      })
    }

    // Add thumbnail URL
    if (artifact.thumbnail_url && artifact.thumbnail_url.includes("cloudinary.com")) {
      mediaUrls.add(artifact.thumbnail_url)
    }
  }

  console.log(`✅ Found ${mediaUrls.size} Cloudinary URLs in ${artifacts?.length || 0} artifacts`)
  return mediaUrls
}

/**
 * Extract public_id from Cloudinary URL
 */
function extractPublicIdFromUrl(url: string): string | null {
  try {
    // Handle both image and video URLs
    // Format: https://res.cloudinary.com/{cloud}/image/upload/v{version}/{public_id}.{ext}
    // Format: https://res.cloudinary.com/{cloud}/video/upload/v{version}/{public_id}.{ext}
    const match = url.match(/\/(?:image|video|raw)\/upload\/(?:v\d+\/)?(.+?)(?:\.[^.]+)?$/)
    if (match && match[1]) {
      // Remove any transformations and file extension
      return match[1].replace(/\.[^.]+$/, "")
    }
    return null
  } catch (error) {
    console.error(`Failed to extract public_id from URL: ${url}`, error)
    return null
  }
}

/**
 * Delete a resource from Cloudinary using Destroy API
 */
async function deleteCloudinaryResource(
  publicId: string,
  resourceType: "image" | "video" | "raw",
  type: "upload" | "fetch" = "upload"
): Promise<void> {
  const timestamp = Math.round(Date.now() / 1000)

  // Build params for signature (alphabetically sorted)
  const params: Record<string, string> = {
    public_id: publicId,
    timestamp: timestamp.toString(),
    type: type,
  }

  // Build string to sign (params sorted alphabetically + secret)
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
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: formData.toString(),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Cloudinary delete error: ${response.statusText} - ${error}`)
  }

  const result = await response.json()
  if (result.result !== "ok" && result.result !== "not found") {
    throw new Error(`Cloudinary delete failed: ${result.result}`)
  }
}

/**
 * Fetch resources from Cloudinary using Admin API
 */
async function fetchCloudinaryResources(
  resourceType: "image" | "video",
  type: "upload" | "fetch" = "upload",
  nextCursor?: string
): Promise<{ resources: CloudinaryResource[]; next_cursor?: string }> {
  const params = new URLSearchParams({
    max_results: "500",
    type: type,
  })

  if (nextCursor) {
    params.append("next_cursor", nextCursor)
  }

  const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/resources/${resourceType}?${params}`

  // Admin API uses HTTP Basic Auth
  const auth = Buffer.from(`${CLOUDINARY_API_KEY}:${CLOUDINARY_API_SECRET}`).toString("base64")

  const response = await fetch(url, {
    headers: {
      Authorization: `Basic ${auth}`,
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Cloudinary API error: ${response.statusText} - ${errorText}`)
  }

  return await response.json()
}

/**
 * Get all resources from Cloudinary (images and videos, uploads and fetches)
 */
async function getAllCloudinaryResources(): Promise<CloudinaryResource[]> {
  console.log("☁️  Fetching all media from Cloudinary...")

  const allResources: CloudinaryResource[] = []

  // Fetch uploaded images
  let imageUploadCursor: string | undefined = undefined
  do {
    const result = await fetchCloudinaryResources("image", "upload", imageUploadCursor)
    allResources.push(...result.resources)
    imageUploadCursor = result.next_cursor
  } while (imageUploadCursor)

  const uploadedImages = allResources.length
  console.log(`  📷 Uploaded images: ${uploadedImages}`)

  // Fetch fetch-cached images
  let imageFetchCursor: string | undefined = undefined
  do {
    const result = await fetchCloudinaryResources("image", "fetch", imageFetchCursor)
    allResources.push(...result.resources)
    imageFetchCursor = result.next_cursor
  } while (imageFetchCursor)

  const fetchedImages = allResources.length - uploadedImages
  console.log(`  🔗 Fetch-cached images: ${fetchedImages}`)

  // Fetch uploaded videos
  let videoUploadCursor: string | undefined = undefined
  const videosStart = allResources.length
  do {
    const result = await fetchCloudinaryResources("video", "upload", videoUploadCursor)
    allResources.push(...result.resources)
    videoUploadCursor = result.next_cursor
  } while (videoUploadCursor)

  const uploadedVideos = allResources.length - videosStart
  console.log(`  🎥 Uploaded videos: ${uploadedVideos}`)

  // Fetch fetch-cached videos
  let videoFetchCursor: string | undefined = undefined
  const videoFetchStart = allResources.length
  do {
    const result = await fetchCloudinaryResources("video", "fetch", videoFetchCursor)
    allResources.push(...result.resources)
    videoFetchCursor = result.next_cursor
  } while (videoFetchCursor)

  const fetchedVideos = allResources.length - videoFetchStart
  console.log(`  🔗 Fetch-cached videos: ${fetchedVideos}`)

  console.log(`✅ Total Cloudinary resources: ${allResources.length}`)

  return allResources
}

/**
 * Main cleanup function
 */
async function cleanupCloudinary(shouldDelete: boolean, limit?: number) {
  console.log("\n🧹 Cloudinary Media Cleanup Script")
  console.log("=====================================\n")
  console.log(`Mode: ${shouldDelete ? "🗑️  DELETE" : "👀 DRY RUN (preview only)"}`)
  if (limit) {
    console.log(`Limit: ${limit} files\n`)
  } else {
    console.log()
  }

  try {
    // Get all media from both sources
    const [artifactUrls, cloudinaryResources] = await Promise.all([
      getAllArtifactMediaUrls(),
      getAllCloudinaryResources(),
    ])

    // Build a set of public_ids that are in use
    const usedPublicIds = new Set<string>()
    for (const url of artifactUrls) {
      const publicId = extractPublicIdFromUrl(url)
      if (publicId) {
        usedPublicIds.add(publicId)
      }
    }

    console.log(`\n📋 Analysis:`)
    console.log(`  - Cloudinary resources: ${cloudinaryResources.length}`)
    console.log(`  - Used in artifacts: ${usedPublicIds.size}`)

    // Find orphaned resources
    const orphanedResources = cloudinaryResources.filter(
      (resource) => !usedPublicIds.has(resource.public_id)
    )

    if (orphanedResources.length === 0) {
      console.log("\n✨ No orphaned media found! Everything is clean.")
      return
    }

    // Calculate total size
    const totalBytes = orphanedResources.reduce((sum, r) => sum + r.bytes, 0)
    const totalMB = (totalBytes / 1024 / 1024).toFixed(2)

    console.log(`\n🗑️  Found ${orphanedResources.length} orphaned resources (${totalMB} MB):\n`)

    // Group by resource type
    const orphanedImages = orphanedResources.filter(r => r.resource_type === "image")
    const orphanedVideos = orphanedResources.filter(r => r.resource_type === "video")

    console.log(`  📷 Images: ${orphanedImages.length}`)
    console.log(`  🎥 Videos: ${orphanedVideos.length}`)

    // Show sample of orphaned resources
    console.log("\n📄 Sample of orphaned resources (first 10):")
    orphanedResources.slice(0, 10).forEach((resource, idx) => {
      const sizeMB = (resource.bytes / 1024 / 1024).toFixed(2)
      console.log(`  ${idx + 1}. [${resource.resource_type}] ${resource.public_id} (${sizeMB} MB)`)
    })

    if (orphanedResources.length > 10) {
      console.log(`  ... and ${orphanedResources.length - 10} more`)
    }

    if (!shouldDelete) {
      console.log("\n💡 To actually delete these resources, run:")
      console.log("   pnpm tsx scripts/cleanup-cloudinary.ts --delete")
      return
    }

    // Confirm deletion
    console.log("\n⚠️  WARNING: You are about to permanently delete these resources!")
    console.log("Press Ctrl+C to cancel, or wait 5 seconds to continue...")

    await new Promise(resolve => setTimeout(resolve, 5000))

    console.log("\n🗑️  Deleting orphaned resources...")

    let deletedCount = 0
    let errorCount = 0

    // Apply limit if specified
    const resourcesToDelete = limit ? orphanedResources.slice(0, limit) : orphanedResources

    console.log(`Deleting ${resourcesToDelete.length} of ${orphanedResources.length} orphaned resources...\n`)

    for (const resource of resourcesToDelete) {
      try {
        await deleteCloudinaryResource(
          resource.public_id,
          resource.resource_type,
          resource.type || "upload"
        )
        deletedCount++

        if (deletedCount % 10 === 0 || deletedCount === resourcesToDelete.length) {
          console.log(`  Progress: ${deletedCount}/${resourcesToDelete.length}`)
        }
      } catch (error) {
        errorCount++
        console.error(`  ❌ Failed to delete ${resource.public_id}:`, error)
      }
    }

    console.log(`\n✅ Cleanup complete!`)
    console.log(`  Deleted: ${deletedCount}`)
    console.log(`  Errors: ${errorCount}`)
    console.log(`  Freed: ${totalMB} MB`)

  } catch (error) {
    console.error("\n❌ Script failed:", error)
    process.exit(1)
  }
}

// Parse command line arguments
const shouldDelete = process.argv.includes("--delete")
const limitArg = process.argv.find(arg => arg.startsWith("--limit="))
const limit = limitArg ? parseInt(limitArg.split("=")[1]) : undefined

// Run the script
cleanupCloudinary(shouldDelete, limit)
  .then(() => {
    console.log("\n✨ Done!")
    process.exit(0)
  })
  .catch((error) => {
    console.error("\n❌ Fatal error:", error)
    process.exit(1)
  })
