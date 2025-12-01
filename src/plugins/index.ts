import { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import { config } from '../config.js';
import { mkdir } from 'fs/promises';
import { resolve } from 'path';

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
    errorResponseBuilder: (req, context) => ({
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
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.code(401).send({ error: 'Unauthorized', message: 'Invalid or missing token' });
    }
  });
}
