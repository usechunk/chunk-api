import { z } from 'zod';

export const userCreateSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email().max(255),
  password: z.string().min(8).max(100),
});

export const userLoginSchema = z.object({
  username: z.string(),
  password: z.string(),
});

export const tokenResponseSchema = z.object({
  accessToken: z.string(),
  tokenType: z.string(),
});

export const userResponseSchema = z.object({
  id: z.number(),
  username: z.string(),
  email: z.string(),
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date().nullable(),
});

export type UserCreate = z.infer<typeof userCreateSchema>;
export type UserLogin = z.infer<typeof userLoginSchema>;
export type TokenResponse = z.infer<typeof tokenResponseSchema>;
export type UserResponse = z.infer<typeof userResponseSchema>;
