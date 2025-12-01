import { describe, it, expect } from 'vitest';
import {
  searchQuerySchema,
  suggestQuerySchema,
  parseFilters,
  buildFiltersFromParams,
  parseSort,
  facetFieldsEnum,
} from '../src/schemas/search.schema.js';

describe('Search Schema', () => {
  describe('facetFieldsEnum', () => {
    it('should accept valid facet fields', () => {
      expect(facetFieldsEnum.parse('projectType')).toBe('projectType');
      expect(facetFieldsEnum.parse('mcVersion')).toBe('mcVersion');
      expect(facetFieldsEnum.parse('loader')).toBe('loader');
      expect(facetFieldsEnum.parse('tags')).toBe('tags');
      expect(facetFieldsEnum.parse('licenseId')).toBe('licenseId');
      expect(facetFieldsEnum.parse('authorUsername')).toBe('authorUsername');
    });

    it('should reject invalid facet fields', () => {
      expect(() => facetFieldsEnum.parse('invalid')).toThrow();
      expect(() => facetFieldsEnum.parse('downloads')).toThrow();
      expect(() => facetFieldsEnum.parse('')).toThrow();
    });
  });

  describe('searchQuerySchema', () => {
    it('should accept empty query', () => {
      const result = searchQuerySchema.parse({});
      expect(result.q).toBe('');
      expect(result.limit).toBe(20);
      expect(result.offset).toBe(0);
    });

    it('should accept valid search query', () => {
      const result = searchQuerySchema.parse({
        q: 'test modpack',
        limit: 10,
        offset: 5,
      });
      expect(result.q).toBe('test modpack');
      expect(result.limit).toBe(10);
      expect(result.offset).toBe(5);
    });

    it('should parse facets string', () => {
      const result = searchQuerySchema.parse({
        facets: 'loader,projectType,mcVersion',
      });
      expect(result.facets).toEqual(['loader', 'projectType', 'mcVersion']);
    });

    it('should filter invalid facets', () => {
      const result = searchQuerySchema.parse({
        facets: 'loader,invalid,mcVersion',
      });
      expect(result.facets).toEqual(['loader', 'mcVersion']);
    });

    it('should coerce limit to valid range', () => {
      expect(() => searchQuerySchema.parse({ limit: 0 })).toThrow();
      expect(() => searchQuerySchema.parse({ limit: 200 })).toThrow();
      expect(searchQuerySchema.parse({ limit: '50' })).toHaveProperty('limit', 50);
    });

    it('should accept convenience filter parameters', () => {
      const result = searchQuerySchema.parse({
        loader: 'forge',
        projectType: 'MOD',
        mcVersion: '1.20.1',
        minDownloads: 100,
        author: 'testuser',
      });
      expect(result.loader).toBe('forge');
      expect(result.projectType).toBe('MOD');
      expect(result.mcVersion).toBe('1.20.1');
      expect(result.minDownloads).toBe(100);
      expect(result.author).toBe('testuser');
    });
  });

  describe('suggestQuerySchema', () => {
    it('should accept empty query', () => {
      const result = suggestQuerySchema.parse({});
      expect(result.q).toBe('');
      expect(result.limit).toBe(5);
    });

    it('should accept valid suggest query', () => {
      const result = suggestQuerySchema.parse({
        q: 'test',
        limit: 8,
      });
      expect(result.q).toBe('test');
      expect(result.limit).toBe(8);
    });

    it('should enforce max limit of 10', () => {
      expect(() => suggestQuerySchema.parse({ limit: 15 })).toThrow();
    });

    it('should coerce string limit to number', () => {
      const result = suggestQuerySchema.parse({ limit: '7' });
      expect(result.limit).toBe(7);
    });
  });

  describe('parseFilters', () => {
    it('should parse simple filters', () => {
      const result = parseFilters('loader:forge');
      expect(result).toEqual(['loader = "forge"']);
    });

    it('should parse multiple filters', () => {
      const result = parseFilters('loader:forge,projectType:MOD');
      expect(result).toEqual([
        'loader = "forge"',
        'projectType = "MOD"',
      ]);
    });

    it('should handle minDownloads specially', () => {
      const result = parseFilters('minDownloads:1000');
      expect(result).toEqual(['downloads >= 1000']);
    });

    it('should handle tags specially', () => {
      const result = parseFilters('tags:magic');
      expect(result).toEqual(['tags = "magic"']);
    });

    it('should return empty array for undefined', () => {
      expect(parseFilters(undefined)).toEqual([]);
    });

    it('should return empty array for empty string', () => {
      expect(parseFilters('')).toEqual([]);
    });

    it('should skip invalid filter formats', () => {
      const result = parseFilters('loader:forge,invalid,mcVersion:1.20');
      expect(result).toEqual([
        'loader = "forge"',
        'mcVersion = "1.20"',
      ]);
    });
  });

  describe('buildFiltersFromParams', () => {
    it('should build filters from convenience parameters', () => {
      const result = buildFiltersFromParams({
        loader: 'forge',
        projectType: 'mod',
        mcVersion: '1.20.1',
      });
      expect(result).toContain('loader = "forge"');
      expect(result).toContain('projectType = "MOD"');
      expect(result).toContain('mcVersion = "1.20.1"');
    });

    it('should handle minDownloads', () => {
      const result = buildFiltersFromParams({ minDownloads: 100 });
      expect(result).toContain('downloads >= 100');
    });

    it('should skip zero minDownloads', () => {
      const result = buildFiltersFromParams({ minDownloads: 0 });
      expect(result).toEqual([]);
    });

    it('should handle author filter', () => {
      const result = buildFiltersFromParams({ author: 'testuser' });
      expect(result).toContain('authorUsername = "testuser"');
    });

    it('should combine convenience params and filter string', () => {
      const result = buildFiltersFromParams({
        loader: 'forge',
        filters: 'tags:magic',
      });
      expect(result).toContain('loader = "forge"');
      expect(result).toContain('tags = "magic"');
    });

    it('should return empty array when no params', () => {
      expect(buildFiltersFromParams({})).toEqual([]);
    });
  });

  describe('parseSort', () => {
    it('should parse valid sort parameters', () => {
      expect(parseSort('downloads:desc')).toEqual(['downloads:desc']);
      expect(parseSort('createdAt:asc')).toEqual(['createdAt:asc']);
      expect(parseSort('updatedAt:desc')).toEqual(['updatedAt:desc']);
      expect(parseSort('name:asc')).toEqual(['name:asc']);
    });

    it('should return undefined for invalid sort field', () => {
      expect(parseSort('invalid:desc')).toBeUndefined();
    });

    it('should return undefined for invalid direction', () => {
      expect(parseSort('downloads:invalid')).toBeUndefined();
    });

    it('should return undefined for invalid format', () => {
      expect(parseSort('downloads')).toBeUndefined();
      expect(parseSort('downloads:asc:extra')).toBeUndefined();
    });

    it('should return undefined for undefined input', () => {
      expect(parseSort(undefined)).toBeUndefined();
    });
  });
});
