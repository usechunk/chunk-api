import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Prisma } from '@prisma/client';
import { prisma } from '../prisma.js';
import { AppError } from '../utils/errors.js';
import { generateSlug } from '../utils/slug.js';
import { parseTagSlugs } from '../utils/tags.js';
import { getLicensesByCategory, addLicenseInfo } from '../utils/license.js';
import { indexProjectById, updateProjectInIndex, removeProjectById } from '../utils/indexing.js';
import { modpackCreateSchema, modpackUpdateSchema, projectTypeEnum } from '../schemas/modpack.schema.js';

interface ModpackParams {
  slug: string;
}

export async function modpackRoutes(server: FastifyInstance) {
  server.get('/modpacks', async (request: FastifyRequest, reply: FastifyReply) => {
    const { page = 1, limit = 20, mcVersion, loader, type, tags, license, licenseCategory } = request.query as {
      page?: number;
      limit?: number;
      mcVersion?: string;
      loader?: string;
      type?: string;
      tags?: string;
      license?: string;
      licenseCategory?: string;
    };

    // Validate pagination parameters with reasonable limits
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));

    const skip = (pageNum - 1) * limitNum;
    const take = limitNum;

    const where: Prisma.ModpackWhereInput = { isPublished: true };
    if (mcVersion) where.mcVersion = mcVersion;
    if (loader) where.loader = loader;
    if (type) {
      const parsed = projectTypeEnum.safeParse(type.toUpperCase());
      if (parsed.success) {
        where.projectType = parsed.data;
      }
    }

    // Filter by license category (permissive, copyleft, etc.)
    // Note: licenseCategory takes precedence over license if both are provided
    if (licenseCategory) {
      const licensesInCategory = getLicensesByCategory(licenseCategory);
      if (licensesInCategory.length > 0) {
        where.licenseId = { in: licensesInCategory };
      }
    } else if (license) {
      // Filter by specific license (only if licenseCategory is not provided)
      where.licenseId = license;
    }

    // Filter by tags (comma-separated slugs)
    if (tags) {
      const tagSlugs = parseTagSlugs(tags);
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
        orderBy: { createdAt: 'desc' },
      }),
      prisma.modpack.count({ where }),
    ]);

    // Transform tags to flat array and add license info
    const transformedModpacks = modpacks.map((modpack) => 
      addLicenseInfo({
        ...modpack,
        tags: modpack.tags.map((pt) => pt.tag),
      })
    );

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
          tags: {
            include: {
              tag: true,
            },
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

      // Transform tags to flat array and add license info
      const transformedModpack = addLicenseInfo({
        ...modpack,
        tags: modpack.tags.map((pt) => pt.tag),
      });

      return reply.send(transformedModpack);
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
          projectType: body.projectType,
          mcVersion: body.mcVersion,
          loader: body.loader,
          loaderVersion: body.loaderVersion,
          recommendedRamGb: body.recommendedRamGb,
          licenseId: body.licenseId,
          licenseUrl: body.licenseUrl,
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

      // Index the project in search (async, non-blocking)
      // Note: Projects are only indexed when published
      indexProjectById(modpack.id).catch((err) => {
        server.log.error(err, 'Failed to index project in search');
      });

      return reply.code(201).send(addLicenseInfo(modpack));
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

      const updateData: Prisma.ModpackUpdateInput = {};
      if (body.name) {
        updateData.name = body.name;
        updateData.slug = generateSlug(body.name);
      }
      if (body.description !== undefined) updateData.description = body.description;
      if (body.projectType) updateData.projectType = body.projectType;
      if (body.mcVersion) updateData.mcVersion = body.mcVersion;
      if (body.loader) updateData.loader = body.loader;
      if (body.loaderVersion !== undefined) updateData.loaderVersion = body.loaderVersion;
      if (body.recommendedRamGb) updateData.recommendedRamGb = body.recommendedRamGb;
      if (body.isPublished !== undefined) updateData.isPublished = body.isPublished;
      if (body.licenseId !== undefined) updateData.licenseId = body.licenseId;
      if (body.licenseUrl !== undefined) updateData.licenseUrl = body.licenseUrl;

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

      // Update the project in search index (async, non-blocking)
      updateProjectInIndex(updatedModpack.id).catch((err) => {
        server.log.error(err, 'Failed to update project in search index');
      });

      return reply.send(addLicenseInfo(updatedModpack));
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

      // Remove the project from search index (async, non-blocking)
      removeProjectById(modpack.id).catch((err) => {
        server.log.error(err, 'Failed to remove project from search index');
      });

      return reply.code(204).send();
    }
  );
}
