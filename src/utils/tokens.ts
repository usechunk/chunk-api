import { randomBytes, createHash, timingSafeEqual } from 'crypto';

/**
 * Generate a cryptographically secure random string using Node's crypto module.
 * @param length - The number of random bytes to generate (default: 32)
 * @returns A hex-encoded random string of length * 2 characters
 */
export function generateSecureToken(length: number = 32): string {
  return randomBytes(length).toString('hex');
}

/**
 * Generate a unique client ID for OAuth2 applications.
 * Client IDs are prefixed with 'ch_' for easy identification.
 * @returns A unique client ID string (e.g., 'ch_abc123...')
 */
export function generateClientId(): string {
  return `ch_${generateSecureToken(16)}`;
}

/**
 * Generate a cryptographically secure client secret for OAuth2 applications.
 * @returns A 64-character hex string suitable for client authentication
 */
export function generateClientSecret(): string {
  return generateSecureToken(32);
}

/**
 * Generate a cryptographically secure authorization code for OAuth2 flow.
 * @returns A 64-character hex string for authorization code exchange
 */
export function generateAuthorizationCode(): string {
  return generateSecureToken(32);
}

/**
 * Generate a cryptographically secure access token for API authentication.
 * @returns A 64-character hex string access token
 */
export function generateAccessToken(): string {
  return generateSecureToken(32);
}

/**
 * Generate a cryptographically secure refresh token for obtaining new access tokens.
 * Refresh tokens are longer than access tokens for additional security.
 * @returns A 96-character hex string refresh token
 */
export function generateRefreshToken(): string {
  return generateSecureToken(48);
}

/**
 * Generate a personal access token (PAT) for user API authentication.
 * PATs are prefixed with 'chunk_' for easy identification.
 * @returns An object containing the full token and its display prefix
 */
export function generatePersonalAccessToken(): { token: string; prefix: string } {
  const token = `chunk_${generateSecureToken(32)}`;
  const prefix = token.substring(0, 12);
  return { token, prefix };
}

/**
 * Hash a token using SHA-256 for secure storage.
 * Tokens should never be stored in plain text.
 * @param token - The plain text token to hash
 * @returns The SHA-256 hash of the token as a hex string
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Verify a plain text token against its stored hash using constant-time comparison.
 * Uses Node's timingSafeEqual to prevent timing attacks.
 * @param token - The plain text token to verify
 * @param hash - The stored hash to compare against
 * @returns True if the token matches the hash, false otherwise
 */
export function verifyToken(token: string, hash: string): boolean {
  const tokenHash = hashToken(token);
  // Use Node's built-in constant-time comparison for security
  if (tokenHash.length !== hash.length) {
    return false;
  }
  return timingSafeEqual(Buffer.from(tokenHash), Buffer.from(hash));
}
