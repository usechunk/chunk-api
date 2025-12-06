import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../prisma.js';
import { AppError } from '../utils/errors.js';
import {
  generateClientId,
  generateClientSecret,
  generateAuthorizationCode,
  generateAccessToken,
  generateRefreshToken,
  hashToken,
  verifyToken,
} from '../utils/tokens.js';
import {
  oauthClientCreateSchema,
  oauthClientUpdateSchema,
  authorizeRequestSchema,
  authorizeConsentSchema,
  tokenRequestSchema,
  revokeRequestSchema,
  introspectRequestSchema,
  VALID_SCOPES,
} from '../schemas/oauth.schema.js';

// Token expiration times
const ACCESS_TOKEN_EXPIRES_IN = 3600; // 1 hour in seconds
const REFRESH_TOKEN_EXPIRES_IN = 30 * 24 * 60 * 60; // 30 days in seconds
const AUTHORIZATION_CODE_EXPIRES_IN = 10 * 60; // 10 minutes in seconds

// Helper to check if a scope is valid
const validScopesSet = new Set<string>(VALID_SCOPES);
function isValidScope(scope: string): boolean {
  return validScopesSet.has(scope);
}

/**
 * OAuth2 routes for client registration, authorization, token exchange, and management.
 * 
 * Rate limiting: All routes are protected by the global rate limiter registered in plugins/index.ts.
 * Sensitive endpoints (/oauth/token, /oauth/authorize POST) have additional stricter rate limits.
 */
