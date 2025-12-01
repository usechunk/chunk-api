import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Prisma } from '@prisma/client';
import { prisma } from '../prisma.js';
import { AppError } from '../utils/errors.js';
import { projectTypeEnum } from '../schemas/modpack.schema.js';
import { getLicenseDetails } from '../utils/license.js';

interface ProjectParams {
  username: string;
}

/**
 * Transform modpack to include license info
 */
function addLicenseInfo<T extends { licenseId: string | null; licenseUrl: string | null }>(
  modpack: T
): T & { licenseName: string | null } {
  const licenseDetails = modpack.licenseId ? getLicenseDetails(modpack.licenseId) : null;
  return {
    ...modpack,
    licenseName: licenseDetails?.name ?? null,
    licenseUrl: modpack.licenseUrl || licenseDetails?.url || null,
  };
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
          where.projectType = parsed.data;
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

      // Add license info to each modpack
      const transformedModpacks = modpacks.map(addLicenseInfo);

      return reply.send(transformedModpacks);
    }
  );
}
