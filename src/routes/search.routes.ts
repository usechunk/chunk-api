import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Prisma } from '@prisma/client';
import { prisma } from '../prisma.js';
import { projectTypeEnum } from '../schemas/modpack.schema.js';
import { parseTagSlugs } from '../utils/tags.js';

export async function searchRoutes(server: FastifyInstance) {
  server.get('/search', async (request: FastifyRequest, reply: FastifyReply) => {
    const { q, mcVersion, loader, type, tags, page = 1, limit = 20 } = request.query as {
      q?: string;
      mcVersion?: string;
      loader?: string;
      type?: string;
      tags?: string;
      page?: number;
      limit?: number;
    };

    // Validate pagination parameters with reasonable limits
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));

    const skip = (pageNum - 1) * limitNum;
    const take = limitNum;

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
        where.projectType = parsed.data;
      }
    }

    // Filter by tags (comma-separated slugs)
    // Uses OR filtering: returns projects that have ANY of the provided tags
    if (tags) {
      const tagSlugs = parseTagSlugs(tags).filter(s => s.length > 0);
      if (tagSlugs.length > 0) {
        where.tags = {
          some: {
            tag: {
              slug: { in: tagSlugs },
            },
          },
        };
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
          tags: {
            include: {
              tag: true,
            },
          },
        },
        orderBy: [{ downloads: 'desc' }, { createdAt: 'desc' }],
      }),
      prisma.modpack.count({ where }),
    ]);

    // Transform tags to flat array
    const transformedModpacks = modpacks.map((modpack) => ({
      ...modpack,
      tags: modpack.tags.map((pt) => pt.tag),
    }));

    return reply.send({
      data: transformedModpacks,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  });
}
