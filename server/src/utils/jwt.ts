import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-12345';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-12345';
const ACCESS_TOKEN_EXPIRY = 15 * 60 * 1000;
const REFRESH_TOKEN_EXPIRY = 7 * 24 * 60 * 60 * 1000;

// Supabase JWT secret for verifying Supabase-issued tokens
const SUPABASE_JWT_SECRET =
  process.env.SUPABASE_JWT_SECRET ||
  'MCTSVBraL1sk/bLDmSbxNgFkpVMCac8Kgjpcj+UM4DXTGZ1lIIZwN7lfsOsTCedWGObwVUlpQN7SzOqLaNvFAg==';

function base64url(text: string): string {
  return Buffer.from(text).toString('base64url');
}

export interface JwtPayload {
  email: string;
  userId: number;
  id?: number;
  sub?: string;
  iat?: number;
  exp?: number;
  type?: 'access' | 'refresh';
  role?: string;
  roleId?: number;
  permissions?: string[];
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export function signToken(payload: {
  email: string;
  userId: number;
  role?: string;
  roleId?: number;
  permissions?: string[];
}): string {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64url(
    JSON.stringify({
      ...payload,
      iat: Date.now(),
      exp: Date.now() + ACCESS_TOKEN_EXPIRY,
      type: 'access',
    })
  );
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(header + '.' + body)
    .digest('base64url');
  return header + '.' + body + '.' + signature;
}

export function signRefreshToken(payload: {
  email: string;
  userId: number;
  role?: string;
  roleId?: number;
  permissions?: string[];
}): string {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64url(
    JSON.stringify({
      ...payload,
      iat: Date.now(),
      exp: Date.now() + REFRESH_TOKEN_EXPIRY,
      type: 'refresh',
    })
  );
  const signature = crypto
    .createHmac('sha256', JWT_REFRESH_SECRET)
    .update(header + '.' + body)
    .digest('base64url');
  return header + '.' + body + '.' + signature;
}

export function generateTokenPair(payload: {
  email: string;
  userId: number;
  role?: string;
  roleId?: number;
  permissions?: string[];
}): TokenPair {
  return {
    accessToken: signToken(payload),
    refreshToken: signRefreshToken(payload),
    expiresIn: ACCESS_TOKEN_EXPIRY,
  };
}

function verifyWithSecret(token: string, secret: string): JwtPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const sig = crypto
      .createHmac('sha256', secret)
      .update(parts[0] + '.' + parts[1])
      .digest('base64url');
    if (sig !== parts[2]) return null;
    const data = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    if (data.exp && data.exp < Date.now()) return null;
    return data as JwtPayload;
  } catch {
    return null;
  }
}

/**
 * Verify a JWT token. Tries Supabase JWT first, then falls back to legacy server JWT.
 * This allows the server to accept both Supabase-issued and server-issued tokens.
 */
export function verifyToken(token: string): JwtPayload | null {
  // Try Supabase JWT first (sub field = UUID, email in payload)
  const supabasePayload = verifyWithSecret(token, SUPABASE_JWT_SECRET);
  if (supabasePayload && (supabasePayload as any).sub) {
    // Supabase token — map sub to userId for server compatibility
    return {
      ...supabasePayload,
      userId: supabasePayload.userId || 0,
      email: supabasePayload.email || (supabasePayload as any).email || '',
      id: supabasePayload.userId || 0,
      role: (supabasePayload as any).role,
      roleId: (supabasePayload as any).roleId,
      permissions: (supabasePayload as any).permissions,
    };
  }

  // Fall back to legacy server JWT
  return verifyWithSecret(token, JWT_SECRET);
}

export function verifyRefreshToken(token: string): JwtPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const sig = crypto
      .createHmac('sha256', JWT_REFRESH_SECRET)
      .update(parts[0] + '.' + parts[1])
      .digest('base64url');
    if (sig !== parts[2]) return null;
    const data = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    if (data.exp < Date.now()) return null;
    if (data.type !== 'refresh') return null;
    return data as JwtPayload;
  } catch {
    return null;
  }
}
