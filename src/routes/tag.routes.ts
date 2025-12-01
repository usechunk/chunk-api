import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../prisma.js';
import { AppError } from '../utils/errors.js';
import { generateSlug } from '../utils/slug.js';
import {
  tagCreateSchema,
  tagUpdateSchema,
  tagTypeEnum,
  projectTagsSchema,
} from '../schemas/tag.schema.js';

interface TagParams {
  id: string;
}

interface ProjectTagParams {
  slug: string;
}

interface ProjectTagRemoveParams {
  slug: string;
  tagId: string;
}

export async function tagRoutes(server: FastifyInstance) {
  // List all tags with optional type filter
  server.get('/tags', async (request: FastifyRequest, reply: FastifyReply) => {
    const { type } = request.query as { type?: string };

    const where: { type?: 'LOADER' | 'CATEGORY' | 'GAME_VERSION' | 'CUSTOM' } = {};
    if (type) {
      const parsed = tagTypeEnum.safeParse(type.toUpperCase());
      if (parsed.success) {
        where.type = parsed.data;
      }
    }

    const tags = await prisma.tag.findMany({
      where,
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });

    return reply.send(tags);
  });

  // Get a single tag by ID
  server.get<{ Params: TagParams }>(
    '/tags/:id',
    async (request: FastifyRequest<{ Params: TagParams }>, reply: FastifyReply) => {
      const { id } = request.params;
      const tagId = parseInt(id, 10);

      if (isNaN(tagId)) {
        throw new AppError(400, 'Invalid tag ID');
      }

      const tag = await prisma.tag.findUnique({
        where: { id: tagId },
      });

      if (!tag) {
        throw new AppError(404, 'Tag not found');
      }

      return reply.send(tag);
    }
  );

  // Create a new tag (admin only in production, but for now allow authenticated users)
  server.post(
    '/tags',
    { onRequest: [server.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = tagCreateSchema.parse(request.body);

      const slug = body.slug ?? generateSlug(body.name);

      const existingTag = await prisma.tag.findUnique({
        where: { slug },
      });

      if (existingTag) {
        throw new AppError(400, 'A tag with this slug already exists');
      }

      const tag = await prisma.tag.create({
        data: {
          name: body.name,
          slug,
          type: body.type,
          color: body.color,
          icon: body.icon,
        },
      });

      return reply.code(201).send(tag);
    }
  );

  // Update a tag
  server.patch<{ Params: TagParams }>(
    '/tags/:id',
    { onRequest: [server.authenticate] },
    async (request: FastifyRequest<{ Params: TagParams }>, reply: FastifyReply) => {
      const { id } = request.params;
      const tagId = parseInt(id, 10);

      if (isNaN(tagId)) {
        throw new AppError(400, 'Invalid tag ID');
      }

      const body = tagUpdateSchema.parse(request.body);

      const tag = await prisma.tag.findUnique({
        where: { id: tagId },
      });

      if (!tag) {
        throw new AppError(404, 'Tag not found');
      }

      const updatedTag = await prisma.tag.update({
        where: { id: tagId },
        data: {
          ...(body.name && { name: body.name }),
          ...(body.color !== undefined && { color: body.color }),
          ...(body.icon !== undefined && { icon: body.icon }),
        },
      });

      return reply.send(updatedTag);
    }
  );

  // Delete a tag
  server.delete<{ Params: TagParams }>(
    '/tags/:id',
    { onRequest: [server.authenticate] },
    async (request: FastifyRequest<{ Params: TagParams }>, reply: FastifyReply) => {
      const { id } = request.params;
      const tagId = parseInt(id, 10);

      if (isNaN(tagId)) {
        throw new AppError(400, 'Invalid tag ID');
      }

      const tag = await prisma.tag.findUnique({
        where: { id: tagId },
      });

      if (!tag) {
        throw new AppError(404, 'Tag not found');
      }

      await prisma.tag.delete({
        where: { id: tagId },
      });

      return reply.code(204).send();
    }
  );

  // Add tags to a project
  server.post<{ Params: ProjectTagParams }>(
    '/modpacks/:slug/tags',
    { onRequest: [server.authenticate] },
    async (request: FastifyRequest<{ Params: ProjectTagParams }>, reply: FastifyReply) => {
      const payload = request.user as { sub: number };
      const { slug } = request.params;
      const body = projectTagsSchema.parse(request.body);

      const modpack = await prisma.modpack.findUnique({
        where: { slug },
      });

      if (!modpack) {
        throw new AppError(404, 'Modpack not found');
      }

      if (modpack.authorId !== payload.sub) {
        throw new AppError(403, 'Not authorized to modify this modpack');
      }

      // Verify all tags exist
      const tags = await prisma.tag.findMany({
        where: { id: { in: body.tagIds } },
      });

      if (tags.length !== body.tagIds.length) {
        throw new AppError(400, 'One or more tags not found');
      }

      // Add tags (ignore duplicates)
      await prisma.projectTag.createMany({
        data: body.tagIds.map((tagId) => ({
          projectId: modpack.id,
          tagId,
        })),
        skipDuplicates: true,
      });

      // Return updated modpack with tags
      const updatedModpack = await prisma.modpack.findUnique({
        where: { slug },
        include: {
          tags: {
            include: {
              tag: true,
            },
          },
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

  // Remove a tag from a project
  server.delete<{ Params: ProjectTagRemoveParams }>(
    '/modpacks/:slug/tags/:tagId',
    { onRequest: [server.authenticate] },
    async (request: FastifyRequest<{ Params: ProjectTagRemoveParams }>, reply: FastifyReply) => {
      const payload = request.user as { sub: number };
      const { slug, tagId: tagIdStr } = request.params;
      const tagId = parseInt(tagIdStr, 10);

      if (isNaN(tagId)) {
        throw new AppError(400, 'Invalid tag ID');
      }

      const modpack = await prisma.modpack.findUnique({
        where: { slug },
      });

      if (!modpack) {
        throw new AppError(404, 'Modpack not found');
      }

      if (modpack.authorId !== payload.sub) {
        throw new AppError(403, 'Not authorized to modify this modpack');
      }

      const projectTag = await prisma.projectTag.findUnique({
        where: {
          projectId_tagId: {
            projectId: modpack.id,
            tagId,
          },
        },
      });

      if (!projectTag) {
        throw new AppError(404, 'Tag not associated with this modpack');
      }

      await prisma.projectTag.delete({
        where: {
          projectId_tagId: {
            projectId: modpack.id,
            tagId,
          },
        },
      });

      return reply.code(204).send();
    }
  );

  // Get tags for a specific project
  server.get<{ Params: ProjectTagParams }>(
    '/modpacks/:slug/tags',
    async (request: FastifyRequest<{ Params: ProjectTagParams }>, reply: FastifyReply) => {
      const { slug } = request.params;

      const modpack = await prisma.modpack.findUnique({
        where: { slug },
        include: {
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

      const tags = modpack.tags.map((pt) => pt.tag);

      return reply.send(tags);
    }
  );
}
