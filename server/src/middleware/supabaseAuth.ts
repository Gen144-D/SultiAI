import { Request, Response, NextFunction } from 'express';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const JWKS_URL = process.env.SUPABASE_JWKS_URL || `${SUPABASE_URL}/auth/v1/.well-known/jwks.json`;

// Cache JWKS keys (refresh every 10 minutes)
let jwksCache: { keys: any[]; fetchedAt: number } = { keys: [], fetchedAt: 0 };
const JWKS_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

async function fetchJWKS(): Promise<any[]> {
  const now = Date.now();
  if (jwksCache.keys.length > 0 && now - jwksCache.fetchedAt < JWKS_CACHE_TTL) {
    return jwksCache.keys;
  }

  const res = await fetch(JWKS_URL);
  if (!res.ok) throw new Error(`Failed to fetch JWKS: ${res.status}`);
  const data: any = await res.json();
  jwksCache = { keys: data.keys || [], fetchedAt: now };
  return jwksCache.keys;
}

// Simple JWT decode + JWKS verification
async function verifySupabaseToken(token: string): Promise<any> {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
  const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());

  // Check expiry
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;

  // Fetch JWKS and find the matching key
  const keys = await fetchJWKS();
  const jwk = keys.find((k: any) => k.kid === header.kid);
  if (!jwk) return null;

  // Import the public key
  const { importKey, verify } = await getSubtleCrypto();
  const publicKey = await importKey(
    'jwk',
    jwk,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify']
  );

  // Verify signature
  const dataToVerify = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
  const signature = Uint8Array.from(Buffer.from(parts[2], 'base64url'));
  const valid = await verify('RSASSA-PKCS1-v1_5', publicKey, signature, dataToVerify);

  if (!valid) return null;
  return payload;
}

// Node.js crypto for signature verification (since SubtleCrypto may not have RSA)
let subtleCrypto: SubtleCrypto | null = null;
async function getSubtleCrypto() {
  if (!subtleCrypto) {
    // Node 15+ has webcrypto
    const { webcrypto } = await import('crypto');
    subtleCrypto = webcrypto as unknown as SubtleCrypto;
  }
  return subtleCrypto;
}

/**
 * Supabase auth middleware for Express.
 * Verifies Supabase-issued JWTs using JWKS.
 * Falls back to legacy JWT verification if JWKS fails.
 */
export async function supabaseAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Access token required' });
    return;
  }

  try {
    // Try JWKS verification first
    const payload = await verifySupabaseToken(token);
    if (payload) {
      // Map Supabase payload to our user format
      req.user = {
        userId: 0, // Will be resolved to local user ID by email lookup
        email: payload.email || '',
        id: 0,
        sub: payload.sub, // Supabase UUID
        ...payload,
      };
      return next();
    }
  } catch (err) {
    console.warn(
      '[SupabaseAuth] JWKS verification failed, trying legacy JWT:',
      (err as Error).message
    );
  }

  // Fall back to legacy JWT verification
  try {
    const { verifyToken } = await import('../utils/jwt');
    const session = verifyToken(token);
    if (session) {
      req.user = { ...session, id: session.userId };
      return next();
    }
  } catch {}

  res.status(401).json({ error: 'Invalid or expired token' });
}
