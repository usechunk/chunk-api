import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Prisma, ProjectType } from '@prisma/client';
import { prisma } from '../prisma.js';
import { AppError } from '../utils/errors.js';
import { projectTypeEnum } from '../schemas/modpack.schema.js';

interface ProjectParams {
  username: string;
}

export async function projectRoutes(server: FastifyInstance) {
  server.get<{ Params: ProjectParams }>(
    '/projects/:username',
    async (request: FastifyRequest<{ Params: ProjectParams }>, reply: FastifyReply) => {
      const { username } = request.params;
      const { type } = request.query as { type?: string };

      const user = await prisma.user.findUnique({
        where: { username },
        select: { id: true },
      });

      if (!user) {
        throw new AppError(404, 'User not found');
      }

      const payload = request.user as { sub: number } | undefined;
      const isOwner = payload?.sub === user.id;

      const where: Prisma.ModpackWhereInput = {
        authorId: user.id,
        ...(isOwner ? {} : { isPublished: true }),
      };

      if (type) {
        const parsed = projectTypeEnum.safeParse(type.toUpperCase());
        if (parsed.success) {
          where.projectType = parsed.data as ProjectType;
        }
      }

      const modpacks = await prisma.modpack.findMany({
        where,
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
