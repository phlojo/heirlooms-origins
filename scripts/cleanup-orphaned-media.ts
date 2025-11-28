/**
 * Cleanup Orphaned Media Records
 *
 * This script identifies and optionally removes:
 * 1. user_media records where the file no longer exists (404)
 * 2. artifact_media records pointing to non-existent user_media
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

async function checkUrlExists(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: "HEAD" })
    return response.ok
  } catch {
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

async function deleteOrphanedRecords(
  userMediaIds: string[],
  artifactMediaIds: string[]
): Promise<void> {
  console.log("\n🗑️  Deleting orphaned records...")

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

async function main() {
  const args = process.argv.slice(2)
  const shouldDelete = args.includes("--delete")
  const isDryRun = !shouldDelete || args.includes("--dry-run")

  console.log("╔════════════════════════════════════════════════════════════╗")
  console.log("║           Orphaned Media Cleanup Script                    ║")
  console.log("╚════════════════════════════════════════════════════════════╝")
  console.log(`\nMode: ${isDryRun ? "🔍 DRY RUN (no changes will be made)" : "⚠️  DELETE MODE"}`)

  // Find orphaned user_media (broken URLs)
  const orphanedUserMedia = await findOrphanedUserMedia()

  // Find orphaned artifact_media (missing user_media references)
  const orphanedArtifactMedia = await findOrphanedArtifactMedia()

  // Also find artifact_media pointing to the broken user_media we found
  const orphanedUserMediaIds = new Set(orphanedUserMedia.map(m => m.id))
  const { data: linkedArtifactMedia } = await supabase
    .from("artifact_media")
    .select("id, artifact_id, media_id")
    .in("media_id", Array.from(orphanedUserMediaIds))

  const allOrphanedArtifactMedia = [
    ...orphanedArtifactMedia,
    ...(linkedArtifactMedia || [])
  ]

  // Deduplicate
  const uniqueArtifactMediaIds = [...new Set(allOrphanedArtifactMedia.map(am => am.id))]

  // Summary
  console.log("\n" + "═".repeat(60))
  console.log("📊 SUMMARY")
  console.log("═".repeat(60))
  console.log(`\n   Orphaned user_media (404 URLs):     ${orphanedUserMedia.length}`)
  console.log(`   Orphaned artifact_media links:      ${uniqueArtifactMediaIds.length}`)

  if (orphanedUserMedia.length > 0) {
    console.log("\n   Broken user_media records:")
    for (const media of orphanedUserMedia) {
      console.log(`     - ${media.filename} (${media.id.slice(0, 8)}...)`)
      console.log(`       URL: ${media.public_url.slice(0, 80)}...`)
    }
  }

  if (orphanedUserMedia.length === 0 && uniqueArtifactMediaIds.length === 0) {
    console.log("\n✅ No orphaned records found! Database is clean.")
    return
  }

  if (isDryRun) {
    console.log("\n" + "─".repeat(60))
    console.log("ℹ️  This was a dry run. To actually delete these records, run:")
    console.log("   npx tsx scripts/cleanup-orphaned-media.ts --delete")
    console.log("─".repeat(60))
  } else {
    console.log("\n⚠️  Proceeding with deletion in 5 seconds... (Ctrl+C to cancel)")
    await new Promise(resolve => setTimeout(resolve, 5000))

    await deleteOrphanedRecords(
      orphanedUserMedia.map(m => m.id),
      uniqueArtifactMediaIds
    )

    console.log("\n✅ Cleanup complete!")
  }
}

main().catch(console.error)
