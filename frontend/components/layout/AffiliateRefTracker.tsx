'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

// Invisible, site-wide affiliate click tracker. There's no middleware.ts in
// this repo (by convention), so `?ref=CODE` is resolved client-side instead:
// mounted once in the root layout, it watches for the query param on every
// route (both referral link forms from the confirmed spec land here —
// site-wide `/?ref=CODE` and installer-specific `/installers/:id?ref=CODE`,
// the latter recognized by matching the current pathname) and reports it to
// POST /api/affiliate/click, which does the real work (resolve code, rate
// limit, insert affiliate_clicks, set the sp_ref cookie). Renders nothing.
export default function AffiliateRefTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const firedForRef = useRef<string | null>(null);

  useEffect(() => {
    const code = searchParams.get('ref');
    if (!code) return;

    const fireKey = `${pathname}?ref=${code}`;
    if (firedForRef.current === fireKey) return;
    firedForRef.current = fireKey;

    const installerMatch = pathname.match(/^\/installers\/(\d+)/);
    const installerId = installerMatch ? Number(installerMatch[1]) : null;

    fetch('/api/affiliate/click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, installerId, landingPath: pathname }),
      keepalive: true,
    }).catch(() => {
      // Best-effort tracking pixel — never surfaces an error to the visitor.
    });
  }, [pathname, searchParams]);

  return null;
}
