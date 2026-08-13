import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await db.prepare(`SELECT * FROM blogs WHERE slug = ? AND status = 'active'`).get(slug);
  if (!post) return NextResponse.json({ success: false, message: 'ไม่พบบทความ' }, { status: 404 });

  const p = post as { category: string; slug: string };
  const related = await db.prepare(
    `SELECT id, title, slug, excerpt, category, cover_image, published_at
     FROM blogs WHERE status='active' AND category=? AND slug!=?
     ORDER BY published_at DESC LIMIT 3`
  ).all(p.category, p.slug);

  return NextResponse.json({ success: true, data: post, related });
}
