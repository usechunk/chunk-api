import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../prisma.js';
import { AppError } from '../utils/errors.js';
import { generatePersonalAccessToken, hashToken } from '../utils/tokens.js';
import { patCreateSchema } from '../schemas/oauth.schema.js';

export async function patRoutes(server: FastifyInstance) {
  // Create a personal access token
  server.post(
    '/user/tokens',
    { onRequest: [server.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const payload = request.user as { sub: number };
      const body = patCreateSchema.parse(request.body);

      const { token, prefix } = generatePersonalAccessToken();
      const expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;

      if (expiresAt && expiresAt <= new Date()) {
        throw new AppError(400, 'Expiration date must be in the future');
      }

      const pat = await prisma.personalAccessToken.create({
        data: {
          name: body.name,
          token: hashToken(token),
          tokenPrefix: prefix,
          userId: payload.sub,
          scopes: body.scopes,
          expiresAt,
        },
      });

      return reply.code(201).send({
        id: pat.id,
        name: pat.name,
        token, // Only returned once at creation
        tokenPrefix: pat.tokenPrefix,
        scopes: pat.scopes,
        lastUsedAt: pat.lastUsedAt,
        expiresAt: pat.expiresAt,
        createdAt: pat.createdAt,
      });
    }
  );

  // List user's personal access tokens
  server.get(
    '/user/tokens',
    { onRequest: [server.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const payload = request.user as { sub: number };

      const tokens = await prisma.personalAccessToken.findMany({
        where: { userId: payload.sub },
        select: {
          id: true,
          name: true,
          tokenPrefix: true,
          scopes: true,
          lastUsedAt: true,
          expiresAt: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      return reply.send(tokens);
    }
  );

  // Get a specific personal access token
  server.get<{ Params: { id: string } }>(
    '/user/tokens/:id',
    { onRequest: [server.authenticate] },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const payload = request.user as { sub: number };
      const { id } = request.params;

      const token = await prisma.personalAccessToken.findFirst({
        where: { id, userId: payload.sub },
        select: {
          id: true,
          name: true,
          tokenPrefix: true,
          scopes: true,
          lastUsedAt: true,
          expiresAt: true,
          createdAt: true,
        },
      });

      if (!token) {
        throw new AppError(404, 'Personal access token not found');
      }

      return reply.send(token);
    }
  );

  // Delete a personal access token
  server.delete<{ Params: { id: string } }>(
    '/user/tokens/:id',
    { onRequest: [server.authenticate] },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const payload = request.user as { sub: number };
      const { id } = request.params;

      try {
        await prisma.personalAccessToken.delete({
          where: { id, userId: payload.sub },
        });
        return reply.code(204).send();
      } catch (error: unknown) {
        if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
          throw new AppError(404, 'Personal access token not found');
        }
        throw error;
      }
    }
  );
}
