// Shared `sp_ref` cookie shape — set by POST /api/affiliate/click on a valid
// `?ref=CODE` click, read by /api/contact (and, eventually, the calculator's
// lead-submit step) to attribute a lead to the affiliate that referred it.
// Kept in one place so the writer and every reader agree on the payload
// shape and the 30-day attribution window from the confirmed spec.
import { AFFILIATE_ATTRIBUTION_WINDOW_DAYS } from './constants';

export const SP_REF_COOKIE_NAME = 'sp_ref';
export const SP_REF_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * AFFILIATE_ATTRIBUTION_WINDOW_DAYS;

export interface SpRefCookiePayload {
  affiliateId: number;
  installerId: number | null;
  timestamp: number;
}

// Parses + validates the `sp_ref` cookie value. Re-checks the 30-day window
// against `timestamp` as defense-in-depth beyond the cookie's own `maxAge`
// (a forwarded/replayed cookie value shouldn't outlive the attribution
// window just because some client held onto it past its browser-enforced
// expiry). Returns null on anything malformed or expired.
export function parseSpRefCookie(raw: string | undefined | null): SpRefCookiePayload | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw);
    if (typeof data?.affiliateId !== 'number' || typeof data?.timestamp !== 'number') return null;
    const ageMs = Date.now() - data.timestamp;
    if (ageMs < 0 || ageMs > SP_REF_COOKIE_MAX_AGE_SECONDS * 1000) return null;
    return {
      affiliateId: data.affiliateId,
      installerId: typeof data.installerId === 'number' ? data.installerId : null,
      timestamp: data.timestamp,
    };
  } catch {
    return null;
  }
}
