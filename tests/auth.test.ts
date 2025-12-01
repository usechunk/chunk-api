import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { build } from './helper.js';
import { FastifyInstance } from 'fastify';

describe('Auth Routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await build();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should register a new user', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
      },
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body);
    expect(body.accessToken).toBeDefined();
    expect(body.user.username).toBe('testuser');
  });

  it('should login with valid credentials', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/auth/token',
      payload: {
        username: 'testuser',
        password: 'password123',
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.accessToken).toBeDefined();
    expect(body.tokenType).toBe('bearer');
  });

  it('should fail login with invalid credentials', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/auth/token',
      payload: {
        username: 'testuser',
        password: 'wrongpassword',
      },
    });

    expect(response.statusCode).toBe(401);
  });
});
