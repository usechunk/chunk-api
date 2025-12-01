import { z } from 'zod';

export const modpackCreateSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  mcVersion: z.string().min(1).max(20),
  loader: z.string().min(1).max(20),
  loaderVersion: z.string().max(50).optional(),
  recommendedRamGb: z.number().int().positive().default(4),
});

export const modpackUpdateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  mcVersion: z.string().min(1).max(20).optional(),
  loader: z.string().min(1).max(20).optional(),
  loaderVersion: z.string().max(50).optional(),
  recommendedRamGb: z.number().int().positive().optional(),
  isPublished: z.boolean().optional(),
});

export const modpackResponseSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  mcVersion: z.string(),
  loader: z.string(),
  loaderVersion: z.string().nullable(),
  recommendedRamGb: z.number(),
  downloads: z.number(),
  isPublished: z.boolean(),
  authorId: z.number(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type ModpackCreate = z.infer<typeof modpackCreateSchema>;
export type ModpackUpdate = z.infer<typeof modpackUpdateSchema>;
export type ModpackResponse = z.infer<typeof modpackResponseSchema>;
