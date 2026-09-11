import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Public, unauthenticated endpoint — only expose keys that are safe to show to anyone.
const PUBLIC_KEYS = ['support_email'];

export async function GET() {
  const rows = (await db
    .prepare(`SELECT key, value FROM site_content WHERE key IN (${PUBLIC_KEYS.map(() => '?').join(',')})`)
    .all(...PUBLIC_KEYS)) as { key: string; value: string }[];
  const data: Record<string, string> = {};
  rows.forEach(r => { data[r.key] = r.value; });
  return NextResponse.json({ success: true, data });
}
