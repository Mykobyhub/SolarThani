import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const rows = (await db.prepare('SELECT key, value FROM site_content').all()) as { key: string; value: string }[];
  const data: Record<string, string> = {};
  rows.forEach(r => { data[r.key] = r.value; });
  return NextResponse.json({ success: true, data });
}
