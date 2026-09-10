import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!token) return NextResponse.redirect(new URL('/affiliate/login?verify=invalid', APP_URL));

  const verification = (await db
    .prepare("SELECT * FROM affiliate_verifications WHERE token = ? AND used = 0 AND expires_at > NOW()")
    .get(token)) as { id: number; affiliate_id: number } | undefined;

  if (!verification)
    return NextResponse.redirect(new URL('/affiliate/login?verify=invalid', APP_URL));

  await db.prepare("UPDATE affiliates SET status = 'active', verified_at = NOW() WHERE id = ?")
    .run(verification.affiliate_id);
  await db.prepare('UPDATE affiliate_verifications SET used = 1 WHERE id = ?').run(verification.id);

  return NextResponse.redirect(new URL('/affiliate/login?verified=1', APP_URL));
}
