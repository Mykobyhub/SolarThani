import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const rows = await db.prepare(
    `SELECT id, title, slug, excerpt, author, category, cover_image, published_at
     FROM blogs WHERE featured = 1 AND status = 'active'
     ORDER BY published_at DESC LIMIT 4`
  ).all();
  return NextResponse.json({ success: true, data: rows });
}
