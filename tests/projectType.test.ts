import { describe, it, expect } from 'vitest';
import { projectTypeEnum, modpackCreateSchema, modpackUpdateSchema } from '../src/schemas/modpack.schema.js';

describe('Project Type Schema', () => {
  describe('projectTypeEnum', () => {
    it('should accept valid project types', () => {
      expect(projectTypeEnum.parse('MOD')).toBe('MOD');
      expect(projectTypeEnum.parse('MODPACK')).toBe('MODPACK');
      expect(projectTypeEnum.parse('RESOURCEPACK')).toBe('RESOURCEPACK');
      expect(projectTypeEnum.parse('SHADER')).toBe('SHADER');
      expect(projectTypeEnum.parse('PLUGIN')).toBe('PLUGIN');
      expect(projectTypeEnum.parse('DATAPACK')).toBe('DATAPACK');
    });

    it('should reject invalid project types', () => {
      expect(() => projectTypeEnum.parse('INVALID')).toThrow();
      expect(() => projectTypeEnum.parse('')).toThrow();
      expect(() => projectTypeEnum.parse('mod')).toThrow(); // lowercase should fail
    });
  });

  describe('modpackCreateSchema', () => {
    it('should accept valid modpack create data with default projectType', () => {
      const data = {
        name: 'Test Modpack',
        mcVersion: '1.20.1',
        loader: 'forge',
      };
      const result = modpackCreateSchema.parse(data);
      expect(result.projectType).toBe('MODPACK');
      expect(result.name).toBe('Test Modpack');
    });

    it('should accept valid modpack create data with explicit projectType', () => {
      const data = {
        name: 'Test Mod',
        projectType: 'MOD',
        mcVersion: '1.20.1',
        loader: 'forge',
      };
      const result = modpackCreateSchema.parse(data);
      expect(result.projectType).toBe('MOD');
    });

    it('should accept all project types', () => {
      const types = ['MOD', 'MODPACK', 'RESOURCEPACK', 'SHADER', 'PLUGIN', 'DATAPACK'] as const;
      for (const projectType of types) {
        const data = {
          name: 'Test Project',
          projectType,
          mcVersion: '1.20.1',
          loader: 'forge',
        };
        const result = modpackCreateSchema.parse(data);
        expect(result.projectType).toBe(projectType);
      }
    });

    it('should reject invalid projectType', () => {
      const data = {
        name: 'Test Modpack',
        projectType: 'INVALID',
        mcVersion: '1.20.1',
        loader: 'forge',
      };
      expect(() => modpackCreateSchema.parse(data)).toThrow();
    });
  });

  describe('modpackUpdateSchema', () => {
    it('should accept empty update', () => {
      const result = modpackUpdateSchema.parse({});
      expect(result).toEqual({});
    });

    it('should accept projectType update', () => {
      const data = { projectType: 'MOD' };
      const result = modpackUpdateSchema.parse(data);
      expect(result.projectType).toBe('MOD');
    });

    it('should reject invalid projectType in update', () => {
      const data = { projectType: 'INVALID' };
      expect(() => modpackUpdateSchema.parse(data)).toThrow();
    });
  });
});
