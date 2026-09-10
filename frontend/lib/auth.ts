import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import crypto from 'crypto';
import type { JwtPayload, AffiliateJwtPayload } from '@/types';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'dev_secret_change_in_production'
);

export const COOKIE_NAME = 'st_session';

// Affiliate is a fully separate public role (own signup/login/dashboard, not
// nested under installers/admin) — kept on its own cookie so an affiliate
// session and an installer/admin session can coexist in the same browser,
// per the confirmed spec's "fully separate role" decision.
export const AFFILIATE_COOKIE_NAME = 'st_affiliate_session';

export async function signToken(payload: JwtPayload | AffiliateJwtPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}

export async function verifyToken<T = JwtPayload>(token: string): Promise<T | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as T;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<JwtPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function getSessionFromRequest(req: NextRequest): Promise<JwtPayload | null> {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function getAffiliateSession(): Promise<AffiliateJwtPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AFFILIATE_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken<AffiliateJwtPayload>(token);
}

export async function getAffiliateSessionFromRequest(req: NextRequest): Promise<AffiliateJwtPayload | null> {
  const token = req.cookies.get(AFFILIATE_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken<AffiliateJwtPayload>(token);
}

export function requireAuth(session: JwtPayload | null): asserts session is JwtPayload {
  if (!session) throw new Error('Unauthorized');
}

export function requireAdmin(session: JwtPayload | null): asserts session is JwtPayload {
  if (!session || session.role !== 'admin') throw new Error('Forbidden');
}

const TEMP_PASSWORD_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';

export function generateTempPassword(length = 10): string {
  const bytes = crypto.randomBytes(length);
  let pw = '';
  for (let i = 0; i < length; i++) pw += TEMP_PASSWORD_CHARS[bytes[i] % TEMP_PASSWORD_CHARS.length];
  return pw;
}