export async function oauthRoutes(server: FastifyInstance) {
  // Register a new OAuth client
  server.post(
    '/oauth/register',
    { onRequest: [server.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const payload = request.user as { sub: number };
      const body = oauthClientCreateSchema.parse(request.body);

      const clientId = generateClientId();
      const clientSecret = generateClientSecret();

      const client = await prisma.oAuthClient.create({
        data: {
          clientId,
          clientSecret: hashToken(clientSecret),
          name: body.name,
          description: body.description,
          redirectUris: body.redirectUris,
          scopes: body.scopes,
          userId: payload.sub,
        },
      });

      return reply.code(201).send({
        id: client.id,
        clientId: client.clientId,
        clientSecret, // Only returned once at creation
        name: client.name,
        description: client.description,
        redirectUris: client.redirectUris,
        scopes: client.scopes,
        createdAt: client.createdAt,
        updatedAt: client.updatedAt,
      });
    }
  );

  // List user's OAuth clients
  server.get(
    '/oauth/clients',
    { onRequest: [server.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const payload = request.user as { sub: number };

      const clients = await prisma.oAuthClient.findMany({
        where: { userId: payload.sub },
        select: {
          id: true,
          clientId: true,
          name: true,
          description: true,
          redirectUris: true,
          scopes: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      return reply.send(clients);
    }
  );

  // Get a specific OAuth client
  server.get<{ Params: { id: string } }>(
    '/oauth/clients/:id',
    { onRequest: [server.authenticate] },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const payload = request.user as { sub: number };
      const { id } = request.params;

      const client = await prisma.oAuthClient.findFirst({
        where: { id, userId: payload.sub },
        select: {
          id: true,
          clientId: true,
          name: true,
          description: true,
          redirectUris: true,
          scopes: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!client) {
        throw new AppError(404, 'OAuth client not found');
      }

      return reply.send(client);
    }
  );

  // Update an OAuth client
  server.patch<{ Params: { id: string } }>(
    '/oauth/clients/:id',
    { onRequest: [server.authenticate] },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const payload = request.user as { sub: number };
      const { id } = request.params;
      const body = oauthClientUpdateSchema.parse(request.body);

      try {
        const updatedClient = await prisma.oAuthClient.update({
          where: { id, userId: payload.sub },
          data: body,
          select: {
            id: true,
            clientId: true,
            name: true,
            description: true,
            redirectUris: true,
            scopes: true,
            createdAt: true,
            updatedAt: true,
          },
        });

        return reply.send(updatedClient);
      } catch (error: unknown) {
        if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
          throw new AppError(404, 'OAuth client not found');
        }
        throw error;
      }
    }
  );

  // Delete an OAuth client
  server.delete<{ Params: { id: string } }>(
    '/oauth/clients/:id',
    { onRequest: [server.authenticate] },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const payload = request.user as { sub: number };
      const { id } = request.params;

      try {
        await prisma.oAuthClient.delete({
          where: { id, userId: payload.sub },
        });
        return reply.code(204).send();
      } catch (error: unknown) {
        if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
          throw new AppError(404, 'OAuth client not found');
        }
        throw error;
      }
    }
  );

  // Regenerate client secret
  server.post<{ Params: { id: string } }>(
    '/oauth/clients/:id/secret',
    { onRequest: [server.authenticate] },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const payload = request.user as { sub: number };
      const { id } = request.params;

      const client = await prisma.oAuthClient.findFirst({
        where: { id, userId: payload.sub },
      });

      if (!client) {
        throw new AppError(404, 'OAuth client not found');
      }

      const newSecret = generateClientSecret();

      await prisma.oAuthClient.update({
        where: { id },
        data: { clientSecret: hashToken(newSecret) },
      });

      return reply.send({ clientSecret: newSecret });
    }
  );

  // Authorization endpoint (GET - shows authorization screen info)
  server.get<{ Querystring: Record<string, string> }>(
    '/oauth/authorize',
    {
      onRequest: [server.authenticate],
      config: {
        rateLimit: {
          max: 30,
          timeWindow: '1 minute',
        },
      },
    },
    async (request: FastifyRequest<{ Querystring: Record<string, string> }>, reply: FastifyReply) => {
      const query = authorizeRequestSchema.parse(request.query);

      const client = await prisma.oAuthClient.findUnique({
        where: { clientId: query.client_id },
        select: {
          id: true,
          name: true,
          description: true,
          redirectUris: true,
          scopes: true,
        },
      });

      if (!client) {
        throw new AppError(400, 'invalid_client');
      }

      if (!client.redirectUris.includes(query.redirect_uri)) {
        throw new AppError(400, 'invalid_redirect_uri');
      }

      // Parse and validate requested scopes
      const requestedScopes = query.scope ? query.scope.split(' ') : client.scopes;
      const validScopes = requestedScopes.filter((s) => 
        isValidScope(s) && client.scopes.includes(s)
      );

      if (validScopes.length === 0) {
        throw new AppError(400, 'invalid_scope');
      }

      // Return client info for consent screen
      return reply.send({
        client: {
          name: client.name,
          description: client.description,
        },
        scopes: validScopes,
        redirect_uri: query.redirect_uri,
        state: query.state,
      });
    }
  );

  // Authorization endpoint (POST - process consent) - with stricter rate limiting for security
  server.post<{ Querystring: Record<string, string> }>(
    '/oauth/authorize',
    {
      onRequest: [server.authenticate],
      config: {
        rateLimit: {
          max: 30,
          timeWindow: '1 minute',
        },
      },
    },
    async (request: FastifyRequest<{ Querystring: Record<string, string> }>, reply: FastifyReply) => {
      const payload = request.user as { sub: number };
      const body = authorizeConsentSchema.parse(request.body);

      const client = await prisma.oAuthClient.findUnique({
        where: { clientId: body.client_id },
        select: {
          id: true,
          redirectUris: true,
          scopes: true,
        },
      });

      if (!client) {
        throw new AppError(400, 'invalid_client');
      }

      if (!client.redirectUris.includes(body.redirect_uri)) {
        throw new AppError(400, 'invalid_redirect_uri');
      }

      // User denied access
      if (body.consent === 'deny') {
        const redirectUrl = new URL(body.redirect_uri);
        redirectUrl.searchParams.set('error', 'access_denied');
        if (body.state) {
          redirectUrl.searchParams.set('state', body.state);
        }
        return reply.send({ redirect_uri: redirectUrl.toString() });
      }

      // Parse and validate requested scopes
      const requestedScopes = body.scope ? body.scope.split(' ') : client.scopes;
      const validScopes = requestedScopes.filter((s) =>
        isValidScope(s) && client.scopes.includes(s)
      );

      if (validScopes.length === 0) {
        throw new AppError(400, 'invalid_scope');
      }

      // Generate authorization code
      const code = generateAuthorizationCode();
      const expiresAt = new Date(Date.now() + AUTHORIZATION_CODE_EXPIRES_IN * 1000);

      await prisma.authorizationCode.create({
        data: {
          code: hashToken(code),
          userId: payload.sub,
          clientId: client.id,
          redirectUri: body.redirect_uri,
          scopes: validScopes,
          expiresAt,
        },
      });

      const redirectUrl = new URL(body.redirect_uri);
      redirectUrl.searchParams.set('code', code);
      if (body.state) {
        redirectUrl.searchParams.set('state', body.state);
      }

      return reply.send({ redirect_uri: redirectUrl.toString() });
    }
  );

  // Token endpoint - with stricter rate limiting for security
  server.post(
    '/oauth/token',
    {
      config: {
        rateLimit: {
          max: 20,
          timeWindow: '1 minute',
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = tokenRequestSchema.parse(request.body);

      if (body.grant_type === 'authorization_code') {
        return handleAuthorizationCodeGrant(body, reply);
      } else if (body.grant_type === 'refresh_token') {
        return handleRefreshTokenGrant(body, reply);
      } else if (body.grant_type === 'client_credentials') {
        return handleClientCredentialsGrant(body, reply);
      }

      throw new AppError(400, 'unsupported_grant_type');
    }
  );

  // Token revocation endpoint - supports optional client authentication
  server.post(
    '/oauth/revoke',
    {
      config: {
        rateLimit: {
          max: 20,
          timeWindow: '1 minute',
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = revokeRequestSchema.parse(request.body);
      
      // Validate client credentials if provided
      if (body.client_id && body.client_secret) {
        const client = await prisma.oAuthClient.findUnique({
          where: { clientId: body.client_id },
        });
        
        if (!client || !verifyToken(body.client_secret, client.clientSecret)) {
          throw new AppError(401, 'invalid_client');
        }
      }
      
      const tokenHash = hashToken(body.token);

      // Try to revoke as access token
      const accessToken = await prisma.accessToken.findUnique({
        where: { token: tokenHash },
      });

      if (accessToken) {
        await prisma.accessToken.delete({ where: { id: accessToken.id } });
        return reply.code(200).send({});
      }

      // Try to revoke as refresh token
      const refreshToken = await prisma.refreshToken.findUnique({
        where: { token: tokenHash },
      });

      if (refreshToken) {
        await prisma.refreshToken.delete({ where: { id: refreshToken.id } });
        return reply.code(200).send({});
      }

      // Per RFC 7009, we return 200 even if token doesn't exist
      return reply.code(200).send({});
    }
  );

  // Token introspection endpoint - supports optional client authentication
  server.post(
    '/oauth/introspect',
    {
      config: {
        rateLimit: {
          max: 20,
          timeWindow: '1 minute',
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = introspectRequestSchema.parse(request.body);
      
      // Validate client credentials if provided
      if (body.client_id && body.client_secret) {
        const client = await prisma.oAuthClient.findUnique({
          where: { clientId: body.client_id },
        });
        
        if (!client || !verifyToken(body.client_secret, client.clientSecret)) {
          throw new AppError(401, 'invalid_client');
        }
      }

      const tokenHash = hashToken(body.token);

      // Check access tokens
      const accessToken = await prisma.accessToken.findUnique({
        where: { token: tokenHash },
        include: {
          user: { select: { username: true } },
          client: { select: { clientId: true } },
        },
      });

      if (accessToken) {
        const now = new Date();
        const isActive = accessToken.expiresAt > now;

        return reply.send({
          active: isActive,
          scope: accessToken.scopes.join(' '),
          client_id: accessToken.client?.clientId,
          username: accessToken.user.username,
          token_type: 'Bearer',
          exp: Math.floor(accessToken.expiresAt.getTime() / 1000),
          iat: Math.floor(accessToken.createdAt.getTime() / 1000),
          sub: String(accessToken.userId),
        });
      }

      // Check refresh tokens
      const refreshToken = await prisma.refreshToken.findUnique({
        where: { token: tokenHash },
        include: { user: { select: { username: true } } },
      });

      if (refreshToken) {
        const now = new Date();
        const isActive = refreshToken.expiresAt > now;

        return reply.send({
          active: isActive,
          scope: refreshToken.scopes.join(' '),
          username: refreshToken.user.username,
          token_type: 'refresh_token',
          exp: Math.floor(refreshToken.expiresAt.getTime() / 1000),
          iat: Math.floor(refreshToken.createdAt.getTime() / 1000),
          sub: String(refreshToken.userId),
        });
      }

      // Token not found
      return reply.send({ active: false });
    }
  );
}

async function handleAuthorizationCodeGrant(
  body: { grant_type: 'authorization_code'; code: string; redirect_uri: string; client_id: string; client_secret: string },
  reply: FastifyReply
) {
  const codeHash = hashToken(body.code);

  // Find the authorization code
  const authCode = await prisma.authorizationCode.findUnique({
    where: { code: codeHash },
  });

  if (!authCode) {
    throw new AppError(400, 'invalid_grant');
  }

  // Check if code has expired
  if (authCode.expiresAt < new Date()) {
    await prisma.authorizationCode.delete({ where: { id: authCode.id } });
    throw new AppError(400, 'invalid_grant');
  }

  // Verify redirect URI
  if (authCode.redirectUri !== body.redirect_uri) {
    throw new AppError(400, 'invalid_grant');
  }

  // Verify client
  const client = await prisma.oAuthClient.findUnique({
    where: { clientId: body.client_id },
  });

  if (!client || client.id !== authCode.clientId) {
    throw new AppError(400, 'invalid_client');
  }

  // Verify client secret
  if (!verifyToken(body.client_secret, client.clientSecret)) {
    throw new AppError(400, 'invalid_client');
  }

  // Generate tokens
  const accessToken = generateAccessToken();
  const refreshToken = generateRefreshToken();
  const accessTokenExpiresAt = new Date(Date.now() + ACCESS_TOKEN_EXPIRES_IN * 1000);
  const refreshTokenExpiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_IN * 1000);

  // Delete authorization code and create tokens atomically using transaction
  await prisma.$transaction([
    prisma.authorizationCode.delete({ where: { id: authCode.id } }),
    prisma.accessToken.create({
      data: {
        token: hashToken(accessToken),
        userId: authCode.userId,
        clientId: client.id,
        scopes: authCode.scopes,
        expiresAt: accessTokenExpiresAt,
      },
    }),
    prisma.refreshToken.create({
      data: {
        token: hashToken(refreshToken),
        userId: authCode.userId,
        clientId: client.id,
        scopes: authCode.scopes,
        expiresAt: refreshTokenExpiresAt,
      },
    }),
  ]);

  return reply.send({
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: ACCESS_TOKEN_EXPIRES_IN,
    refresh_token: refreshToken,
    scope: authCode.scopes.join(' '),
  });
}

async function handleRefreshTokenGrant(
  body: { grant_type: 'refresh_token'; refresh_token: string; client_id: string; client_secret: string },
  reply: FastifyReply
) {
  const tokenHash = hashToken(body.refresh_token);

  // Find the refresh token
  const storedRefreshToken = await prisma.refreshToken.findUnique({
    where: { token: tokenHash },
  });

  if (!storedRefreshToken) {
    throw new AppError(400, 'invalid_grant');
  }

  // Check if token has expired
  if (storedRefreshToken.expiresAt < new Date()) {
    await prisma.refreshToken.delete({ where: { id: storedRefreshToken.id } });
    throw new AppError(400, 'invalid_grant');
  }

  // Verify client
  const client = await prisma.oAuthClient.findUnique({
    where: { clientId: body.client_id },
  });

  if (!client) {
    throw new AppError(400, 'invalid_client');
  }

  // Verify client secret
  if (!verifyToken(body.client_secret, client.clientSecret)) {
    throw new AppError(400, 'invalid_client');
  }

  // Verify the refresh token belongs to this client (if it was issued to a specific client)
  // Tokens without a clientId (e.g., from future PAT-to-refresh scenarios) skip this check
  if (storedRefreshToken.clientId && storedRefreshToken.clientId !== client.id) {
    throw new AppError(400, 'invalid_grant');
  }

  // Generate new access token and refresh token
  const accessToken = generateAccessToken();
  const newRefreshToken = generateRefreshToken();
  const accessTokenExpiresAt = new Date(Date.now() + ACCESS_TOKEN_EXPIRES_IN * 1000);
  const refreshTokenExpiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_IN * 1000);

  // Rotate refresh token atomically: delete old and create new tokens in a transaction
  await prisma.$transaction([
    prisma.refreshToken.delete({ where: { id: storedRefreshToken.id } }),
    prisma.accessToken.create({
      data: {
        token: hashToken(accessToken),
        userId: storedRefreshToken.userId,
        clientId: client.id,
        scopes: storedRefreshToken.scopes,
        expiresAt: accessTokenExpiresAt,
      },
    }),
    prisma.refreshToken.create({
      data: {
        token: hashToken(newRefreshToken),
        userId: storedRefreshToken.userId,
        clientId: client.id,
        scopes: storedRefreshToken.scopes,
        expiresAt: refreshTokenExpiresAt,
      },
    }),
  ]);

  return reply.send({
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: ACCESS_TOKEN_EXPIRES_IN,
    refresh_token: newRefreshToken,
    scope: storedRefreshToken.scopes.join(' '),
  });
}

async function handleClientCredentialsGrant(
  body: { grant_type: 'client_credentials'; client_id: string; client_secret: string; scope?: string },
  reply: FastifyReply
) {
  // Verify client
  const client = await prisma.oAuthClient.findUnique({
    where: { clientId: body.client_id },
  });

  if (!client) {
    throw new AppError(400, 'invalid_client');
  }

  // Verify client secret
  if (!verifyToken(body.client_secret, client.clientSecret)) {
    throw new AppError(400, 'invalid_client');
  }

  // Parse and validate requested scopes
  const requestedScopes = body.scope ? body.scope.split(' ') : client.scopes;
  const validScopes = requestedScopes.filter((s) =>
    isValidScope(s) && client.scopes.includes(s)
  );

  if (validScopes.length === 0) {
    throw new AppError(400, 'invalid_scope');
  }

  // Generate access token
  const accessToken = generateAccessToken();
  const accessTokenExpiresAt = new Date(Date.now() + ACCESS_TOKEN_EXPIRES_IN * 1000);

  await prisma.accessToken.create({
    data: {
      token: hashToken(accessToken),
      userId: client.userId,
      clientId: client.id,
      scopes: validScopes,
      expiresAt: accessTokenExpiresAt,
    },
  });

  return reply.send({
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: ACCESS_TOKEN_EXPIRES_IN,
    scope: validScopes.join(' '),
  });
}
