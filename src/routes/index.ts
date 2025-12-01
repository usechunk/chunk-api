import { FastifyInstance } from 'fastify';
import { authRoutes } from './auth.routes.js';
import { modpackRoutes } from './modpack.routes.js';
import { versionRoutes } from './version.routes.js';
import { searchRoutes } from './search.routes.js';
import { projectRoutes } from './project.routes.js';
import { uploadRoutes } from './upload.routes.js';
import { tagRoutes } from './tag.routes.js';

export async function registerRoutes(server: FastifyInstance) {
  server.get('/', async (request, reply) => {
    return {
      name: 'ChunkHub API',
      version: '0.1.0',
      status: 'online',
    };
  });

  server.get('/health', async (request, reply) => {
    return { status: 'healthy' };
  });

  await server.register(authRoutes);
  await server.register(modpackRoutes);
  await server.register(versionRoutes);
  await server.register(searchRoutes);
  await server.register(projectRoutes);
  await server.register(uploadRoutes);
  await server.register(tagRoutes);
}
