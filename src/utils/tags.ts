/**
 * Parse a comma-separated string of tag slugs into an array of lowercase slugs.
 * @param tags - Comma-separated tag slugs (e.g., "forge,magic,1.20.1")
 * @returns Array of lowercase tag slugs
 */
export function parseTagSlugs(tags: string): string[] {
  return tags.split(',').map((t) => t.trim().toLowerCase()).filter(t => t.length > 0);
}
