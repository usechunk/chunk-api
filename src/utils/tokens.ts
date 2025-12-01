import { randomBytes, createHash } from 'crypto';

/**
 * Generate a cryptographically secure random string
 */
export function generateSecureToken(length: number = 32): string {
  return randomBytes(length).toString('hex');
}

/**
 * Generate a client ID (prefixed with 'ch_')
 */
export function generateClientId(): string {
  return `ch_${generateSecureToken(16)}`;
}

/**
 * Generate a client secret
 */
export function generateClientSecret(): string {
  return generateSecureToken(32);
}

/**
 * Generate an authorization code
 */
export function generateAuthorizationCode(): string {
  return generateSecureToken(32);
}

/**
 * Generate an access token
 */
export function generateAccessToken(): string {
  return generateSecureToken(32);
}

/**
 * Generate a refresh token
 */
export function generateRefreshToken(): string {
  return generateSecureToken(48);
}

/**
 * Generate a personal access token (prefixed with 'chunk_')
 * Returns both the token and its prefix for display
 */
export function generatePersonalAccessToken(): { token: string; prefix: string } {
  const token = `chunk_${generateSecureToken(32)}`;
  const prefix = token.substring(0, 12);
  return { token, prefix };
}

/**
 * Hash a token for secure storage
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Verify a token against its hash
 */
export function verifyToken(token: string, hash: string): boolean {
  const tokenHash = hashToken(token);
  // Constant-time comparison to prevent timing attacks
  if (tokenHash.length !== hash.length) {
    return false;
  }
  let result = 0;
  for (let i = 0; i < tokenHash.length; i++) {
    result |= tokenHash.charCodeAt(i) ^ hash.charCodeAt(i);
  }
  return result === 0;
}
