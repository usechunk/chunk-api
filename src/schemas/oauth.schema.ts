import { z } from 'zod';

// Valid scopes for the OAuth2 system
export const VALID_SCOPES = [
  'project:read',
  'project:write',
  'project:delete',
  'collection:read',
  'collection:write',
  'user:read',
  'user:write',
  'analytics:read',
] as const;

export type OAuthScope = (typeof VALID_SCOPES)[number];

// OAuth Client Registration
export const oauthClientCreateSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  redirectUris: z.array(z.string().url()).min(1).max(10),
  scopes: z.array(z.enum(VALID_SCOPES)).min(1),
});

export const oauthClientUpdateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional().nullable(),
  redirectUris: z.array(z.string().url()).min(1).max(10).optional(),
  scopes: z.array(z.enum(VALID_SCOPES)).min(1).optional(),
});

export const oauthClientResponseSchema = z.object({
  id: z.string(),
  clientId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  redirectUris: z.array(z.string()),
  scopes: z.array(z.string()),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const oauthClientWithSecretResponseSchema = oauthClientResponseSchema.extend({
  clientSecret: z.string(),
});

// Authorization Request
export const authorizeRequestSchema = z.object({
  response_type: z.literal('code'),
  client_id: z.string(),
  redirect_uri: z.string().url(),
  scope: z.string().optional(),
  state: z.string().optional(),
});

export const authorizeConsentSchema = z.object({
  client_id: z.string(),
  redirect_uri: z.string().url(),
  scope: z.string().optional(),
  state: z.string().optional(),
  consent: z.enum(['allow', 'deny']),
});

// Token Exchange
export const tokenRequestSchema = z.discriminatedUnion('grant_type', [
  z.object({
    grant_type: z.literal('authorization_code'),
    code: z.string(),
    redirect_uri: z.string().url(),
    client_id: z.string(),
    client_secret: z.string(),
  }),
  z.object({
    grant_type: z.literal('refresh_token'),
    refresh_token: z.string(),
    client_id: z.string(),
    client_secret: z.string(),
  }),
  z.object({
    grant_type: z.literal('client_credentials'),
    client_id: z.string(),
    client_secret: z.string(),
    scope: z.string().optional(),
  }),
]);

export const tokenResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.literal('Bearer'),
  expires_in: z.number(),
  refresh_token: z.string().optional(),
  scope: z.string().optional(),
});

// Token Revocation
export const revokeRequestSchema = z.object({
  token: z.string(),
  token_type_hint: z.enum(['access_token', 'refresh_token']).optional(),
  client_id: z.string().optional(),
  client_secret: z.string().optional(),
});

// Token Introspection
export const introspectRequestSchema = z.object({
  token: z.string(),
  token_type_hint: z.enum(['access_token', 'refresh_token']).optional(),
  client_id: z.string().optional(),
  client_secret: z.string().optional(),
});

export const introspectResponseSchema = z.object({
  active: z.boolean(),
  scope: z.string().optional(),
  client_id: z.string().optional(),
  username: z.string().optional(),
  token_type: z.string().optional(),
  exp: z.number().optional(),
  iat: z.number().optional(),
  sub: z.string().optional(),
});

// Personal Access Token
export const patCreateSchema = z.object({
  name: z.string().min(1).max(255),
  scopes: z.array(z.enum(VALID_SCOPES)).min(1),
  expiresAt: z.string().datetime().optional(),
});

export const patResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  tokenPrefix: z.string(),
  scopes: z.array(z.string()),
  lastUsedAt: z.date().nullable(),
  expiresAt: z.date().nullable(),
  createdAt: z.date(),
});

export const patWithTokenResponseSchema = patResponseSchema.extend({
  token: z.string(),
});

// Type exports
export type OAuthClientCreate = z.infer<typeof oauthClientCreateSchema>;
export type OAuthClientUpdate = z.infer<typeof oauthClientUpdateSchema>;
export type OAuthClientResponse = z.infer<typeof oauthClientResponseSchema>;
export type OAuthClientWithSecretResponse = z.infer<typeof oauthClientWithSecretResponseSchema>;
export type AuthorizeRequest = z.infer<typeof authorizeRequestSchema>;
export type AuthorizeConsent = z.infer<typeof authorizeConsentSchema>;
export type TokenRequest = z.infer<typeof tokenRequestSchema>;
export type TokenResponse = z.infer<typeof tokenResponseSchema>;
export type RevokeRequest = z.infer<typeof revokeRequestSchema>;
export type IntrospectRequest = z.infer<typeof introspectRequestSchema>;
export type IntrospectResponse = z.infer<typeof introspectResponseSchema>;
export type PATCreate = z.infer<typeof patCreateSchema>;
export type PATResponse = z.infer<typeof patResponseSchema>;
export type PATWithTokenResponse = z.infer<typeof patWithTokenResponseSchema>;
