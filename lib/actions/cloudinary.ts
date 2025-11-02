"use server"

/**
 * Generate a signature for direct client-side upload to Cloudinary
 * This allows large files to be uploaded directly from the browser to Cloudinary
 * without going through Next.js server action payload limits
 */
export async function generateCloudinarySignature(userId: string, fileName: string) {
  // Check for required environment variables
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME
  const apiKey = process.env.CLOUDINARY_API_KEY
  const apiSecret = process.env.CLOUDINARY_API_SECRET

  if (!cloudName || !apiKey || !apiSecret) {
    return {
      error:
        "Cloudinary credentials not configured. Please add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET to your environment variables.",
    }
  }

  try {
    const timestamp = Math.round(new Date().getTime() / 1000)
    const folder = "heirloom/artifacts/images"

    // Sanitize filename
    const fileExtension = fileName.split(".").pop()
    const sanitizedFileName = fileName
      .replace(/\.[^/.]+$/, "") // Remove extension
      .replace(/[^a-zA-Z0-9]/g, "_") // Replace special chars with underscore
      .substring(0, 50) // Limit length

    const publicId = `${folder}/${userId}_${timestamp}_${sanitizedFileName}`

    const stringToSign = `public_id=${publicId}&timestamp=${timestamp}${apiSecret}`
    const encoder = new TextEncoder()
    const data = encoder.encode(stringToSign)
    const hashBuffer = await crypto.subtle.digest("SHA-1", data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const signature = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")

    return {
      signature,
      timestamp,
      publicId,
      cloudName,
      apiKey,
    }
  } catch (error) {
    console.error("[v0] Error generating Cloudinary signature:", error)
    return { error: "Failed to generate upload signature. Please try again." }
  }
}

/**
 * Delete a media file from Cloudinary by its public ID
 */
export async function deleteCloudinaryMedia(publicId: string) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME
  const apiKey = process.env.CLOUDINARY_API_KEY
  const apiSecret = process.env.CLOUDINARY_API_SECRET

  if (!cloudName || !apiKey || !apiSecret) {
    console.error("[v0] Cloudinary credentials not configured")
    return { error: "Cloudinary credentials not configured" }
  }

  try {
    const timestamp = Math.round(new Date().getTime() / 1000)

    const stringToSign = `public_id=${publicId}&timestamp=${timestamp}${apiSecret}`
    const encoder = new TextEncoder()
    const data = encoder.encode(stringToSign)
    const hashBuffer = await crypto.subtle.digest("SHA-1", data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const signature = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")

    const formData = new FormData()
    formData.append("public_id", publicId)
    formData.append("signature", signature)
    formData.append("api_key", apiKey)
    formData.append("timestamp", timestamp.toString())

    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, {
      method: "POST",
      body: formData,
    })

    const result = await response.json()

    if (result.result === "ok") {
      return { success: true }
    } else {
      console.error("[v0] Cloudinary deletion failed:", result)
      return { error: "Failed to delete media from Cloudinary" }
    }
  } catch (error) {
    console.error("[v0] Error deleting from Cloudinary:", error)
    return { error: "Failed to delete media from Cloudinary" }
  }
}

/**
 * Extract public ID from a Cloudinary URL
 */
export async function extractPublicIdFromUrl(url: string): Promise<string | null> {
  try {
    // Cloudinary URLs follow pattern: https://res.cloudinary.com/{cloud_name}/image/upload/{transformations}/{public_id}.{format}
    const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.[^.]+$/)
    return match ? match[1] : null
  } catch (error) {
    console.error("[v0] Error extracting public ID:", error)
    return null
  }
}
