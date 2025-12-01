import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  searchProjects,
  checkMeiliHealth,
  getIndexStats,
  ProjectSearchResponse,
} from '../services/meilisearch.js';
import {
  searchQuerySchema,
  suggestQuerySchema,
  buildFiltersFromParams,
  parseSort,
} from '../schemas/search.schema.js';

export async function advancedSearchRoutes(server: FastifyInstance) {
  /**
   * Advanced search endpoint with faceted filtering
   * GET /search/advanced?q=query&facets=loader,projectType&filters=loader:forge&limit=20&offset=0
   */
  server.get('/search/advanced', async (request: FastifyRequest, reply: FastifyReply) => {
    const query = request.query as Record<string, unknown>;
    const parsed = searchQuerySchema.safeParse(query);

    if (!parsed.success) {
      return reply.code(400).send({
        error: 'Bad Request',
        message: 'Invalid search parameters',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const params = parsed.data;

    // Build filters from convenience parameters and filter string
    const filters = buildFiltersFromParams({
      loader: params.loader,
      projectType: params.projectType,
      mcVersion: params.mcVersion,
      minDownloads: params.minDownloads,
      author: params.author,
      filters: params.filters,
    });

    // Parse sort parameter
    const sort = parseSort(params.sort);

    try {
      const result: ProjectSearchResponse = await searchProjects(params.q, {
        facets: params.facets,
        filter: filters.length > 0 ? filters : undefined,
        sort,
        limit: params.limit,
        offset: params.offset,
      });

      return reply.send(result);
    } catch (error) {
      server.log.error(error, 'Search failed');
      return reply.code(503).send({
        error: 'Service Unavailable',
        message: 'Search service is temporarily unavailable',
      });
    }
  });

  /**
   * Search suggestions/autocomplete endpoint
   * GET /search/suggest?q=query&limit=5
   */
  server.get('/search/suggest', async (request: FastifyRequest, reply: FastifyReply) => {
    const query = request.query as Record<string, unknown>;
    const parsed = suggestQuerySchema.safeParse(query);

    if (!parsed.success) {
      return reply.code(400).send({
        error: 'Bad Request',
        message: 'Invalid suggestion parameters',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const params = parsed.data;

    if (!params.q || params.q.length < 2) {
      return reply.send({ suggestions: [] });
    }

    try {
      const result = await searchProjects(params.q, {
        limit: params.limit,
        offset: 0,
      });

      const suggestions = result.hits.map((hit) => ({
        id: hit.id,
        name: hit.name,
        slug: hit.slug,
        projectType: hit.projectType,
        authorUsername: hit.authorUsername,
      }));

      return reply.send({ suggestions });
    } catch (error) {
      server.log.error(error, 'Search suggestions failed');
      return reply.send({ suggestions: [] });
    }
  });

  /**
   * Search health and stats endpoint
   * GET /search/stats
   */
  server.get('/search/stats', async (_request: FastifyRequest, reply: FastifyReply) => {
    const [isHealthy, stats] = await Promise.all([
      checkMeiliHealth(),
      getIndexStats(),
    ]);

    return reply.send({
      healthy: isHealthy,
      stats,
    });
  });
}
