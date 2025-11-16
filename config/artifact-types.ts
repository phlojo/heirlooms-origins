import { Package, Car, Watch, Camera, Wine, Dices, type LucideIcon } from 'lucide-react'

/**
 * Artifact Type Icon Configuration
 * 
 * This config maps conceptual artifact/collection types to their corresponding icons.
 * Currently used only for the Artifacts bottom-nav icon animation.
 * 
 * Future use:
 * - When we add collection_type and artifact_type to the database
 * - For filtering artifacts by type
 * - For type-specific UI and routing
 * - For user profile preferences
 */

export type ArtifactType = "cars" | "watches" | "cameras" | "whiskey" | "toys" | "general"

export const artifactTypeIcons: Record<ArtifactType, LucideIcon> = {
  general: Package,
  cars: Car,
  watches: Watch,
  cameras: Camera,
  whiskey: Wine,
  toys: Dices,
}

/**
 * Icon cycle order for the Artifacts bottom-nav animation
 * Adjust this array to change which icons appear and in what order
 */
export const artifactIconCycle: ArtifactType[] = [
  "general",
  "cars",
  "watches",
  "cameras",
  "whiskey",
  "toys",
]

/**
 * Get icon component for a given artifact type
 */
export function getArtifactTypeIcon(type: ArtifactType): LucideIcon {
  return artifactTypeIcons[type] || artifactTypeIcons.general
}
