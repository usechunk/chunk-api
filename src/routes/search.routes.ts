import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Prisma, ProjectType } from '@prisma/client';
import { prisma } from '../prisma.js';
import { projectTypeEnum } from '../schemas/modpack.schema.js';

export async function searchRoutes(server: FastifyInstance) {
  server.get('/search', async (request: FastifyRequest, reply: FastifyReply) => {
    const { q, mcVersion, loader, type, page = 1, limit = 20 } = request.query as {
      q?: string;
      mcVersion?: string;
      loader?: string;
      type?: string;
      page?: number;
      limit?: number;
    };

    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const where: Prisma.ModpackWhereInput = { isPublished: true };

    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ];
    }

    if (mcVersion) where.mcVersion = mcVersion;
    if (loader) where.loader = loader;
    if (type) {
      const parsed = projectTypeEnum.safeParse(type.toUpperCase());
      if (parsed.success) {
        where.projectType = parsed.data as ProjectType;
      }
    }

    const [modpacks, total] = await Promise.all([
      prisma.modpack.findMany({
        where,
        skip,
        take,
        include: {
          author: {
            select: {
              id: true,
              username: true,
            },
          },
        },
        orderBy: [{ downloads: 'desc' }, { createdAt: 'desc' }],
      }),
      prisma.modpack.count({ where }),
    ]);

    return reply.send({
      data: modpacks,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  });
}
