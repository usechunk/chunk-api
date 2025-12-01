import { FastifyReply, FastifyRequest } from 'fastify';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(error: unknown, request: FastifyRequest, reply: FastifyReply) {
  if (error instanceof AppError) {
    return reply.code(error.statusCode).send({
      error: error.name,
      message: error.message,
    });
  }

  request.log.error(error);
  return reply.code(500).send({
    error: 'Internal Server Error',
    message: 'An unexpected error occurred',
  });
}
