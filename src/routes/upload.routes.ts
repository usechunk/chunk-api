import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { pipeline } from 'stream/promises';
import { createWriteStream } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { config } from '../config.js';
import { AppError } from '../utils/errors.js';

export async function uploadRoutes(server: FastifyInstance) {
  server.post(
    '/upload',
    { onRequest: [server.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const data = await request.file();

      if (!data) {
        throw new AppError(400, 'No file uploaded');
      }

      const allowedMimeTypes = [
        'application/zip',
        'application/x-zip-compressed',
        'application/json',
        'image/png',
        'image/jpeg',
        'image/webp',
      ];

      if (!allowedMimeTypes.includes(data.mimetype)) {
        throw new AppError(400, 'Invalid file type');
      }

      const ext = data.filename.split('.').pop() || 'bin';
      const filename = `${randomUUID()}.${ext}`;
      const filepath = join(config.UPLOAD_DIR, filename);

      await pipeline(data.file, createWriteStream(filepath));

      const fileUrl = `/uploads/${filename}`;

      return reply.send({
        filename,
        url: fileUrl,
        mimetype: data.mimetype,
      });
    }
  );
}
