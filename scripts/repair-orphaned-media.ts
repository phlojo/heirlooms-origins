/**
 * Repair Script: Link Orphaned Media Files to Artifacts
 *
 * Problem: Some artifacts have files in Supabase Storage but empty media_urls arrays.
 * This happens when users add media to gallery only (not media blocks) and the
 * media_urls wasn't being populated from gallery_urls.
 *
 * This script:
 * 1. Finds artifacts with empty media_urls but files in their storage folder
 * 2. Reconstructs the media_urls array from storage files
 * 3. Sets the thumbnail_url from the first visual media
 * 4. Creates user_media records if missing
 * 5. Creates artifact_media (gallery) links if missing
 *
 * Run with: npx tsx scripts/repair-orphaned-media.ts
 *
 * Options:
 *   --dry-run    Preview changes without applying them (default)
 *   --apply      Actually apply the repairs
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const isDryRun = !process.argv.includes('--apply')

function isImageFile(filename: string): boolean {
  const ext = filename.toLowerCase().split('.').pop()
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif', 'avif'].includes(ext || '')
}

function isVideoFile(filename: string): boolean {
  const ext = filename.toLowerCase().split('.').pop()
  return ['mp4', 'mov', 'webm', 'avi', 'mkv', 'm4v', 'quicktime'].includes(ext || '')
}

function isAudioFile(filename: string): boolean {
  const ext = filename.toLowerCase().split('.').pop()
  return ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac', 'webm'].includes(ext || '')
}

function getMediaType(filename: string): 'image' | 'video' | 'audio' | null {
  if (isImageFile(filename)) return 'image'
  if (isVideoFile(filename)) return 'video'
  if (isAudioFile(filename)) return 'audio'
  return null
}

async function repairOrphanedMedia() {
  console.log('\n=== Orphaned Media Repair Script ===')
  console.log(`Mode: ${isDryRun ? 'DRY RUN (preview only)' : 'APPLY CHANGES'}\n`)

  // Find artifacts with empty or null media_urls
  const { data: artifacts, error: fetchError } = await supabase
    .from('artifacts')
    .select('id, slug, title, user_id, media_urls, thumbnail_url, created_at')
    .or('media_urls.is.null,media_urls.eq.{}')
    .order('created_at', { ascending: false })

  if (fetchError) {
    console.error('Error fetching artifacts:', fetchError)
    return
  }

  console.log(`Found ${artifacts?.length || 0} artifacts with empty media_urls\n`)

  if (!artifacts || artifacts.length === 0) {
    console.log('No artifacts need repair!')
    return
  }

  let repairedCount = 0
  let skippedCount = 0
  let errorCount = 0

  for (const artifact of artifacts) {
    console.log(`\n--- Checking: ${artifact.title} (${artifact.slug}) ---`)
    console.log(`  User ID: ${artifact.user_id}`)
    console.log(`  Artifact ID: ${artifact.id}`)

    // List files in the artifact's storage folder
    const storagePath = `${artifact.user_id}/${artifact.id}`
    const { data: files, error: listError } = await supabase.storage
      .from('heirlooms-media')
      .list(storagePath)

    if (listError) {
      console.log(`  Storage error: ${listError.message}`)
      errorCount++
      continue
    }

    if (!files || files.length === 0) {
      console.log('  No files found in storage folder - skipping')
      skippedCount++
      continue
    }

    // Filter to actual media files (exclude folders like .emptyFolderPlaceholder)
    const mediaFiles = files.filter(f => {
      const type = getMediaType(f.name)
      return type !== null
    })

    if (mediaFiles.length === 0) {
      console.log('  No media files found - skipping')
      skippedCount++
      continue
    }

    console.log(`  Found ${mediaFiles.length} media files:`)

    // Build URLs and categorize
    const mediaUrls: string[] = []
    let firstVisualUrl: string | null = null

    for (const file of mediaFiles) {
      const publicUrl = `${supabaseUrl}/storage/v1/object/public/heirlooms-media/${storagePath}/${file.name}`
      const type = getMediaType(file.name)

      console.log(`    - ${file.name} (${type})`)
      mediaUrls.push(publicUrl)

      if (!firstVisualUrl && (type === 'image' || type === 'video')) {
        firstVisualUrl = publicUrl
      }
    }

    console.log(`  Thumbnail: ${firstVisualUrl || 'none'}`)

    if (isDryRun) {
      console.log('  [DRY RUN] Would update artifact with:')
      console.log(`    media_urls: ${mediaUrls.length} URLs`)
      console.log(`    thumbnail_url: ${firstVisualUrl || 'null'}`)
      repairedCount++
    } else {
      // Apply the repair
      const { error: updateError } = await supabase
        .from('artifacts')
        .update({
          media_urls: mediaUrls,
          thumbnail_url: firstVisualUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', artifact.id)

      if (updateError) {
        console.log(`  ERROR updating artifact: ${updateError.message}`)
        errorCount++
        continue
      }

      console.log('  ✓ Updated artifact media_urls and thumbnail')

      // Create user_media records if missing
      for (const url of mediaUrls) {
        const filename = url.split('/').pop() || ''
        const type = getMediaType(filename)

        // Check if user_media record exists
        const { data: existing } = await supabase
          .from('user_media')
          .select('id')
          .eq('public_url', url)
          .eq('user_id', artifact.user_id)
          .single()

        if (!existing) {
          const { error: mediaError } = await supabase
            .from('user_media')
            .insert({
              user_id: artifact.user_id,
              original_filename: filename,
              media_type: type,
              public_url: url,
              storage_path: `${storagePath}/${filename}`,
              created_at: new Date().toISOString(),
            })

          if (mediaError) {
            console.log(`    Warning: Could not create user_media for ${filename}: ${mediaError.message}`)
          } else {
            console.log(`    ✓ Created user_media record for ${filename}`)
          }
        }
      }

      // Create artifact_media (gallery) links if missing
      const { data: userMediaRecords } = await supabase
        .from('user_media')
        .select('id, public_url')
        .in('public_url', mediaUrls)
        .eq('user_id', artifact.user_id)

      if (userMediaRecords) {
        let sortOrder = 0
        for (const media of userMediaRecords) {
          // Check if link exists
          const { data: existingLink } = await supabase
            .from('artifact_media')
            .select('id')
            .eq('artifact_id', artifact.id)
            .eq('media_id', media.id)
            .eq('role', 'gallery')
            .single()

          if (!existingLink) {
            const { error: linkError } = await supabase
              .from('artifact_media')
              .insert({
                artifact_id: artifact.id,
                media_id: media.id,
                role: 'gallery',
                sort_order: sortOrder++,
                created_at: new Date().toISOString(),
              })

            if (linkError) {
              console.log(`    Warning: Could not create gallery link: ${linkError.message}`)
            } else {
              console.log(`    ✓ Created gallery link for media ${media.id}`)
            }
          }
        }
      }

      repairedCount++
    }
  }

  console.log('\n=== Summary ===')
  console.log(`Repaired: ${repairedCount}`)
  console.log(`Skipped (no files): ${skippedCount}`)
  console.log(`Errors: ${errorCount}`)

  if (isDryRun) {
    console.log('\nThis was a dry run. Run with --apply to make changes.')
  }
}

// Run the repair
repairOrphanedMedia().catch(console.error)
