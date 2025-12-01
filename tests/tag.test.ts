import { describe, it, expect } from 'vitest';
import {
  tagTypeEnum,
  tagCreateSchema,
  tagUpdateSchema,
  projectTagsSchema,
} from '../src/schemas/tag.schema.js';
import { parseTagSlugs } from '../src/utils/tags.js';

describe('Tag Schema', () => {
  describe('tagTypeEnum', () => {
    it('should accept valid tag types', () => {
      expect(tagTypeEnum.parse('LOADER')).toBe('LOADER');
      expect(tagTypeEnum.parse('CATEGORY')).toBe('CATEGORY');
      expect(tagTypeEnum.parse('GAME_VERSION')).toBe('GAME_VERSION');
      expect(tagTypeEnum.parse('CUSTOM')).toBe('CUSTOM');
    });

    it('should reject invalid tag types', () => {
      expect(() => tagTypeEnum.parse('INVALID')).toThrow();
      expect(() => tagTypeEnum.parse('')).toThrow();
      expect(() => tagTypeEnum.parse('loader')).toThrow(); // lowercase should fail
    });
  });

  describe('tagCreateSchema', () => {
    it('should accept valid tag create data', () => {
      const data = {
        name: 'Forge',
        type: 'LOADER',
      };
      const result = tagCreateSchema.parse(data);
      expect(result.name).toBe('Forge');
      expect(result.type).toBe('LOADER');
    });

    it('should accept tag with optional fields', () => {
      const data = {
        name: 'Magic',
        slug: 'magic',
        type: 'CATEGORY',
        color: '#FF5733',
        icon: 'magic-icon.png',
      };
      const result = tagCreateSchema.parse(data);
      expect(result.name).toBe('Magic');
      expect(result.slug).toBe('magic');
      expect(result.color).toBe('#FF5733');
      expect(result.icon).toBe('magic-icon.png');
    });

    it('should reject invalid color format', () => {
      const data = {
        name: 'Test',
        type: 'CATEGORY',
        color: 'invalid-color',
      };
      expect(() => tagCreateSchema.parse(data)).toThrow();
    });

    it('should reject invalid color with wrong hex length', () => {
      const data = {
        name: 'Test',
        type: 'CATEGORY',
        color: '#FFF', // Should be 6 characters
      };
      expect(() => tagCreateSchema.parse(data)).toThrow();
    });

    it('should accept valid hex colors', () => {
      const data = {
        name: 'Test',
        type: 'CATEGORY',
        color: '#AABBCC',
      };
      const result = tagCreateSchema.parse(data);
      expect(result.color).toBe('#AABBCC');
    });

    it('should reject empty name', () => {
      const data = {
        name: '',
        type: 'CATEGORY',
      };
      expect(() => tagCreateSchema.parse(data)).toThrow();
    });
  });

  describe('tagUpdateSchema', () => {
    it('should accept empty update', () => {
      const result = tagUpdateSchema.parse({});
      expect(result).toEqual({});
    });

    it('should accept name update', () => {
      const data = { name: 'Updated Name' };
      const result = tagUpdateSchema.parse(data);
      expect(result.name).toBe('Updated Name');
    });

    it('should accept color update', () => {
      const data = { color: '#123456' };
      const result = tagUpdateSchema.parse(data);
      expect(result.color).toBe('#123456');
    });

    it('should accept null values to clear optional fields', () => {
      const data = { color: null, icon: null };
      const result = tagUpdateSchema.parse(data);
      expect(result.color).toBeNull();
      expect(result.icon).toBeNull();
    });
  });

  describe('projectTagsSchema', () => {
    it('should accept valid tag IDs array', () => {
      const data = { tagIds: [1, 2, 3] };
      const result = projectTagsSchema.parse(data);
      expect(result.tagIds).toEqual([1, 2, 3]);
    });

    it('should reject empty tag IDs array', () => {
      const data = { tagIds: [] };
      expect(() => projectTagsSchema.parse(data)).toThrow();
    });

    it('should reject non-positive IDs', () => {
      const data = { tagIds: [0] };
      expect(() => projectTagsSchema.parse(data)).toThrow();
    });

    it('should reject negative IDs', () => {
      const data = { tagIds: [-1] };
      expect(() => projectTagsSchema.parse(data)).toThrow();
    });

    it('should accept single tag ID', () => {
      const data = { tagIds: [1] };
      const result = projectTagsSchema.parse(data);
      expect(result.tagIds).toEqual([1]);
    });
  });
});

describe('parseTagSlugs utility', () => {
  it('should parse comma-separated tag slugs', () => {
    expect(parseTagSlugs('forge,magic,1.20.1')).toEqual(['forge', 'magic', '1.20.1']);
  });

  it('should convert to lowercase', () => {
    expect(parseTagSlugs('FORGE,Magic,ADVENTURE')).toEqual(['forge', 'magic', 'adventure']);
  });

  it('should trim whitespace', () => {
    expect(parseTagSlugs('forge , magic , 1.20.1')).toEqual(['forge', 'magic', '1.20.1']);
  });

  it('should handle single tag', () => {
    expect(parseTagSlugs('forge')).toEqual(['forge']);
  });

  it('should handle empty string', () => {
    expect(parseTagSlugs('')).toEqual(['']);
  });
});
