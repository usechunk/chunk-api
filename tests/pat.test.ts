import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { build } from './helper.js';
import { FastifyInstance } from 'fastify';

describe('Personal Access Token Routes', () => {
  let app: FastifyInstance;
  let authToken: string;

  beforeAll(async () => {
    app = await build();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Register a user and get auth token for tests
    const uniqueUser = `patuser_${Date.now()}`;
    const registerResponse = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        username: uniqueUser,
        email: `${uniqueUser}@example.com`,
        password: 'password123',
      },
    });

    if (registerResponse.statusCode === 201) {
      const body = JSON.parse(registerResponse.body);
      authToken = body.accessToken;
    }
  });

  describe('PAT Creation', () => {
    it('should create a new personal access token', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/user/tokens',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          name: 'Test PAT',
          scopes: ['project:read', 'user:read'],
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.id).toBeDefined();
      expect(body.name).toBe('Test PAT');
      expect(body.token).toBeDefined();
      expect(body.token.startsWith('chunk_')).toBe(true);
      expect(body.tokenPrefix).toBeDefined();
      expect(body.scopes).toEqual(['project:read', 'user:read']);
    });

    it('should create a PAT with expiration', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const response = await app.inject({
        method: 'POST',
        url: '/user/tokens',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          name: 'Expiring PAT',
          scopes: ['project:read'],
          expiresAt: futureDate.toISOString(),
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.expiresAt).toBeDefined();
    });

    it('should fail to create PAT without authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/user/tokens',
        payload: {
          name: 'Test PAT',
          scopes: ['project:read'],
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should fail with invalid scopes', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/user/tokens',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          name: 'Test PAT',
          scopes: ['invalid:scope'],
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('PAT Management', () => {
    let patId: string;

    beforeEach(async () => {
      // Create a test PAT
      const response = await app.inject({
        method: 'POST',
        url: '/user/tokens',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          name: 'Test PAT for Management',
          scopes: ['project:read'],
        },
      });
      const body = JSON.parse(response.body);
      patId = body.id;
    });

    it('should list user PATs', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/user/tokens',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(Array.isArray(body)).toBe(true);
      // Should not include the actual token value
      const foundToken = body.find((t: { id: string }) => t.id === patId);
      expect(foundToken).toBeDefined();
      expect(foundToken.token).toBeUndefined();
    });

    it('should get a specific PAT', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/user/tokens/${patId}`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.id).toBe(patId);
      // Should not include the actual token value
      expect(body.token).toBeUndefined();
    });

    it('should delete a PAT', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/user/tokens/${patId}`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(204);

      // Verify it's deleted
      const getResponse = await app.inject({
        method: 'GET',
        url: `/user/tokens/${patId}`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(getResponse.statusCode).toBe(404);
    });

    it('should return 404 for non-existent PAT', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/user/tokens/nonexistent-id',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(404);
    });
  });
});
