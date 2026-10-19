import * as jose from 'jose';

/**
 * Validates and retrieves the JWT secret from environment or optional override.
 * Throws a descriptive error if the secret is missing or empty.
 */
export function getJwtSecret(overrideSecret?: string): string {
  const secret = overrideSecret ?? process.env.JWT_SECRET;
  if (!secret || secret.trim() === '') {
    throw new Error('JWT_SECRET environment variable is missing or empty.');
  }
  return secret;
}

export interface AuthTokenPayload {
  id: number;
  email: string;
  role: string;
}

/**
 * Signs an authentication JWT token with explicit HS256 algorithm and expiration time.
 */
export async function signAuthToken(
  payload: AuthTokenPayload,
  overrideSecret?: string,
  expiresIn: string = '7d'
): Promise<string> {
  const secretKey = getJwtSecret(overrideSecret);
  return new jose.SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(new TextEncoder().encode(secretKey));
}

/**
 * Verifies and decodes an authentication JWT token.
 */
export async function verifyAuthToken(
  token: string,
  overrideSecret?: string
): Promise<AuthTokenPayload & { exp?: number; iat?: number }> {
  const secretKey = getJwtSecret(overrideSecret);
  const { payload } = await jose.jwtVerify(token, new TextEncoder().encode(secretKey));
  return payload as unknown as AuthTokenPayload & { exp?: number; iat?: number };
}
