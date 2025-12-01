import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../prisma.js';
import { AppError } from '../utils/errors.js';
import { versionCreateSchema, versionUpdateSchema } from '../schemas/version.schema.js';

interface VersionParams {
  slug: string;
  versionId?: string;
}

export async function versionRoutes(server: FastifyInstance) {
  server.get<{ Params: { slug: string } }>(
    '/modpacks/:slug/versions',
    async (request: FastifyRequest<{ Params: { slug: string } }>, reply: FastifyReply) => {
      const { slug } = request.params;

      const modpack = await prisma.modpack.findUnique({
        where: { slug },
        select: { id: true, isPublished: true, authorId: true },
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

      const versions = await prisma.modpackVersion.findMany({
        where: { modpackId: modpack.id },
        orderBy: { createdAt: 'desc' },
      });

      return reply.send(versions);
    }
  );

  server.get<{ Params: { slug: string; versionId: string } }>(
    '/modpacks/:slug/versions/:versionId',
    async (
      request: FastifyRequest<{ Params: { slug: string; versionId: string } }>,
      reply: FastifyReply
    ) => {
      const { slug, versionId } = request.params;

      const modpack = await prisma.modpack.findUnique({
        where: { slug },
        select: { id: true, isPublished: true, authorId: true },
      });

      if (!modpack) {
        throw new AppError(404, 'Modpack not found');
      }

      const version = await prisma.modpackVersion.findFirst({
        where: {
          id: Number(versionId),
          modpackId: modpack.id,
        },
      });

      if (!version) {
        throw new AppError(404, 'Version not found');
      }

      if (!modpack.isPublished) {
        const payload = request.user as { sub: number } | undefined;
        if (!payload || payload.sub !== modpack.authorId) {
          throw new AppError(404, 'Version not found');
        }
      }

      return reply.send(version);
    }
  );

  server.post<{ Params: { slug: string } }>(
    '/modpacks/:slug/versions',
    { onRequest: [server.authenticate] },
    async (request: FastifyRequest<{ Params: { slug: string } }>, reply: FastifyReply) => {
      const payload = request.user as { sub: number };
      const { slug } = request.params;
      const body = versionCreateSchema.parse(request.body);

      const modpack = await prisma.modpack.findUnique({
        where: { slug },
        select: { id: true, authorId: true },
      });

      if (!modpack) {
        throw new AppError(404, 'Modpack not found');
      }

      if (modpack.authorId !== payload.sub) {
        throw new AppError(403, 'Not authorized to create versions for this modpack');
      }

      const version = await prisma.modpackVersion.create({
        data: {
          modpackId: modpack.id,
          version: body.version,
          mcVersion: body.mcVersion,
          loader: body.loader,
          loaderVersion: body.loaderVersion,
          changelog: body.changelog,
          downloadUrl: body.downloadUrl,
          fileSize: body.fileSize,
          isStable: body.isStable,
        },
      });

      return reply.code(201).send(version);
    }
  );

  server.patch<{ Params: { slug: string; versionId: string } }>(
    '/modpacks/:slug/versions/:versionId',
    { onRequest: [server.authenticate] },
    async (
      request: FastifyRequest<{ Params: { slug: string; versionId: string } }>,
      reply: FastifyReply
    ) => {
      const payload = request.user as { sub: number };
      const { slug, versionId } = request.params;
      const body = versionUpdateSchema.parse(request.body);

      const modpack = await prisma.modpack.findUnique({
        where: { slug },
        select: { id: true, authorId: true },
      });

      if (!modpack) {
        throw new AppError(404, 'Modpack not found');
      }

      if (modpack.authorId !== payload.sub) {
        throw new AppError(403, 'Not authorized to update this version');
      }

      const version = await prisma.modpackVersion.findFirst({
        where: {
          id: Number(versionId),
          modpackId: modpack.id,
        },
      });

      if (!version) {
        throw new AppError(404, 'Version not found');
      }

      const updatedVersion = await prisma.modpackVersion.update({
        where: { id: Number(versionId) },
        data: body,
      });

      return reply.send(updatedVersion);
    }
  );

  server.delete<{ Params: { slug: string; versionId: string } }>(
    '/modpacks/:slug/versions/:versionId',
    { onRequest: [server.authenticate] },
    async (
      request: FastifyRequest<{ Params: { slug: string; versionId: string } }>,
      reply: FastifyReply
    ) => {
      const payload = request.user as { sub: number };
      const { slug, versionId } = request.params;

      const modpack = await prisma.modpack.findUnique({
        where: { slug },
        select: { id: true, authorId: true },
      });

      if (!modpack) {
        throw new AppError(404, 'Modpack not found');
      }

      if (modpack.authorId !== payload.sub) {
        throw new AppError(403, 'Not authorized to delete this version');
      }

      const version = await prisma.modpackVersion.findFirst({
        where: {
          id: Number(versionId),
          modpackId: modpack.id,
        },
      });

      if (!version) {
        throw new AppError(404, 'Version not found');
      }

      await prisma.modpackVersion.delete({
        where: { id: Number(versionId) },
      });

      return reply.code(204).send();
    }
  );
}
