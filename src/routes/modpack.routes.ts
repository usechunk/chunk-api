import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../prisma.js';
import { AppError } from '../utils/errors.js';
import { generateSlug } from '../utils/slug.js';
import { modpackCreateSchema, modpackUpdateSchema } from '../schemas/modpack.schema.js';

interface ModpackParams {
  slug: string;
}

export async function modpackRoutes(server: FastifyInstance) {
  server.get('/modpacks', async (request: FastifyRequest, reply: FastifyReply) => {
    const { page = 1, limit = 20, mcVersion, loader } = request.query as {
      page?: number;
      limit?: number;
      mcVersion?: string;
      loader?: string;
    };

    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const where: any = { isPublished: true };
    if (mcVersion) where.mcVersion = mcVersion;
    if (loader) where.loader = loader;

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
        orderBy: { createdAt: 'desc' },
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

  server.get<{ Params: ModpackParams }>(
    '/modpacks/:slug',
    async (request: FastifyRequest<{ Params: ModpackParams }>, reply: FastifyReply) => {
      const { slug } = request.params;

      const modpack = await prisma.modpack.findUnique({
        where: { slug },
        include: {
          author: {
            select: {
              id: true,
              username: true,
            },
          },
          versions: {
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
        },
      });

      if (!modpack) {
        throw new AppError(404, 'Modpack not found');
      }

      if (!modpack.isPublished) {
        const payload = request.user as { sub: number } | undefined;
        if (!payload || payload.sub !== modpack.authorId) {
          throw new AppError(404, 'Modpack not found');
        }
      }

      return reply.send(modpack);
    }
  );

  server.post(
    '/modpacks',
    { onRequest: [server.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const payload = request.user as { sub: number };
      const body = modpackCreateSchema.parse(request.body);

      const slug = generateSlug(body.name);

      const existingModpack = await prisma.modpack.findUnique({
        where: { slug },
      });

      if (existingModpack) {
        throw new AppError(400, 'A modpack with this name already exists');
      }

      const modpack = await prisma.modpack.create({
        data: {
          name: body.name,
          slug,
          description: body.description,
          mcVersion: body.mcVersion,
          loader: body.loader,
          loaderVersion: body.loaderVersion,
          recommendedRamGb: body.recommendedRamGb,
          authorId: payload.sub,
        },
        include: {
          author: {
            select: {
              id: true,
              username: true,
            },
          },
        },
      });

      return reply.code(201).send(modpack);
    }
  );

  server.patch<{ Params: ModpackParams }>(
    '/modpacks/:slug',
    { onRequest: [server.authenticate] },
    async (request: FastifyRequest<{ Params: ModpackParams }>, reply: FastifyReply) => {
      const payload = request.user as { sub: number };
      const { slug } = request.params;
      const body = modpackUpdateSchema.parse(request.body);

      const modpack = await prisma.modpack.findUnique({
        where: { slug },
      });

      if (!modpack) {
        throw new AppError(404, 'Modpack not found');
      }

      if (modpack.authorId !== payload.sub) {
        throw new AppError(403, 'Not authorized to update this modpack');
      }

      const updateData: any = {};
      if (body.name) {
        updateData.name = body.name;
        updateData.slug = generateSlug(body.name);
      }
      if (body.description !== undefined) updateData.description = body.description;
      if (body.mcVersion) updateData.mcVersion = body.mcVersion;
      if (body.loader) updateData.loader = body.loader;
      if (body.loaderVersion !== undefined) updateData.loaderVersion = body.loaderVersion;
      if (body.recommendedRamGb) updateData.recommendedRamGb = body.recommendedRamGb;
      if (body.isPublished !== undefined) updateData.isPublished = body.isPublished;

      const updatedModpack = await prisma.modpack.update({
        where: { slug },
        data: updateData,
        include: {
          author: {
            select: {
              id: true,
              username: true,
            },
          },
        },
      });

      return reply.send(updatedModpack);
    }
  );

  server.delete<{ Params: ModpackParams }>(
    '/modpacks/:slug',
    { onRequest: [server.authenticate] },
    async (request: FastifyRequest<{ Params: ModpackParams }>, reply: FastifyReply) => {
      const payload = request.user as { sub: number };
      const { slug } = request.params;

      const modpack = await prisma.modpack.findUnique({
        where: { slug },
      });

      if (!modpack) {
        throw new AppError(404, 'Modpack not found');
      }

      if (modpack.authorId !== payload.sub) {
        throw new AppError(403, 'Not authorized to delete this modpack');
      }

      await prisma.modpack.delete({
        where: { slug },
      });

      return reply.code(204).send();
    }
  );
}
