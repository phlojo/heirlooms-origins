# Artifact Types Management Guide

## Overview

Heirlooms uses a **fully dynamic artifact type system** that can be managed entirely through Supabase without code changes. This allows for flexible categorization of artifacts while maintaining data integrity.

## Database Structure

### Table: `artifact_types`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `name` | TEXT | Display name (e.g., "Car Collectors") |
| `slug` | TEXT | URL-friendly identifier (e.g., "cars") |
| `description` | TEXT | Optional description |
| `icon_name` | TEXT | Lucide icon name (e.g., "Car", "Watch") |
| `display_order` | INTEGER | Order for UI display |
| `is_active` | BOOLEAN | Soft delete flag |
| `created_at` | TIMESTAMPTZ | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last update timestamp |

## Managing Artifact Types in Supabase

### Adding a New Type

\`\`\`sql
INSERT INTO artifact_types (name, slug, description, icon_name, display_order)
VALUES (
  'Vinyl Records',           -- Display name
  'vinyl',                   -- Unique slug
  'Vinyl record collections', -- Description
  'Disc3',                   -- Any Lucide icon name
  7                          -- Display order
);
\`\`\`

**Important**: The system dynamically imports any Lucide icon by name. Browse available icons at [lucide.dev/icons](https://lucide.dev/icons).

### Editing a Type

\`\`\`sql
-- Update name and icon
UPDATE artifact_types
SET name = 'Classic Cars',
    icon_name = 'CarFront',
    updated_at = NOW()
WHERE slug = 'cars';

-- Reorder types
UPDATE artifact_types
SET display_order = 10
WHERE slug = 'watches';
\`\`\`

### Removing a Type (Recommended: Soft Delete)

**Do NOT use DELETE**. Use the `is_active` flag instead:

\`\`\`sql
-- Soft delete (RECOMMENDED)
UPDATE artifact_types
SET is_active = false
WHERE slug = 'toys';
\`\`\`

**Why soft delete?**
- Preserves existing artifact associations
- Maintains data integrity (artifacts keep their `type_id`)
- Can be reactivated later without data loss
- Immediate effect - type disappears from all UI

### Reactivating a Type

\`\`\`sql
-- Reactivate a soft-deleted type
UPDATE artifact_types
SET is_active = true
WHERE slug = 'toys';
\`\`\`

### Hard Delete (NOT Recommended)

If you absolutely must hard delete:

\`\`\`sql
-- WARNING: This sets type_id = NULL on all associated artifacts
DELETE FROM artifact_types WHERE slug = 'toys';
\`\`\`

**Consequences:**
- All artifacts with this type will have `type_id = NULL`
- Collections with this primary type will have `primary_type_id = NULL`
- No data is lost, but type associations are removed
- Cannot be undone

## How Types Are Used

### In Artifacts

- Each artifact can have one `type_id` (optional)
- Displayed as badges/labels in artifact lists
- Used for filtering and organization
- Foreign key with `ON DELETE SET NULL`

### In Collections

- Each collection can have one `primary_type_id` (optional)
- Auto-selects this type when creating new artifacts in the collection
- Users can override the default selection
- Foreign key with `ON DELETE SET NULL`

## UI Behavior

### Type Picker (New Artifact Form)

- Shows all active types (`is_active = true`)
- Ordered by `display_order`
- Displays icon + name in a visual grid
- Collapsible section
- Icons load dynamically from `icon_name`

### Animated Bottom Nav Icon

- Cycles through all active artifact types
- Uses icons from database
- Automatically updates when types change
- Respects `display_order`

### Filtering & Display

- Only active types shown in UI
- RLS policies enforce `is_active = true` for non-admins
- Admins can see all types (active + inactive)

## Dynamic Icon System

The app uses **fully dynamic icon loading** from Lucide React. You can use any of the 1000+ icons available.

### Popular Icon Examples

- **Vehicles**: `Car`, `CarFront`, `Truck`, `Bike`, `Plane`
- **Collectibles**: `Watch`, `Stamp`, `Sparkles`, `Crown`, `Gem`
- **Media**: `Disc3` (vinyl), `Music`, `Film`, `Camera`, `Gamepad2`
- **Spirits**: `Wine`, `Beer`, `Coffee`, `IceCream`
- **General**: `Package`, `Box`, `Archive`, `FolderOpen`, `Star`

Browse all icons: [lucide.dev/icons](https://lucide.dev/icons)

### Fallback Behavior

- If an invalid icon name is provided, the system falls back to `Package`
- Console warning logged for debugging
- UI never breaks due to missing icons

## Admin Functions

The following server actions are available for admin users:

\`\`\`typescript
// Soft delete a type (RECOMMENDED)
await deactivateArtifactType(typeId)

// Reactivate a type
await reactivateArtifactType(typeId)

// Get all types including inactive (admin only)
await getAllArtifactTypesAdmin()
\`\`\`

## Best Practices

1. **Always use soft delete** (`is_active = false`) instead of DELETE
2. **Test icon names** on [lucide.dev](https://lucide.dev/icons) before adding
3. **Use descriptive slugs** that match the type name
4. **Order types logically** with `display_order`
5. **Add descriptions** to help users understand each type
6. **Avoid special characters** in slugs (use kebab-case)

## Examples

### Adding a Sports Memorabilia Type

\`\`\`sql
INSERT INTO artifact_types (name, slug, description, icon_name, display_order)
VALUES (
  'Sports Memorabilia',
  'sports',
  'Sports cards, jerseys, and equipment',
  'Trophy',
  8
);
\`\`\`

### Changing Watch Icon to a Different Style

\`\`\`sql
UPDATE artifact_types
SET icon_name = 'Timer',
    updated_at = NOW()
WHERE slug = 'watches';
\`\`\`

### Temporarily Hiding a Type

\`\`\`sql
-- Hide from users but keep data
UPDATE artifact_types
SET is_active = false
WHERE slug = 'games';

-- Bring it back later
UPDATE artifact_types
SET is_active = true
WHERE slug = 'games';
\`\`\`

## Troubleshooting

### Type Not Showing in UI

- Check `is_active = true`
- Verify `display_order` is set
- Check RLS policies (non-admins only see active types)

### Icon Not Displaying

- Verify icon name exists at [lucide.dev/icons](https://lucide.dev/icons)
- Check browser console for warnings
- Icon names are case-sensitive (e.g., "Car" not "car")

### Can't Delete Type

- You likely don't have admin access
- Use soft delete instead: `UPDATE artifact_types SET is_active = false`
