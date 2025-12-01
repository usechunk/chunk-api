import fastify from 'fastify';
import { config } from './config.js';
import { registerPlugins } from './plugins/index.js';
import { registerRoutes } from './routes/index.js';

const server = fastify({
  logger: {
    level: config.NODE_ENV === 'development' ? 'info' : 'warn',
    transport: config.NODE_ENV === 'development' 
      ? {
          target: 'pino-pretty',
          options: {
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
  },
});

await registerPlugins(server);
await registerRoutes(server);

const start = async () => {
  try {
    await server.listen({ 
      host: config.API_HOST, 
      port: config.API_PORT 
    });
    console.log(`🚀 ChunkHub API running on http://${config.API_HOST}:${config.API_PORT}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
