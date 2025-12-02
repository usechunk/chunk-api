import { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import { config } from '../config.js';
import { mkdir } from 'fs/promises';
import { resolve } from 'path';
import { prisma } from '../prisma.js';
import { hashToken } from '../utils/tokens.js';

export async function registerPlugins(server: FastifyInstance) {
  await server.register(cors, {
    origin: config.ALLOWED_ORIGINS === '*' ? true : config.ALLOWED_ORIGINS.split(','),
    credentials: true,
  });

  await server.register(jwt, {
    secret: config.JWT_SECRET,
  });

  await server.register(rateLimit, {
    max: config.RATE_LIMIT_MAX,
    timeWindow: config.RATE_LIMIT_TIMEWINDOW,
    errorResponseBuilder: (_req, context) => ({
      statusCode: 429,
      error: 'Too Many Requests',
      message: `Rate limit exceeded. Retry after ${context.after}`,
    }),
  });

  await server.register(multipart, {
    limits: {
      fileSize: config.MAX_FILE_SIZE,
    },
  });

  const uploadDir = resolve(config.UPLOAD_DIR);
  await mkdir(uploadDir, { recursive: true });

  await server.register(fastifyStatic, {
    root: uploadDir,
    prefix: '/uploads/',
  });

  server.decorate('authenticate', async function (request, reply) {
    const authHeader = request.headers.authorization;
    
    if (!authHeader) {
      reply.code(401).send({ error: 'Unauthorized', message: 'Invalid or missing token' });
      return;
    }

    const [scheme, token] = authHeader.split(' ');
    
    if (scheme !== 'Bearer' || !token) {
      reply.code(401).send({ error: 'Unauthorized', message: 'Invalid or missing token' });
      return;
    }

    // Check if it's a PAT (starts with chunk_)
    if (token.startsWith('chunk_')) {
      try {
        const tokenHash = hashToken(token);
        const pat = await prisma.personalAccessToken.findUnique({
          where: { token: tokenHash },
          include: { user: { select: { id: true, username: true, isActive: true } } },
        });

        if (!pat) {
          reply.code(401).send({ error: 'Unauthorized', message: 'Invalid personal access token' });
          return;
        }

        // Check if token has expired
        if (pat.expiresAt && pat.expiresAt < new Date()) {
          reply.code(401).send({ error: 'Unauthorized', message: 'Personal access token has expired' });
          return;
        }

        // Check if user is active
        if (!pat.user.isActive) {
          reply.code(401).send({ error: 'Unauthorized', message: 'User account is inactive' });
          return;
        }

        // Update lastUsedAt
        await prisma.personalAccessToken.update({
          where: { id: pat.id },
          data: { lastUsedAt: new Date() },
        });

        // Set user payload similar to JWT
        request.user = { sub: pat.user.id, username: pat.user.username, scopes: pat.scopes };
        return;
      } catch {
        reply.code(401).send({ error: 'Unauthorized', message: 'Invalid personal access token' });
        return;
      }
    }

    // Fall back to JWT verification
    try {
      await request.jwtVerify();
    } catch {
      reply.code(401).send({ error: 'Unauthorized', message: 'Invalid or missing token' });
    }
  });
}
