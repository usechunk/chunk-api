import { z } from 'zod';

export const versionCreateSchema = z.object({
  version: z.string().min(1).max(50),
  mcVersion: z.string().min(1).max(20),
  loader: z.string().min(1).max(20),
  loaderVersion: z.string().max(50).optional(),
  changelog: z.string().optional(),
  downloadUrl: z.string().url().max(512).optional(),
  fileSize: z.number().int().positive().optional(),
  isStable: z.boolean().default(true),
});

export const versionUpdateSchema = z.object({
  version: z.string().min(1).max(50).optional(),
  mcVersion: z.string().min(1).max(20).optional(),
  loader: z.string().min(1).max(20).optional(),
  loaderVersion: z.string().max(50).optional(),
  changelog: z.string().optional(),
  downloadUrl: z.string().url().max(512).optional(),
  fileSize: z.number().int().positive().optional(),
  isStable: z.boolean().optional(),
});

export const versionResponseSchema = z.object({
  id: z.number(),
  modpackId: z.number(),
  version: z.string(),
  mcVersion: z.string(),
  loader: z.string(),
  loaderVersion: z.string().nullable(),
  changelog: z.string().nullable(),
  downloadUrl: z.string().nullable(),
  fileSize: z.number().nullable(),
  downloads: z.number(),
  isStable: z.boolean(),
  createdAt: z.date(),
});

export type VersionCreate = z.infer<typeof versionCreateSchema>;
export type VersionUpdate = z.infer<typeof versionUpdateSchema>;
export type VersionResponse = z.infer<typeof versionResponseSchema>;
