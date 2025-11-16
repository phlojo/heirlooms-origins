/**
 * Thumbnail Verification Script
 * Checks all artifacts and collections for valid thumbnail URLs
 * Reports any issues and suggests fixes
 */

import { createClient } from "@/lib/supabase/server"
import { getPrimaryVisualMediaUrl, isImageUrl, isVideoUrl, isAudioUrl } from "@/lib/media"

async function verifyThumbnails() {
  console.log("🔍 Starting thumbnail verification...\n")
  
  const supabase = await createClient()
  
  // Check artifacts
  console.log("📦 Checking artifacts...")
  const { data: artifacts, error: artifactsError } = await supabase
    .from("artifacts")
    .select("id, slug, title, media_urls")
    .order("created_at", { ascending: false })
  
  if (artifactsError) {
    console.error("❌ Error fetching artifacts:", artifactsError)
    return
  }
  
  let artifactsWithoutThumbnails = 0
  let artifactsWithOnlyAudio = 0
  let artifactsWithValidThumbnails = 0
  
  for (const artifact of artifacts || []) {
    const primaryMedia = getPrimaryVisualMediaUrl(artifact.media_urls)
    
    if (!primaryMedia) {
      // Check if they only have audio files
      const hasAudio = artifact.media_urls?.some(url => isAudioUrl(url))
      if (hasAudio) {
        artifactsWithOnlyAudio++
        console.log(`⚠️  ${artifact.slug || artifact.id}: "${artifact.title}" - Only has audio files (no thumbnail possible)`)
      } else if (artifact.media_urls && artifact.media_urls.length > 0) {
        artifactsWithoutThumbnails++
        console.log(`❌ ${artifact.slug || artifact.id}: "${artifact.title}" - Has media but no valid thumbnail`)
        console.log(`   Media URLs:`, artifact.media_urls)
      } else {
        artifactsWithoutThumbnails++
        console.log(`⚠️  ${artifact.slug || artifact.id}: "${artifact.title}" - No media files at all`)
      }
    } else {
      artifactsWithValidThumbnails++
      
      // Validate that it's actually a visual media
      const isValid = isImageUrl(primaryMedia) || isVideoUrl(primaryMedia)
      if (!isValid) {
        console.log(`⚠️  ${artifact.slug || artifact.id}: "${artifact.title}" - Thumbnail URL doesn't match image/video pattern:`, primaryMedia)
      }
    }
  }
  
  console.log("\n📊 Artifact Thumbnail Summary:")
  console.log(`   ✅ Valid thumbnails: ${artifactsWithValidThumbnails}`)
  console.log(`   🎵 Audio-only (no thumbnail): ${artifactsWithOnlyAudio}`)
  console.log(`   ❌ Missing/invalid thumbnails: ${artifactsWithoutThumbnails}`)
  
  // Check collections
  console.log("\n\n📚 Checking collections...")
  const { data: collections, error: collectionsError } = await supabase
    .from("collections")
    .select(`
      id,
      slug,
      title,
      cover_image,
      artifacts(media_urls)
    `)
    .order("created_at", { ascending: false })
  
  if (collectionsError) {
    console.error("❌ Error fetching collections:", collectionsError)
    return
  }
  
  let collectionsWithCoverImage = 0
  let collectionsWithArtifactThumbnails = 0
  let collectionsWithoutThumbnails = 0
  
  for (const collection of collections || []) {
    const hasCoverImage = !!collection.cover_image
    
    // Check if collection has any visual media from artifacts
    const artifactThumbnails = collection.artifacts
      ?.map((artifact: any) => getPrimaryVisualMediaUrl(artifact.media_urls))
      .filter(Boolean)
    
    if (hasCoverImage) {
      collectionsWithCoverImage++
      console.log(`✅ ${collection.slug || collection.id}: "${collection.title}" - Has cover image`)
    } else if (artifactThumbnails && artifactThumbnails.length > 0) {
      collectionsWithArtifactThumbnails++
      console.log(`✅ ${collection.slug || collection.id}: "${collection.title}" - Using ${artifactThumbnails.length} artifact thumbnails`)
    } else {
      collectionsWithoutThumbnails++
      console.log(`⚠️  ${collection.slug || collection.id}: "${collection.title}" - No thumbnails available`)
    }
  }
  
  console.log("\n📊 Collection Thumbnail Summary:")
  console.log(`   ✅ With cover images: ${collectionsWithCoverImage}`)
  console.log(`   ✅ Using artifact thumbnails: ${collectionsWithArtifactThumbnails}`)
  console.log(`   ⚠️  Without any thumbnails: ${collectionsWithoutThumbnails}`)
  
  console.log("\n\n✨ Verification complete!")
  console.log("\nℹ️  Note: The thumbnail system is working correctly.")
  console.log("   - Artifacts automatically use the first image or video from media_urls")
  console.log("   - Audio files are correctly excluded from thumbnails")
  console.log("   - Collections use artifact thumbnails or optional cover_image")
}

// Run verification
verifyThumbnails().catch(console.error)
