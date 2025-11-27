import { createClient as createServerClient } from "@/lib/supabase/server"
import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"

/**
 * Phase 2: Supabase Storage upload API route
 * Handles large file uploads via multipart/form-data instead of Server Actions
 *
 * Why API route instead of Server Action?
 * - Server Actions serialize FormData which has size limitations for large files
 * - API routes handle multipart/form-data natively with better streaming support
 * - Proven pattern: Same approach used for Cloudinary uploads
 */

const STORAGE_BUCKET = "heirlooms-media"
const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB (Supabase free tier limit)

export async function POST(request: NextRequest) {
  try {
    // First, authenticate the user with cookie-based client
    const authClient = await createServerClient()
    const {
      data: { user },
    } = await authClient.auth.getUser()

    if (!user) {
      console.error("[upload/supabase] Unauthorized - no user")
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Parse multipart form data BEFORE creating service role client
    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const artifactId = formData.get("artifactId") as string | null

    console.log("[upload/supabase] FormData received:", {
      hasFile: formData.has("file"),
      fileType: file?.constructor.name,
      keys: Array.from(formData.keys()),
    })

    if (!file) {
      console.error("[upload/supabase] No file in FormData. FormData keys:", Array.from(formData.keys()))
      return NextResponse.json(
        { error: "No file provided. Please try again or contact support if the issue persists." },
        { status: 400 }
      )
    }

    console.log("[upload/supabase] File received:", {
      name: file.name,
      size: file.size,
      type: file.type,
      sizeInMB: (file.size / (1024 * 1024)).toFixed(2) + "MB",
      artifactId: artifactId || "temp",
    })

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1)
      const maxSizeMB = (MAX_FILE_SIZE / (1024 * 1024)).toFixed(0)
      return NextResponse.json(
        {
          error: `File "${file.name}" is too large (${fileSizeMB}MB). Maximum allowed size is ${maxSizeMB}MB (Supabase Storage free tier limit).`,
        },
        { status: 400 }
      )
    }

    // Generate unique filename with timestamp
    const timestamp = Date.now()
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_")
    const folder = artifactId ? `${user.id}/${artifactId}` : `${user.id}/temp`
    const filePath = `${folder}/${timestamp}-${sanitizedName}`

    console.log("[upload/supabase] Uploading to Supabase Storage:", {
      bucket: STORAGE_BUCKET,
      path: filePath,
      size: file.size,
      type: file.type,
    })

    // Convert File to ArrayBuffer to avoid "disturbed or locked" error
    // Next.js API routes require this conversion for Supabase Storage uploads
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    console.log("[upload/supabase] File converted to buffer:", {
      bufferSize: buffer.length,
      originalSize: file.size,
    })

    // Create service role client for storage upload (bypasses RLS)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    // Upload to Supabase Storage
    const { data, error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, buffer, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type, // Preserve original file type
      })

    if (uploadError) {
      console.error("[upload/supabase] Upload failed:", uploadError)

      // Provide user-friendly error messages
      let errorMessage = uploadError.message
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2)

      if (
        uploadError.message?.toLowerCase().includes("payload") ||
        uploadError.message?.toLowerCase().includes("too large") ||
        uploadError.message?.toLowerCase().includes("size") ||
        uploadError.message?.toLowerCase().includes("exceeds")
      ) {
        errorMessage = `File "${file.name}" (${fileSizeMB}MB) exceeds the storage limit. Supabase Storage free tier limit is 50MB per file. Please reduce file size or contact support.`
      } else if (
        uploadError.message?.toLowerCase().includes("quota") ||
        uploadError.message?.toLowerCase().includes("storage limit")
      ) {
        errorMessage = `Storage quota exceeded. Please contact support.`
      } else if (
        uploadError.message?.toLowerCase().includes("permission") ||
        uploadError.message?.toLowerCase().includes("unauthorized")
      ) {
        errorMessage = `You don't have permission to upload files.`
      } else {
        errorMessage = `Failed to upload "${file.name}" (${fileSizeMB}MB): ${uploadError.message}`
      }

      return NextResponse.json({ error: errorMessage }, { status: 500 })
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(data.path)

    console.log("[upload/supabase] Upload successful:", {
      path: data.path,
      publicUrl,
    })

    return NextResponse.json({ url: publicUrl })
  } catch (error) {
    console.error("[upload/supabase] Unexpected error:", error)
    console.error("[upload/supabase] Error details:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to upload file to storage" },
      { status: 500 }
    )
  }
}
