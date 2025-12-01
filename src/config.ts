import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  ACCESS_TOKEN_EXPIRE_MINUTES: z.coerce.number().default(30),
  API_HOST: z.string().default('0.0.0.0'),
  API_PORT: z.coerce.number().default(8000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  UPLOAD_DIR: z.string().default('./uploads'),
  MAX_FILE_SIZE: z.coerce.number().default(524288000),
  ALLOWED_ORIGINS: z.string().default('*'),
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  RATE_LIMIT_TIMEWINDOW: z.string().default('1 minute'),
  MEILISEARCH_HOST: z.string().url().default('http://localhost:7700'),
  // MEILISEARCH_KEY is optional for development without authentication,
  // but required for production environments where Meilisearch has auth enabled.
  MEILISEARCH_KEY: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
  throw new Error('Invalid environment variables');
}

export const config = parsed.data;
