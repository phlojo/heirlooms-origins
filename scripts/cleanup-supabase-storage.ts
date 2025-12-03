/**
 * Supabase Storage Media Cleanup Script
 *
 * Finds and optionally deletes Supabase Storage media that isn't referenced in any artifact.
 *
 * Usage:
 *   pnpm tsx scripts/cleanup-supabase-storage.ts              # Dry run (preview only)
 *   pnpm tsx scripts/cleanup-supabase-storage.ts --delete     # Actually delete orphaned media
 */

import { createClient } from "@supabase/supabase-js"

// Load environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const STORAGE_BUCKET = "heirlooms-media"

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ Missing Supabase environment variables")
  process.exit(1)
}

// Create Supabase client with service role key (bypasses RLS)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

interface StorageFile {
  name: string
  id: string
  updated_at: string
  created_at: string
  metadata: {
    size: number
    mimetype: string
  }
  path: string
}

/**
 * Fetch all media URLs from Supabase (artifacts + user_media library)
 */
async function getAllReferencedMediaUrls(): Promise<Set<string>> {
  console.log("📊 Fetching all media URLs from Supabase...")

  const mediaUrls = new Set<string>()

  // 1. Get URLs from artifacts table (media_urls array + thumbnail_url)
  const { data: artifacts, error: artifactsError } = await supabase
    .from("artifacts")
    .select("media_urls, thumbnail_url")

  if (artifactsError) {
    throw new Error(`Failed to fetch artifacts: ${artifactsError.message}`)
  }

  for (const artifact of artifacts || []) {
    if (artifact.media_urls && Array.isArray(artifact.media_urls)) {
      artifact.media_urls.forEach((url: string) => {
        if (url.includes("supabase")) {
          mediaUrls.add(url)
        }
      })
    }
    if (artifact.thumbnail_url && artifact.thumbnail_url.includes("supabase")) {
      mediaUrls.add(artifact.thumbnail_url)
    }
  }

  const artifactUrlCount = mediaUrls.size
  console.log(`  - artifacts table: ${artifactUrlCount} URLs`)

  // 2. Get URLs from user_media table (unified media library)
  const { data: userMedia, error: userMediaError } = await supabase
    .from("user_media")
    .select("public_url")

  if (userMediaError) {
    console.warn(`  ⚠️  Failed to fetch user_media: ${userMediaError.message}`)
  } else {
    for (const media of userMedia || []) {
      if (media.public_url && media.public_url.includes("supabase")) {
        mediaUrls.add(media.public_url)
      }
    }
    console.log(`  - user_media table: ${(userMedia?.length || 0)} records`)
  }

  console.log(`✅ Total: ${mediaUrls.size} unique Supabase Storage URLs referenced`)
  return mediaUrls
}

/**
 * Extract file path from Supabase Storage public URL
 */
function extractPathFromUrl(url: string): string | null {
  try {
    // Format: https://{project}.supabase.co/storage/v1/object/public/{bucket}/{path}
    const match = url.match(/\/public\/[^/]+\/(.+)$/)
    return match ? match[1] : null
  } catch (error) {
    console.error(`Failed to extract path from URL: ${url}`, error)
    return null
  }
}

/**
 * Get all files from Supabase Storage bucket
 */
