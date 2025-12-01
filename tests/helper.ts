import fastify, { FastifyInstance } from 'fastify';
import { registerPlugins } from '../src/plugins/index.js';
import { registerRoutes } from '../src/routes/index.js';

export async function build(): Promise<FastifyInstance> {
  const app = fastify({
    logger: false,
  });

  await registerPlugins(app);
  await registerRoutes(app);

  return app;
}
