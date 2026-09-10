import { NextResponse } from 'next/server';
import { AFFILIATE_COOKIE_NAME } from '@/lib/auth';

export async function POST() {
  const res = NextResponse.json({ success: true });
  res.cookies.set(AFFILIATE_COOKIE_NAME, '', { maxAge: 0, path: '/' });
  return res;
}
