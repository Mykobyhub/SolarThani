import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/db';
import { checkRateLimit } from '@/lib/rate-limit';
import { CLICK_RATE_LIMIT_PER_HOUR } from '@/lib/affiliate/constants';
import { SP_REF_COOKIE_NAME, SP_REF_COOKIE_MAX_AGE_SECONDS } from '@/lib/affiliate/ref-cookie';

export const dynamic = 'force-dynamic';

// Fired by the client-side <AffiliateRefTracker> (mounted once in the root
// layout) whenever it detects `?ref=CODE` in the URL — the two referral link
// forms from the confirmed spec (site-wide `/?ref=CODE` and installer-specific
// `/installers/:id?ref=CODE`) both land here. Always responds 200 with
// `{ success: false }` on any rejection (unknown code, inactive affiliate,
// rate-limited) — this is a silent tracking pixel, not a user-facing action,
// so it never surfaces an error to the visitor.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const rawCode = typeof body.code === 'string' ? body.code.trim().toUpperCase() : '';
  const rawInstallerId = body.installerId;
  const landingPath = typeof body.landingPath === 'string' ? body.landingPath.slice(0, 500) : null;

  if (!rawCode) return NextResponse.json({ success: false });

  const affiliate = (await db
    .prepare(`SELECT id FROM affiliates WHERE referral_code = ? AND status = 'active'`)
    .get(rawCode)) as { id: number } | undefined;

  if (!affiliate) return NextResponse.json({ success: false });

  // Installer-specific link form — validate the id actually resolves to a
  // real installer before trusting it (site-wide links send installerId:null).
  let installerId: number | null = null;
  const candidateInstallerId = Number(rawInstallerId);
  if (Number.isInteger(candidateInstallerId) && candidateInstallerId > 0) {
    const inst = (await db.prepare(`SELECT id FROM installers WHERE id = ?`).get(candidateInstallerId)) as
      | { id: number }
      | undefined;
    if (inst) installerId = inst.id;
  }

  // Never store raw IPs — hash before it touches the DB or the rate-limit key.
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  const ipHash = crypto.createHash('sha256').update(ip).digest('hex');
  const userAgent = (req.headers.get('user-agent') || '').slice(0, 500);

  const rl = checkRateLimit(`affiliate-click:${affiliate.id}:${ipHash}`, CLICK_RATE_LIMIT_PER_HOUR, 60 * 60 * 1000);
  if (!rl.allowed) {
    // Anti-fraud: silently drop over-limit clicks — no new cookie, no new row.
    return NextResponse.json({ success: false });
  }

  await db
    .prepare(
      `INSERT INTO affiliate_clicks (affiliate_id, installer_id, ip_hash, user_agent, landing_path)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(affiliate.id, installerId, ipHash, userAgent, landingPath);

  const res = NextResponse.json({ success: true });

  // Last-click-wins: every valid click unconditionally overwrites the cookie.
  const cookieValue = JSON.stringify({
    affiliateId: affiliate.id,
    installerId,
    timestamp: Date.now(),
  });
  res.cookies.set(SP_REF_COOKIE_NAME, cookieValue, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SP_REF_COOKIE_MAX_AGE_SECONDS,
    path: '/',
  });

  return res;
}
