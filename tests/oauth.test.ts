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

  describe('OAuth Authorization Flow', () => {
    let testClientId: string;
    let testClientSecret: string;
    let testClientDbId: string;

    beforeEach(async () => {
      // Create a test client
      const response = await app.inject({
        method: 'POST',
        url: '/oauth/register',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          name: 'Flow Test Client',
          redirectUris: ['https://example.com/callback'],
          scopes: ['project:read', 'user:read'],
        },
      });
      const body = JSON.parse(response.body);
      testClientId = body.clientId;
      testClientSecret = body.clientSecret;
      testClientDbId = body.id;
    });

    it('should get authorization info', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/oauth/authorize?response_type=code&client_id=${testClientId}&redirect_uri=https://example.com/callback&scope=project:read`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.client.name).toBe('Flow Test Client');
      expect(body.scopes).toContain('project:read');
    });

    it('should reject invalid redirect_uri', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/oauth/authorize?response_type=code&client_id=${testClientId}&redirect_uri=https://evil.com/callback&scope=project:read`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should process consent and return authorization code', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/oauth/authorize',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          client_id: testClientId,
          redirect_uri: 'https://example.com/callback',
          scope: 'project:read user:read',
          consent: 'allow',
          state: 'teststate123',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.redirect_uri).toContain('code=');
      expect(body.redirect_uri).toContain('state=teststate123');
    });

    it('should handle consent denial', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/oauth/authorize',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          client_id: testClientId,
          redirect_uri: 'https://example.com/callback',
          consent: 'deny',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.redirect_uri).toContain('error=access_denied');
    });

    it('should exchange authorization code for tokens', async () => {
      // First, get an authorization code
      const authResponse = await app.inject({
        method: 'POST',
        url: '/oauth/authorize',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          client_id: testClientId,
          redirect_uri: 'https://example.com/callback',
          scope: 'project:read',
          consent: 'allow',
        },
      });

      const authBody = JSON.parse(authResponse.body);
      const redirectUrl = new URL(authBody.redirect_uri);
      const code = redirectUrl.searchParams.get('code');

      expect(code).toBeDefined();

      // Exchange code for tokens
      const tokenResponse = await app.inject({
        method: 'POST',
        url: '/oauth/token',
        payload: {
          grant_type: 'authorization_code',
          code,
          redirect_uri: 'https://example.com/callback',
          client_id: testClientId,
          client_secret: testClientSecret,
        },
      });

      expect(tokenResponse.statusCode).toBe(200);
      const tokenBody = JSON.parse(tokenResponse.body);
      expect(tokenBody.access_token).toBeDefined();
      expect(tokenBody.refresh_token).toBeDefined();
      expect(tokenBody.token_type).toBe('Bearer');
      expect(tokenBody.expires_in).toBe(3600);
    });

    it('should reject invalid authorization code', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/oauth/token',
        payload: {
          grant_type: 'authorization_code',
          code: 'invalid-code',
          redirect_uri: 'https://example.com/callback',
          client_id: testClientId,
          client_secret: testClientSecret,
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should use client_credentials grant', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/oauth/token',
        payload: {
          grant_type: 'client_credentials',
          client_id: testClientId,
          client_secret: testClientSecret,
          scope: 'project:read',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.access_token).toBeDefined();
      expect(body.token_type).toBe('Bearer');
    });

    it('should refresh tokens with rotation', async () => {
      // First get tokens via client_credentials
      const tokenResponse = await app.inject({
        method: 'POST',
        url: '/oauth/token',
        payload: {
          grant_type: 'client_credentials',
          client_id: testClientId,
          client_secret: testClientSecret,
        },
      });

      // Get an authorization code and exchange for refresh token
      const authResponse = await app.inject({
        method: 'POST',
        url: '/oauth/authorize',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          client_id: testClientId,
          redirect_uri: 'https://example.com/callback',
          consent: 'allow',
        },
      });

      const authBody = JSON.parse(authResponse.body);
      const redirectUrl = new URL(authBody.redirect_uri);
      const code = redirectUrl.searchParams.get('code');

      const initialTokenResponse = await app.inject({
        method: 'POST',
        url: '/oauth/token',
        payload: {
          grant_type: 'authorization_code',
          code,
          redirect_uri: 'https://example.com/callback',
          client_id: testClientId,
          client_secret: testClientSecret,
        },
      });

      const initialBody = JSON.parse(initialTokenResponse.body);
      const refreshToken = initialBody.refresh_token;

      // Now refresh the token
      const refreshResponse = await app.inject({
        method: 'POST',
        url: '/oauth/token',
        payload: {
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: testClientId,
          client_secret: testClientSecret,
        },
      });

      expect(refreshResponse.statusCode).toBe(200);
      const refreshBody = JSON.parse(refreshResponse.body);
      expect(refreshBody.access_token).toBeDefined();
      expect(refreshBody.refresh_token).toBeDefined();
      // New refresh token should be different (rotation)
      expect(refreshBody.refresh_token).not.toBe(refreshToken);
    });
  });
});
