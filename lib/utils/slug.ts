/**
 * Generate a URL-safe slug from a string
 */
export function generateSlug(text: string): string {
  return (
    text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "") // Remove special characters
      .replace(/[\s_-]+/g, "-") // Replace spaces, underscores with hyphens
      .replace(/^-+|-+$/g, "") || // Remove leading/trailing hyphens
    "collection"
  ) // Fallback if empty
}

/**
 * Generate a unique slug by checking against existing slugs
 */
export async function generateUniqueSlug(
  baseSlug: string,
  checkExists: (slug: string) => Promise<boolean>,
): Promise<string> {
  let slug = baseSlug
  let counter = 2

  while (await checkExists(slug)) {
    slug = `${baseSlug}-${counter}`
    counter++
  }

  return slug
}
