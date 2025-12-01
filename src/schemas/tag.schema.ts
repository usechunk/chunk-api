import { z } from 'zod';

export const tagTypeEnum = z.enum(['LOADER', 'CATEGORY', 'GAME_VERSION', 'CUSTOM']);

export type TagType = z.infer<typeof tagTypeEnum>;

export const tagCreateSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100).optional(),
  type: tagTypeEnum,
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex color')
    .optional(),
  icon: z.string().max(255).optional(),
});

export const tagUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex color')
    .optional()
    .nullable(),
  icon: z.string().max(255).optional().nullable(),
});

export const tagResponseSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  type: tagTypeEnum,
  color: z.string().nullable(),
  icon: z.string().nullable(),
  createdAt: z.date(),
});

export const projectTagsSchema = z.object({
  tagIds: z.array(z.number().int().positive()).min(1),
});

export type TagCreate = z.infer<typeof tagCreateSchema>;
export type TagUpdate = z.infer<typeof tagUpdateSchema>;
export type TagResponse = z.infer<typeof tagResponseSchema>;
export type ProjectTags = z.infer<typeof projectTagsSchema>;
