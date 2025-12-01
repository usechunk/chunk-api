import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../prisma.js';
import { AppError } from '../utils/errors.js';

interface ProjectParams {
  username: string;
}

export async function projectRoutes(server: FastifyInstance) {
  server.get<{ Params: ProjectParams }>(
    '/projects/:username',
    async (request: FastifyRequest<{ Params: ProjectParams }>, reply: FastifyReply) => {
      const { username } = request.params;

      const user = await prisma.user.findUnique({
        where: { username },
        select: { id: true },
      });

      if (!user) {
        throw new AppError(404, 'User not found');
      }

      const payload = request.user as { sub: number } | undefined;
      const isOwner = payload?.sub === user.id;

      const modpacks = await prisma.modpack.findMany({
        where: {
          authorId: user.id,
          ...(isOwner ? {} : { isPublished: true }),
        },
        include: {
          author: {
            select: {
              id: true,
              username: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return reply.send(modpacks);
    }
  );
}
