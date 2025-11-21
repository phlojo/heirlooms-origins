import { Package, Car, Watch, Wine, Dices, Atom as Toy, type LucideIcon } from "lucide-react"
import type { ArtifactType as ArtifactTypeDB } from "@/lib/types/artifact-types"

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

export type ArtifactType = "general" | "cars" | "watches" | "whiskey" | "toys" | "games"

export const artifactTypeIcons: Record<string, LucideIcon> = {
  Package: Package,
  Car: Car,
  Watch: Watch,
  Wine: Wine,
  Toy: Toy,
  Dices: Dices,
  general: Package,
  cars: Car,
  watches: Watch,
  whiskey: Wine,
  toys: Toy,
  games: Dices,
}

/**
 * Icon cycle order for the Artifacts bottom-nav animation
 * Adjust this array to change which icons appear and in what order
 */
export const artifactIconCycle: ArtifactType[] = ["general", "cars", "watches", "whiskey", "toys", "games"]

/**
 * Get icon component for a given artifact type
 */
export function getArtifactTypeIcon(type: ArtifactType): LucideIcon {
  return artifactTypeIcons[type] || artifactTypeIcons.general
}

/**
 * Static Artifact Types List
 * Used as fallback when database is not available (e.g., in v0 preview without Supabase)
 */
export const artifactTypesList: ArtifactTypeDB[] = [
  {
    id: "general",
    name: "General / Other",
    slug: "general",
    description: "General artifacts and collectibles",
    icon_name: "Package",
    display_order: 1,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "cars",
    name: "Car Collectors",
    slug: "cars",
    description: "Automotive collectibles and memorabilia",
    icon_name: "Car",
    display_order: 2,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "watches",
    name: "Watch Collectors",
    slug: "watches",
    description: "Timepieces and watch collectibles",
    icon_name: "Watch",
    display_order: 3,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "whiskey",
    name: "Whiskey / Spirits Collectors",
    slug: "whiskey",
    description: "Spirits, bottles, and related collectibles",
    icon_name: "Wine",
    display_order: 4,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "toys",
    name: "Toy & Figurine Collectors",
    slug: "toys",
    description: "Toys, figurines, and action figures",
    icon_name: "Toy",
    display_order: 5,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "games",
    name: "Games",
    slug: "games",
    description: "Board games, video games, and gaming collectibles",
    icon_name: "Dices",
    display_order: 6,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]