async function getAllStorageFiles(folder = ""): Promise<StorageFile[]> {
  console.log(`☁️  Fetching files from Supabase Storage${folder ? ` (folder: ${folder})` : ""}...`)

  const allFiles: StorageFile[] = []

  try {
    const { data: files, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .list(folder, {
        limit: 1000,
        sortBy: { column: "created_at", order: "desc" },
      })

    if (error) {
      throw new Error(`Failed to list files: ${error.message}`)
    }

    for (const file of files || []) {
      const fullPath = folder ? `${folder}/${file.name}` : file.name

      // If it's a folder, recurse into it
      if (!file.metadata) {
        const subFiles = await getAllStorageFiles(fullPath)
        allFiles.push(...subFiles)
      } else {
        // It's a file
        allFiles.push({
          ...file,
          path: fullPath,
        } as StorageFile)
      }
    }

    return allFiles
  } catch (error) {
    console.error(`Error listing files in folder "${folder}":`, error)
    return allFiles
  }
}

/**
 * Main cleanup function
 */
async function cleanupSupabaseStorage(shouldDelete: boolean, limit?: number) {
  console.log("\n🧹 Supabase Storage Media Cleanup Script")
  console.log("==========================================\n")
  console.log(`Mode: ${shouldDelete ? "🗑️  DELETE" : "👀 DRY RUN (preview only)"}`)
  if (limit) {
    console.log(`Limit: ${limit} files\n`)
  } else {
    console.log()
  }

  try {
    // Get all media from both sources
    const [referencedUrls, storageFiles] = await Promise.all([
      getAllReferencedMediaUrls(),
      getAllStorageFiles(),
    ])

    console.log(`✅ Found ${storageFiles.length} files in Supabase Storage`)

    // Build a set of paths that are in use
    const usedPaths = new Set<string>()
    for (const url of referencedUrls) {
      const path = extractPathFromUrl(url)
      if (path) {
        usedPaths.add(path)
      }
    }

    console.log(`\n📋 Analysis:`)
    console.log(`  - Storage files: ${storageFiles.length}`)
    console.log(`  - Referenced in DB: ${usedPaths.size}`)

    // Find orphaned files
    const orphanedFiles = storageFiles.filter(
      (file) => !usedPaths.has(file.path)
    )

    if (orphanedFiles.length === 0) {
      console.log("\n✨ No orphaned media found! Everything is clean.")
      return
    }

    // Calculate total size
    const totalBytes = orphanedFiles.reduce((sum, f) => sum + (f.metadata?.size || 0), 0)
    const totalMB = (totalBytes / 1024 / 1024).toFixed(2)

    console.log(`\n🗑️  Found ${orphanedFiles.length} orphaned files (${totalMB} MB):\n`)

    // Group by folder
    const folderCounts: Record<string, number> = {}
    orphanedFiles.forEach(file => {
      const folder = file.path.split("/")[0] || "root"
      folderCounts[folder] = (folderCounts[folder] || 0) + 1
    })

    console.log("📁 Files by folder:")
    Object.entries(folderCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([folder, count]) => {
        console.log(`  ${folder}: ${count} files`)
      })

    // Show sample of orphaned files
    console.log("\n📄 Sample of orphaned files (first 10):")
    orphanedFiles.slice(0, 10).forEach((file, idx) => {
      const sizeMB = ((file.metadata?.size || 0) / 1024 / 1024).toFixed(2)
      const mimeType = file.metadata?.mimetype || "unknown"
      console.log(`  ${idx + 1}. ${file.path} (${sizeMB} MB, ${mimeType})`)
    })

    if (orphanedFiles.length > 10) {
      console.log(`  ... and ${orphanedFiles.length - 10} more`)
    }

    if (!shouldDelete) {
      console.log("\n💡 To actually delete these files, run:")
      console.log("   pnpm tsx scripts/cleanup-supabase-storage.ts --delete")
      return
    }

    // Confirm deletion
    console.log("\n⚠️  WARNING: You are about to permanently delete these files!")
    console.log("Press Ctrl+C to cancel, or wait 5 seconds to continue...")

    await new Promise(resolve => setTimeout(resolve, 5000))

    console.log("\n🗑️  Deleting orphaned files...")

    let deletedCount = 0
    let errorCount = 0

    // Apply limit if specified
    const filesToDelete = limit ? orphanedFiles.slice(0, limit) : orphanedFiles

    console.log(`Deleting ${filesToDelete.length} of ${orphanedFiles.length} orphaned files...\n`)

    // Delete in batches of 100
    for (let i = 0; i < filesToDelete.length; i += 100) {
      const batch = filesToDelete.slice(i, i + 100)
      const pathsToDelete = batch.map(f => f.path)

      try {
        const { error } = await supabase.storage
          .from(STORAGE_BUCKET)
          .remove(pathsToDelete)

        if (error) {
          console.error(`  ❌ Failed to delete batch:`, error)
          errorCount += batch.length
        } else {
          deletedCount += batch.length
          console.log(`  Progress: ${deletedCount}/${filesToDelete.length}`)
        }
      } catch (error) {
        errorCount += batch.length
        console.error(`  ❌ Failed to delete batch:`, error)
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
cleanupSupabaseStorage(shouldDelete, limit)
  .then(() => {
    console.log("\n✨ Done!")
    process.exit(0)
  })
  .catch((error) => {
    console.error("\n❌ Fatal error:", error)
    process.exit(1)
  })
