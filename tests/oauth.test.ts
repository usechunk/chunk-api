import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { build } from './helper.js';
import { FastifyInstance } from 'fastify';

describe('OAuth Routes', () => {
  let app: FastifyInstance;
  let authToken: string;
  let clientId: string;
  let clientSecret: string;

  beforeAll(async () => {
    app = await build();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Register a user and get auth token for tests
    const uniqueUser = `oauthuser_${Date.now()}`;
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
    } else {
      // User might already exist, try to login
      const loginResponse = await app.inject({
        method: 'POST',
        url: '/auth/token',
        payload: {
          username: uniqueUser,
          password: 'password123',
        },
      });
      const body = JSON.parse(loginResponse.body);
      authToken = body.accessToken;
    }
  });

  describe('OAuth Client Registration', () => {
    it('should register a new OAuth client', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/oauth/register',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          name: 'Test OAuth Client',
          description: 'A test OAuth client',
          redirectUris: ['https://example.com/callback'],
          scopes: ['project:read', 'user:read'],
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.clientId).toBeDefined();
      expect(body.clientSecret).toBeDefined();
      expect(body.name).toBe('Test OAuth Client');
      expect(body.scopes).toEqual(['project:read', 'user:read']);

      // Store for later tests
      clientId = body.clientId;
      clientSecret = body.clientSecret;
    });

    it('should fail to register without authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/oauth/register',
        payload: {
          name: 'Test OAuth Client',
          redirectUris: ['https://example.com/callback'],
          scopes: ['project:read'],
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should fail with invalid scopes', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/oauth/register',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          name: 'Test OAuth Client',
          redirectUris: ['https://example.com/callback'],
          scopes: ['invalid:scope'],
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('OAuth Client Management', () => {
    let testClientId: string;

    beforeEach(async () => {
      // Create a test client
      const response = await app.inject({
        method: 'POST',
        url: '/oauth/register',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          name: 'Test Client for Management',
          redirectUris: ['https://example.com/callback'],
          scopes: ['project:read'],
        },
      });
      const body = JSON.parse(response.body);
      testClientId = body.id;
    });

    it('should list user OAuth clients', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/oauth/clients',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(Array.isArray(body)).toBe(true);
    });

    it('should get a specific OAuth client', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/oauth/clients/${testClientId}`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.id).toBe(testClientId);
    });

    it('should update an OAuth client', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/oauth/clients/${testClientId}`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          name: 'Updated Client Name',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.name).toBe('Updated Client Name');
    });

    it('should delete an OAuth client', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/oauth/clients/${testClientId}`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(204);
    });

    it('should regenerate client secret', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/oauth/clients/${testClientId}/secret`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.clientSecret).toBeDefined();
    });
  });

  describe('Token Revocation', () => {
    it('should revoke a token (or return 200 if not found)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/oauth/revoke',
        payload: {
          token: 'some-nonexistent-token',
        },
      });

      // Per RFC 7009, always returns 200
      expect(response.statusCode).toBe(200);
    });
  });

  describe('Token Introspection', () => {
    it('should return inactive for invalid token', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/oauth/introspect',
        payload: {
          token: 'invalid-token',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.active).toBe(false);
    });
  });
});
