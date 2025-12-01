import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../prisma.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { AppError } from '../utils/errors.js';
import { userCreateSchema, userLoginSchema } from '../schemas/auth.schema.js';
import { config } from '../config.js';

export async function authRoutes(server: FastifyInstance) {
  server.post('/auth/register', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = userCreateSchema.parse(request.body);

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username: body.username },
          { email: body.email },
        ],
      },
    });

    if (existingUser) {
      throw new AppError(400, 'Username or email already exists');
    }

    const hashedPassword = await hashPassword(body.password);

    const user = await prisma.user.create({
      data: {
        username: body.username,
        email: body.email,
        hashedPassword,
      },
    });

    const token = server.jwt.sign(
      { sub: user.id, username: user.username },
      { expiresIn: `${config.ACCESS_TOKEN_EXPIRE_MINUTES}m` }
    );

    return reply.code(201).send({
      accessToken: token,
      tokenType: 'bearer',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        isActive: user.isActive,
      },
    });
  });

  server.post('/auth/token', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = userLoginSchema.parse(request.body);

    const user = await prisma.user.findUnique({
      where: { username: body.username },
    });

    if (!user || !(await verifyPassword(body.password, user.hashedPassword))) {
      throw new AppError(401, 'Invalid credentials');
    }

    if (!user.isActive) {
      throw new AppError(403, 'Account is inactive');
    }

    const token = server.jwt.sign(
      { sub: user.id, username: user.username },
      { expiresIn: `${config.ACCESS_TOKEN_EXPIRE_MINUTES}m` }
    );

    return reply.send({
      accessToken: token,
      tokenType: 'bearer',
    });
  });

  server.get(
    '/auth/me',
    { onRequest: [server.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const payload = request.user as { sub: number; username: string };

      const user = await prisma.user.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          username: true,
          email: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user) {
        throw new AppError(404, 'User not found');
      }

      return reply.send(user);
    }
  );
}
