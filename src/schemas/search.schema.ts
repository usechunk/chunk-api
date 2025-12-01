import { z } from 'zod';

// Valid facet fields that can be requested
export const facetFieldsEnum = z.enum([
  'projectType',
  'mcVersion',
  'loader',
  'tags',
  'licenseId',
  'authorUsername',
]);

export type FacetField = z.infer<typeof facetFieldsEnum>;

// Search query parameters schema
export const searchQuerySchema = z.object({
  q: z.string().default(''),
  facets: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return undefined;
      return val.split(',').filter((f) => {
        const parsed = facetFieldsEnum.safeParse(f.trim());
        return parsed.success;
      });
    }),
  filters: z
    .string()
    .optional()
    .describe('Filters in format "field:value,field2:value2" or Meilisearch filter syntax'),
  sort: z
    .string()
    .optional()
    .describe('Sort field with direction, e.g., "downloads:desc" or "createdAt:asc"'),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
  // Convenience filter parameters
  loader: z.string().optional(),
  projectType: z.string().optional(),
  mcVersion: z.string().optional(),
  minDownloads: z.coerce.number().min(0).optional(),
  author: z.string().optional(),
});

export type SearchQuery = z.infer<typeof searchQuerySchema>;

// Search suggestion query parameters schema
export const suggestQuerySchema = z.object({
  q: z.string().default(''),
  limit: z.coerce.number().min(1).max(10).default(5),
});

export type SuggestQuery = z.infer<typeof suggestQuerySchema>;

// Search response schema
export const searchHitSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  projectType: z.string(),
  mcVersion: z.string(),
  loader: z.string(),
  loaderVersion: z.string().nullable(),
  downloads: z.number(),
  authorId: z.number(),
  authorUsername: z.string(),
  licenseId: z.string().nullable(),
  tags: z.array(z.string()),
  createdAt: z.string(),
  updatedAt: z.string(),
  _formatted: z
    .object({
      name: z.string().optional(),
      description: z.string().optional(),
    })
    .optional(),
});

export type SearchHit = z.infer<typeof searchHitSchema>;

export const facetDistributionSchema = z.record(z.string(), z.record(z.string(), z.number()));

export type FacetDistribution = z.infer<typeof facetDistributionSchema>;

export const searchResponseSchema = z.object({
  hits: z.array(searchHitSchema),
  estimatedTotalHits: z.number(),
  facetDistribution: facetDistributionSchema.optional(),
  processingTimeMs: z.number(),
  query: z.string(),
  offset: z.number(),
  limit: z.number(),
});

export type SearchResponse = z.infer<typeof searchResponseSchema>;

/**
 * Parse filter string into Meilisearch filter format
 * Input: "loader:forge,projectType:MOD,minDownloads:1000"
 * Output: ["loader = forge", "projectType = MOD", "downloads >= 1000"]
 */
export function parseFilters(filterString: string | undefined): string[] {
  if (!filterString) return [];

  const filters: string[] = [];
  const parts = filterString.split(',');

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    // Check for different operators
    if (trimmed.includes(':')) {
      const colonIndex = trimmed.indexOf(':');
      const field = trimmed.slice(0, colonIndex).trim();
      const value = trimmed.slice(colonIndex + 1).trim();

      if (field && value) {
        // Special handling for minDownloads
        if (field === 'minDownloads') {
          const num = parseInt(value, 10);
          if (!isNaN(num)) {
            filters.push(`downloads >= ${num}`);
          }
        } else if (field === 'tags') {
          // Tags need special handling - filter for array contains
          filters.push(`tags = "${value}"`);
        } else {
          // Standard equality filter
          filters.push(`${field} = "${value}"`);
        }
      }
    }
  }

  return filters;
}

/**
 * Build Meilisearch filters from convenience parameters
 */
export function buildFiltersFromParams(params: {
  loader?: string;
  projectType?: string;
  mcVersion?: string;
  minDownloads?: number;
  author?: string;
  filters?: string;
}): string[] {
  const allFilters: string[] = [];

  if (params.loader) {
    allFilters.push(`loader = "${params.loader}"`);
  }
  if (params.projectType) {
    allFilters.push(`projectType = "${params.projectType.toUpperCase()}"`);
  }
  if (params.mcVersion) {
    allFilters.push(`mcVersion = "${params.mcVersion}"`);
  }
  if (params.minDownloads !== undefined && params.minDownloads > 0) {
    allFilters.push(`downloads >= ${params.minDownloads}`);
  }
  if (params.author) {
    allFilters.push(`authorUsername = "${params.author}"`);
  }

  // Parse additional filters from the filters string
  if (params.filters) {
    allFilters.push(...parseFilters(params.filters));
  }

  return allFilters;
}

/**
 * Parse sort parameter into Meilisearch format
 * Input: "downloads:desc" or "createdAt:asc"
 * Output: ["downloads:desc"]
 */
export function parseSort(sortString: string | undefined): string[] | undefined {
  if (!sortString) return undefined;

  const validSortFields = ['downloads', 'createdAt', 'updatedAt', 'name'];
  const validDirections = ['asc', 'desc'];

  const parts = sortString.split(':');
  if (parts.length !== 2) return undefined;

  const [field, direction] = parts;
  if (!validSortFields.includes(field) || !validDirections.includes(direction)) {
    return undefined;
  }

  return [`${field}:${direction}`];
}
