import { MeiliSearch, Index, SearchParams, SearchResponse } from 'meilisearch';
import { config } from '../config.js';

export const PROJECTS_INDEX = 'projects';

export interface ProjectDocument {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  projectType: string;
  mcVersion: string;
  loader: string;
  loaderVersion: string | null;
  downloads: number;
  authorId: number;
  authorUsername: string;
  licenseId: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SearchHit extends ProjectDocument {
  _formatted?: Partial<ProjectDocument>;
}

export interface FacetDistribution {
  [key: string]: {
    [value: string]: number;
  };
}

export interface ProjectSearchResponse {
  hits: SearchHit[];
  estimatedTotalHits: number;
  facetDistribution?: FacetDistribution;
  processingTimeMs: number;
  query: string;
  offset: number;
  limit: number;
}

let meiliClient: MeiliSearch | null = null;

/**
 * Get or create the Meilisearch client instance
 */
export function getMeiliClient(): MeiliSearch {
  if (!meiliClient) {
    meiliClient = new MeiliSearch({
      host: config.MEILISEARCH_HOST,
      apiKey: config.MEILISEARCH_KEY,
    });
  }
  return meiliClient;
}

/**
 * Get the projects search index
 */
export function getProjectsIndex(): Index<ProjectDocument> {
  return getMeiliClient().index<ProjectDocument>(PROJECTS_INDEX);
}

/**
 * Initialize the projects index with proper settings
 */
export async function initializeProjectsIndex(): Promise<void> {
  const index = getProjectsIndex();

  // Configure filterable attributes for faceted search
  await index.updateFilterableAttributes([
    'projectType',
    'mcVersion',
    'loader',
    'authorId',
    'authorUsername',
    'licenseId',
    'tags',
    'downloads',
    'createdAt',
    'updatedAt',
  ]);

  // Configure searchable attributes
  await index.updateSearchableAttributes([
    'name',
    'description',
    'authorUsername',
    'tags',
    'slug',
  ]);

  // Configure sortable attributes for ranking
  await index.updateSortableAttributes([
    'downloads',
    'createdAt',
    'updatedAt',
    'name',
  ]);

  // Configure ranking rules (relevance + downloads)
  await index.updateRankingRules([
    'words',
    'typo',
    'downloads:desc',
    'proximity',
    'attribute',
    'sort',
    'exactness',
  ]);
}

/**
 * Index a single project document
 */
export async function indexProject(project: ProjectDocument): Promise<void> {
  const index = getProjectsIndex();
  await index.addDocuments([project]);
}

/**
 * Index multiple project documents
 */
export async function indexProjects(projects: ProjectDocument[]): Promise<void> {
  if (projects.length === 0) return;
  const index = getProjectsIndex();
  await index.addDocuments(projects);
}

/**
 * Update a project document in the index
 */
export async function updateProjectIndex(project: Partial<ProjectDocument> & { id: number }): Promise<void> {
  const index = getProjectsIndex();
  await index.updateDocuments([project]);
}

/**
 * Remove a project from the index
 */
export async function removeProjectFromIndex(projectId: number): Promise<void> {
  const index = getProjectsIndex();
  await index.deleteDocument(projectId);
}

/**
 * Search projects with faceted filtering
 */
export async function searchProjects(
  query: string,
  options: {
    facets?: string[];
    filter?: string | string[];
    sort?: string[];
    limit?: number;
    offset?: number;
  } = {}
): Promise<ProjectSearchResponse> {
  const index = getProjectsIndex();

  const searchParams: SearchParams = {
    facets: options.facets,
    filter: options.filter,
    sort: options.sort,
    limit: options.limit ?? 20,
    offset: options.offset ?? 0,
    attributesToHighlight: ['name', 'description'],
    highlightPreTag: '<mark>',
    highlightPostTag: '</mark>',
  };

  const result: SearchResponse<ProjectDocument> = await index.search(query, searchParams);

  return {
    hits: result.hits as SearchHit[],
    estimatedTotalHits: result.estimatedTotalHits ?? 0,
    facetDistribution: result.facetDistribution as FacetDistribution | undefined,
    processingTimeMs: result.processingTimeMs,
    query: result.query,
    offset: result.offset ?? 0,
    limit: result.limit ?? 20,
  };
}

/**
 * Check if Meilisearch is healthy and accessible
 */
export async function checkMeiliHealth(): Promise<boolean> {
  try {
    const client = getMeiliClient();
    await client.health();
    return true;
  } catch {
    return false;
  }
}

/**
 * Get index statistics
 */
export async function getIndexStats(): Promise<{
  numberOfDocuments: number;
  isIndexing: boolean;
  fieldDistribution: Record<string, number>;
} | null> {
  try {
    const index = getProjectsIndex();
    const stats = await index.getStats();
    return {
      numberOfDocuments: stats.numberOfDocuments,
      isIndexing: stats.isIndexing,
      fieldDistribution: stats.fieldDistribution ?? {},
    };
  } catch {
    return null;
  }
}
