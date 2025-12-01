import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { build } from './helper.js';
import { FastifyInstance } from 'fastify';

describe('Advanced Search Routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await build();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /search/advanced', () => {
    it('should return 503 when Meilisearch is unavailable', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/search/advanced',
        query: { q: 'test' },
      });

      // When Meilisearch is not running, expect 503
      expect(response.statusCode).toBe(503);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Service Unavailable');
      expect(body.message).toBe('Search service is temporarily unavailable');
    });

    it('should return 400 for invalid limit parameter', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/search/advanced',
        query: { q: 'test', limit: '0' },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Bad Request');
      expect(body.details).toHaveProperty('limit');
    });

    it('should return 400 for limit exceeding maximum', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/search/advanced',
        query: { q: 'test', limit: '200' },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Bad Request');
    });

    it('should accept valid search parameters', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/search/advanced',
        query: {
          q: 'test',
          limit: '20',
          offset: '0',
          loader: 'forge',
          projectType: 'MOD',
        },
      });

      // Either 503 (Meilisearch unavailable) or 200 (success) is acceptable
      expect([200, 503]).toContain(response.statusCode);
    });

    it('should accept facets parameter', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/search/advanced',
        query: {
          q: 'test',
          facets: 'loader,projectType,mcVersion',
        },
      });

      // Either 503 (Meilisearch unavailable) or 200 (success) is acceptable
      expect([200, 503]).toContain(response.statusCode);
    });

    it('should accept sort parameter', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/search/advanced',
        query: {
          q: 'test',
          sort: 'downloads:desc',
        },
      });

      // Either 503 (Meilisearch unavailable) or 200 (success) is acceptable
      expect([200, 503]).toContain(response.statusCode);
    });
  });

  describe('GET /search/suggest', () => {
    it('should return empty suggestions for short query', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/search/suggest',
        query: { q: 'a' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.suggestions).toEqual([]);
    });

    it('should return empty suggestions for empty query', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/search/suggest',
        query: { q: '' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.suggestions).toEqual([]);
    });

    it('should return 400 for invalid limit parameter', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/search/suggest',
        query: { q: 'test', limit: '15' },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Bad Request');
    });

    it('should return 503 when Meilisearch is unavailable for valid query', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/search/suggest',
        query: { q: 'test query' },
      });

      // When Meilisearch is not running, expect 503
      expect(response.statusCode).toBe(503);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Service Unavailable');
      expect(body.message).toBe('Suggestion service is temporarily unavailable');
    });
  });

  describe('GET /search/stats', () => {
    it('should return health and stats information', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/search/stats',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('healthy');
      expect(typeof body.healthy).toBe('boolean');
      // stats can be null when Meilisearch is unavailable
      expect(body).toHaveProperty('stats');
    });

    it('should return healthy: false when Meilisearch is unavailable', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/search/stats',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      // When Meilisearch is not running, healthy should be false
      expect(body.healthy).toBe(false);
      expect(body.stats).toBeNull();
    });
  });
});
