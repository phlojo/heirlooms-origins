import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const urlToCheck = process.argv[2]
const artifactId = process.argv[3]

async function investigate() {
  console.log("=== INVESTIGATING MEDIA ===\n")

  if (artifactId) {
    // Check artifact
    const { data: artifact, error } = await supabase
      .from("artifacts")
      .select("id, title, slug, user_id, collection_id, media_urls, thumbnail_url, created_at, updated_at")
      .eq("id", artifactId)
      .single()

    if (error) {
      console.error("Artifact not found:", error.message)
    } else {
      console.log("📦 ARTIFACT:")
      console.log(`   ID: ${artifact.id}`)
      console.log(`   Title: ${artifact.title}`)
      console.log(`   Slug: ${artifact.slug}`)
      console.log(`   User ID: ${artifact.user_id}`)
      console.log(`   Collection ID: ${artifact.collection_id}`)
      console.log(`   Created: ${artifact.created_at}`)
      console.log(`   Updated: ${artifact.updated_at}`)
      console.log(`   Media URLs (${artifact.media_urls?.length || 0}):`)
      artifact.media_urls?.forEach((url: string, i: number) => {
        console.log(`     [${i}] ${url.substring(0, 80)}...`)
      })
      console.log(`   Thumbnail: ${artifact.thumbnail_url?.substring(0, 80)}...`)

      // Check collection
      if (artifact.collection_id) {
        const { data: collection } = await supabase
          .from("collections")
          .select("id, title, slug, is_public")
          .eq("id", artifact.collection_id)
          .single()

        if (collection) {
          console.log(`\n📁 COLLECTION:`)
          console.log(`   ID: ${collection.id}`)
          console.log(`   Title: ${collection.title}`)
          console.log(`   Slug: ${collection.slug}`)
          console.log(`   Public: ${collection.is_public}`)
        }
      }
    }
  }

  if (urlToCheck) {
    // Check user_media
    const { data: userMedia } = await supabase
      .from("user_media")
      .select("id, filename, media_type, public_url, created_at")
      .eq("public_url", urlToCheck)

    console.log(`\n🖼️  USER_MEDIA RECORD:`)
    if (userMedia && userMedia.length > 0) {
      userMedia.forEach(m => {
        console.log(`   ID: ${m.id}`)
        console.log(`   Filename: ${m.filename}`)
        console.log(`   Type: ${m.media_type}`)
        console.log(`   Created: ${m.created_at}`)
      })
    } else {
      console.log("   ⚠️  NOT FOUND in user_media table")
    }

    // Check artifact_media links for this media
    if (userMedia && userMedia.length > 0) {
      const { data: links } = await supabase
        .from("artifact_media")
        .select("id, artifact_id, role, sort_order")
        .eq("media_id", userMedia[0].id)

      console.log(`\n🔗 ARTIFACT_MEDIA LINKS:`)
      if (links && links.length > 0) {
        links.forEach(link => {
          console.log(`   Artifact: ${link.artifact_id}`)
          console.log(`   Role: ${link.role}`)
          console.log(`   Sort Order: ${link.sort_order}`)
        })
      } else {
        console.log("   ⚠️  No gallery links found")
      }
    }
  }

  // Check all gallery links for the artifact
  if (artifactId) {
    const { data: allLinks } = await supabase
      .from("artifact_media")
      .select("id, role, sort_order, media:user_media(id, public_url, filename)")
      .eq("artifact_id", artifactId)

    console.log(`\n🎨 ALL GALLERY LINKS FOR ARTIFACT:`)
    if (allLinks && allLinks.length > 0) {
      allLinks.forEach((link: any) => {
        console.log(`   [${link.sort_order}] ${link.role}: ${link.media?.filename || "N/A"}`)
        console.log(`       Media ID: ${link.media?.id || "NULL"}`)
      })
    } else {
      console.log("   ⚠️  No gallery links found")
    }
  }
}

investigate()
