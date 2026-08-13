import crypto from 'crypto';
import { db } from './db';

// ─── In-memory OAuth state store (same pattern as Express) ───────────────────
interface OAuthState {
  provider: string;
  codeVerifier?: string;
  ts: number;
}

declare global {
  // eslint-disable-next-line no-var
  var __oauthStates: Map<string, OAuthState> | undefined;
}

export const oauthStates: Map<string, OAuthState> =
  global.__oauthStates ?? (global.__oauthStates = new Map());

// Prune expired states every 5 minutes
setInterval(() => {
  const cutoff = Date.now() - 600_000;
  for (const [k, v] of oauthStates) {
    if (v.ts < cutoff) oauthStates.delete(k);
  }
}, 300_000);

// ─── DB helpers ───────────────────────────────────────────────────────────────
export async function getOAuthCreds(provider: string) {
  return (await db
    .prepare('SELECT * FROM oauth_providers WHERE provider = ?')
    .get(provider)) as { provider: string; client_id: string; client_secret: string; active: number } | undefined;
}

export interface OAuthProfile {
  email: string | null;
  name: string;
}

export async function findOrCreateOAuthUser(provider: string, providerId: string, profile: OAuthProfile) {
  // 1. match by provider + oauth_id
  let user = (await db
    .prepare('SELECT * FROM installers WHERE oauth_provider = ? AND oauth_id = ?')
    .get(provider, String(providerId))) as Record<string, unknown> | undefined;
  if (user) return (user.status as string) === 'suspended' ? null : user;

  // 2. link to existing email account
  if (profile.email) {
    user = (await db
      .prepare('SELECT * FROM installers WHERE email = ?')
      .get(profile.email.toLowerCase())) as Record<string, unknown> | undefined;
    if (user) {
      await db.prepare('UPDATE installers SET oauth_provider = ?, oauth_id = ? WHERE id = ?').run(
        provider, String(providerId), user.id
      );
      return (user.status as string) === 'suspended' ? null : user;
    }
  }

  // 3. create new account
  const regMode = (await db
    .prepare("SELECT value FROM site_content WHERE key = 'registration_mode'")
    .get()) as { value: string } | undefined;
  const status = regMode?.value === 'auto' ? 'active' : 'pending';
  const email = profile.email?.toLowerCase() || `${provider}_${providerId}@oauth.local`;

  const result = (await db
    .prepare(
      "INSERT INTO installers (email, password_hash, name, status, oauth_provider, oauth_id) VALUES (?, '', ?, ?, ?, ?) RETURNING id"
    )
    .get(email, profile.name || `${provider} User`, status, provider, String(providerId))) as { id: number };

  return (await db
    .prepare('SELECT * FROM installers WHERE id = ?')
    .get(result.id)) as Record<string, unknown>;
}

// ─── PKCE helpers (for Twitter) ───────────────────────────────────────────────
export function pkceVerifier(): string {
  return crypto.randomBytes(32).toString('base64url');
}

export function pkceChallenge(verifier: string): string {
  return crypto.createHash('sha256').update(verifier).digest('base64url');
}

export function generateState(): string {
  return crypto.randomBytes(16).toString('hex');
}

// ─── HTTPS fetch helper (no extra deps, same as Express) ─────────────────────
export async function oauthFetch(
  method: 'GET' | 'POST',
  url: string,
  options: { body?: Record<string, string>; headers?: Record<string, string> } = {}
): Promise<Record<string, unknown>> {
  const response = await fetch(url, {
    method,
    headers: {
      Accept: 'application/json',
      ...(method === 'POST' ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
      ...options.headers,
    },
    body: method === 'POST' && options.body
      ? new URLSearchParams(options.body).toString()
      : undefined,
  });
  return response.json();
}
