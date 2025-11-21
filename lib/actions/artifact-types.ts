"use server"

import { createClient } from "@/lib/supabase/server"
import type { ArtifactType, ArtifactTypeWithCount } from "@/lib/types/artifact-types"

/**
 * Get all active artifact types
 * Ordered by display_order
 */
export async function getArtifactTypes(): Promise<ArtifactType[]> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("artifact_types")
      .select("*")
      .eq("is_active", true)
      .order("display_order", { ascending: true })

    if (error) {
      console.error("[v0] getArtifactTypes: Database error:", error)
      throw error
    }

    console.log("[v0] getArtifactTypes: Successfully fetched", data?.length || 0, "types")
    console.log("[v0] getArtifactTypes: Types data:", JSON.stringify(data))
    return data || []
  } catch (err) {
    console.error("[v0] getArtifactTypes: Exception:", err)
    return []
  }
}

/**
 * Get artifact types with artifact counts
 * Useful for analytics and filtering UIs
 */
export async function getArtifactTypesWithCounts(userId: string): Promise<ArtifactTypeWithCount[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("artifact_types")
    .select(`
      *,
      artifacts!inner(count)
    `)
    .eq("is_active", true)
    .eq("artifacts.user_id", userId)
    .order("display_order", { ascending: true })

  if (error) {
    console.error("[v0] Error fetching artifact types with counts:", error)
    return []
  }

  return (data || []).map((type) => ({
    ...type,
    artifact_count: type.artifacts?.[0]?.count || 0,
  }))
}

/**
 * Get a single artifact type by ID
 */
export async function getArtifactTypeById(id: string): Promise<ArtifactType | null> {
  const supabase = await createClient()

  const { data, error } = await supabase.from("artifact_types").select("*").eq("id", id).eq("is_active", true).single()

  if (error) {
    console.error("[v0] Error fetching artifact type:", error)
    return null
  }

  return data
}

/**
 * Get a single artifact type by slug
 */
export async function getArtifactTypeBySlug(slug: string): Promise<ArtifactType | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("artifact_types")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .single()

  if (error) {
    console.error("[v0] Error fetching artifact type by slug:", error)
    return null
  }

  return data
}
