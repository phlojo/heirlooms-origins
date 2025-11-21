/**
 * Artifact Types System - Type Definitions
 *
 * This module contains types for the dynamic artifact type system.
 * Types are stored in the database and can be managed without code changes.
 */

export interface ArtifactType {
  id: string
  name: string
  slug: string
  description: string | null
  icon_name: string
  display_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ArtifactTypeWithCount extends ArtifactType {
  artifact_count: number
}
