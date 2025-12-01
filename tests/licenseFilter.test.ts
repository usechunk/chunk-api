import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { build } from './helper.js';
import { FastifyInstance } from 'fastify';
import { prisma } from '../src/prisma.js';

describe('License Filtering Integration Tests', () => {
  let app: FastifyInstance;
  let authToken: string;
  let userId: number;

  beforeAll(async () => {
    app = await build();

    // Register a test user and get auth token
    const registerResponse = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        username: 'licensetest',
        email: 'licensetest@example.com',
        password: 'password123',
      },
    });

    const registerBody = JSON.parse(registerResponse.body);
    authToken = registerBody.accessToken;
    userId = registerBody.user.id;
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.modpack.deleteMany({
      where: { authorId: userId },
    });
    await prisma.user.deleteMany({
      where: { username: 'licensetest' },
    });
    await app.close();
  });

  beforeEach(async () => {
    // Clean up modpacks before each test
    await prisma.modpack.deleteMany({
      where: { authorId: userId },
    });
  });

  describe('GET /modpacks - License Filtering', () => {
    it('should filter modpacks by specific license ID', async () => {
      // Create modpacks with different licenses
      await prisma.modpack.createMany({
        data: [
          {
            name: 'MIT Modpack',
            slug: 'mit-modpack',
            mcVersion: '1.20.1',
            loader: 'forge',
            licenseId: 'MIT',
            isPublished: true,
            authorId: userId,
          },
          {
            name: 'GPL Modpack',
            slug: 'gpl-modpack',
            mcVersion: '1.20.1',
            loader: 'forge',
            licenseId: 'GPL-3.0-only',
            isPublished: true,
            authorId: userId,
          },
        ],
      });

      const response = await app.inject({
        method: 'GET',
        url: '/modpacks?license=MIT',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data).toHaveLength(1);
      expect(body.data[0].licenseId).toBe('MIT');
      expect(body.data[0].licenseName).toBe('MIT License');
    });

    it('should filter modpacks by license category (permissive)', async () => {
      // Create modpacks with different license types
      await prisma.modpack.createMany({
        data: [
          {
            name: 'MIT Modpack',
            slug: 'mit-modpack-cat',
            mcVersion: '1.20.1',
            loader: 'forge',
            licenseId: 'MIT',
            isPublished: true,
            authorId: userId,
          },
          {
            name: 'Apache Modpack',
            slug: 'apache-modpack',
            mcVersion: '1.20.1',
            loader: 'forge',
            licenseId: 'Apache-2.0',
            isPublished: true,
            authorId: userId,
          },
          {
            name: 'GPL Modpack',
            slug: 'gpl-modpack-cat',
            mcVersion: '1.20.1',
            loader: 'forge',
            licenseId: 'GPL-3.0-only',
            isPublished: true,
            authorId: userId,
          },
        ],
      });

      const response = await app.inject({
        method: 'GET',
        url: '/modpacks?licenseCategory=permissive',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      // Should return MIT and Apache modpacks (permissive), not GPL (copyleft)
      expect(body.data).toHaveLength(2);
      const licenseIds = body.data.map((m: { licenseId: string }) => m.licenseId);
      expect(licenseIds).toContain('MIT');
      expect(licenseIds).toContain('Apache-2.0');
      expect(licenseIds).not.toContain('GPL-3.0-only');
    });

    it('should filter modpacks by license category (copyleft)', async () => {
      await prisma.modpack.createMany({
        data: [
          {
            name: 'MIT Modpack',
            slug: 'mit-modpack-copyleft',
            mcVersion: '1.20.1',
            loader: 'forge',
            licenseId: 'MIT',
            isPublished: true,
            authorId: userId,
          },
          {
            name: 'GPL Modpack',
            slug: 'gpl-modpack-copyleft',
            mcVersion: '1.20.1',
            loader: 'forge',
            licenseId: 'GPL-3.0-only',
            isPublished: true,
            authorId: userId,
          },
        ],
      });

      const response = await app.inject({
        method: 'GET',
        url: '/modpacks?licenseCategory=copyleft',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data).toHaveLength(1);
      expect(body.data[0].licenseId).toBe('GPL-3.0-only');
    });

    it('should return empty array when no modpacks match license filter', async () => {
      await prisma.modpack.create({
        data: {
          name: 'MIT Modpack',
          slug: 'mit-only-modpack',
          mcVersion: '1.20.1',
          loader: 'forge',
          licenseId: 'MIT',
          isPublished: true,
          authorId: userId,
        },
      });

      const response = await app.inject({
        method: 'GET',
        url: '/modpacks?license=GPL-3.0-only',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data).toHaveLength(0);
      expect(body.pagination.total).toBe(0);
    });

    it('should give licenseCategory precedence over license when both provided', async () => {
      await prisma.modpack.createMany({
        data: [
          {
            name: 'MIT Modpack',
            slug: 'mit-precedence',
            mcVersion: '1.20.1',
            loader: 'forge',
            licenseId: 'MIT',
            isPublished: true,
            authorId: userId,
          },
          {
            name: 'Apache Modpack',
            slug: 'apache-precedence',
            mcVersion: '1.20.1',
            loader: 'forge',
            licenseId: 'Apache-2.0',
            isPublished: true,
            authorId: userId,
          },
        ],
      });

      // When both license=MIT and licenseCategory=permissive are provided,
      // licenseCategory should take precedence and return all permissive licenses
      const response = await app.inject({
        method: 'GET',
        url: '/modpacks?license=MIT&licenseCategory=permissive',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      // Both MIT and Apache-2.0 are permissive, so both should be returned
      expect(body.data).toHaveLength(2);
    });

    it('should combine license filter with other filters (loader)', async () => {
      await prisma.modpack.createMany({
        data: [
          {
            name: 'MIT Forge Modpack',
            slug: 'mit-forge-modpack',
            mcVersion: '1.20.1',
            loader: 'forge',
            licenseId: 'MIT',
            isPublished: true,
            authorId: userId,
          },
          {
            name: 'MIT Fabric Modpack',
            slug: 'mit-fabric-modpack',
            mcVersion: '1.20.1',
            loader: 'fabric',
            licenseId: 'MIT',
            isPublished: true,
            authorId: userId,
          },
        ],
      });

      const response = await app.inject({
        method: 'GET',
        url: '/modpacks?license=MIT&loader=forge',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data).toHaveLength(1);
      expect(body.data[0].loader).toBe('forge');
      expect(body.data[0].licenseId).toBe('MIT');
    });
  });

  describe('GET /search - License Filtering', () => {
    it('should filter search results by specific license ID', async () => {
      await prisma.modpack.createMany({
        data: [
          {
            name: 'MIT Search Modpack',
            slug: 'mit-search-modpack',
            mcVersion: '1.20.1',
            loader: 'forge',
            licenseId: 'MIT',
            isPublished: true,
            authorId: userId,
          },
          {
            name: 'GPL Search Modpack',
            slug: 'gpl-search-modpack',
            mcVersion: '1.20.1',
            loader: 'forge',
            licenseId: 'GPL-3.0-only',
            isPublished: true,
            authorId: userId,
          },
        ],
      });

      const response = await app.inject({
        method: 'GET',
        url: '/search?license=MIT',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data).toHaveLength(1);
      expect(body.data[0].licenseId).toBe('MIT');
    });

    it('should filter search results by license category', async () => {
      await prisma.modpack.createMany({
        data: [
          {
            name: 'MIT Search Cat',
            slug: 'mit-search-cat',
            mcVersion: '1.20.1',
            loader: 'forge',
            licenseId: 'MIT',
            isPublished: true,
            authorId: userId,
          },
          {
            name: 'GPL Search Cat',
            slug: 'gpl-search-cat',
            mcVersion: '1.20.1',
            loader: 'forge',
            licenseId: 'GPL-3.0-only',
            isPublished: true,
            authorId: userId,
          },
        ],
      });

      const response = await app.inject({
        method: 'GET',
        url: '/search?licenseCategory=copyleft',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data).toHaveLength(1);
      expect(body.data[0].licenseId).toBe('GPL-3.0-only');
    });

    it('should return empty array when no modpacks match search license filter', async () => {
      await prisma.modpack.create({
        data: {
          name: 'MIT Only Search',
          slug: 'mit-only-search',
          mcVersion: '1.20.1',
          loader: 'forge',
          licenseId: 'MIT',
          isPublished: true,
          authorId: userId,
        },
      });

      const response = await app.inject({
        method: 'GET',
        url: '/search?license=Apache-2.0',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data).toHaveLength(0);
    });

    it('should give licenseCategory precedence in search when both provided', async () => {
      await prisma.modpack.createMany({
        data: [
          {
            name: 'MIT Search Prec',
            slug: 'mit-search-prec',
            mcVersion: '1.20.1',
            loader: 'forge',
            licenseId: 'MIT',
            isPublished: true,
            authorId: userId,
          },
          {
            name: 'BSD Search Prec',
            slug: 'bsd-search-prec',
            mcVersion: '1.20.1',
            loader: 'forge',
            licenseId: 'BSD-3-Clause',
            isPublished: true,
            authorId: userId,
          },
        ],
      });

      const response = await app.inject({
        method: 'GET',
        url: '/search?license=MIT&licenseCategory=permissive',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      // Both are permissive, so both should be returned
      expect(body.data).toHaveLength(2);
    });

    it('should combine license filter with search query', async () => {
      await prisma.modpack.createMany({
        data: [
          {
            name: 'Amazing MIT Pack',
            slug: 'amazing-mit-pack',
            mcVersion: '1.20.1',
            loader: 'forge',
            licenseId: 'MIT',
            isPublished: true,
            authorId: userId,
          },
          {
            name: 'Amazing GPL Pack',
            slug: 'amazing-gpl-pack',
            mcVersion: '1.20.1',
            loader: 'forge',
            licenseId: 'GPL-3.0-only',
            isPublished: true,
            authorId: userId,
          },
        ],
      });

      const response = await app.inject({
        method: 'GET',
        url: '/search?q=Amazing&license=MIT',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data).toHaveLength(1);
      expect(body.data[0].name).toContain('Amazing');
      expect(body.data[0].licenseId).toBe('MIT');
    });

    it('should combine license filter with mcVersion filter', async () => {
      await prisma.modpack.createMany({
        data: [
          {
            name: 'MIT 1.20 Pack',
            slug: 'mit-120-pack',
            mcVersion: '1.20.1',
            loader: 'forge',
            licenseId: 'MIT',
            isPublished: true,
            authorId: userId,
          },
          {
            name: 'MIT 1.19 Pack',
            slug: 'mit-119-pack',
            mcVersion: '1.19.4',
            loader: 'forge',
            licenseId: 'MIT',
            isPublished: true,
            authorId: userId,
          },
        ],
      });

      const response = await app.inject({
        method: 'GET',
        url: '/search?license=MIT&mcVersion=1.20.1',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data).toHaveLength(1);
      expect(body.data[0].mcVersion).toBe('1.20.1');
    });
  });

  describe('License Info in Response', () => {
    it('should include licenseName in modpack list response', async () => {
      await prisma.modpack.create({
        data: {
          name: 'Licensed Modpack',
          slug: 'licensed-modpack',
          mcVersion: '1.20.1',
          loader: 'forge',
          licenseId: 'Apache-2.0',
          isPublished: true,
          authorId: userId,
        },
      });

      const response = await app.inject({
        method: 'GET',
        url: '/modpacks',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data[0].licenseName).toBe('Apache License 2.0');
      expect(body.data[0].licenseUrl).toBe('https://opensource.org/licenses/Apache-2.0');
    });

    it('should include custom licenseUrl when provided', async () => {
      await prisma.modpack.create({
        data: {
          name: 'Custom License Modpack',
          slug: 'custom-license-modpack',
          mcVersion: '1.20.1',
          loader: 'forge',
          licenseId: 'LicenseRef-Custom',
          licenseUrl: 'https://example.com/my-custom-license',
          isPublished: true,
          authorId: userId,
        },
      });

      const response = await app.inject({
        method: 'GET',
        url: '/modpacks',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data[0].licenseId).toBe('LicenseRef-Custom');
      expect(body.data[0].licenseUrl).toBe('https://example.com/my-custom-license');
    });
  });
});
