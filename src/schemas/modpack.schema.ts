import { z } from 'zod';
import { isValidSPDXLicense } from '../utils/license.js';

export const projectTypeEnum = z.enum([
  'MOD',
  'MODPACK',
  'RESOURCEPACK',
  'SHADER',
  'PLUGIN',
  'DATAPACK',
]);

export type ProjectType = z.infer<typeof projectTypeEnum>;

// License validation schema that validates against SPDX identifiers
export const licenseIdSchema = z
  .string()
  .max(100)
  .refine((val) => isValidSPDXLicense(val), {
    message: 'Invalid SPDX license identifier',
  });

export const modpackCreateSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  projectType: projectTypeEnum.default('MODPACK'),
  mcVersion: z.string().min(1).max(20),
  loader: z.string().min(1).max(20),
  loaderVersion: z.string().max(50).optional(),
  recommendedRamGb: z.number().int().positive().default(4),
  licenseId: licenseIdSchema.optional(),
  licenseUrl: z.string().url().max(512).optional(),
});

export const modpackUpdateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  projectType: projectTypeEnum.optional(),
  mcVersion: z.string().min(1).max(20).optional(),
  loader: z.string().min(1).max(20).optional(),
  loaderVersion: z.string().max(50).optional(),
  recommendedRamGb: z.number().int().positive().optional(),
  isPublished: z.boolean().optional(),
  licenseId: licenseIdSchema.optional(),
  licenseUrl: z.string().url().max(512).optional().nullable(),
});

export const modpackResponseSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  projectType: projectTypeEnum,
  mcVersion: z.string(),
  loader: z.string(),
  loaderVersion: z.string().nullable(),
  recommendedRamGb: z.number(),
  downloads: z.number(),
  isPublished: z.boolean(),
  authorId: z.number(),
  licenseId: z.string().nullable(),
  licenseUrl: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type ModpackCreate = z.infer<typeof modpackCreateSchema>;
export type ModpackUpdate = z.infer<typeof modpackUpdateSchema>;
export type ModpackResponse = z.infer<typeof modpackResponseSchema>;
