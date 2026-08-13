import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const sp       = req.nextUrl.searchParams;
  const category = sp.get('category');
  const tag      = sp.get('tag');
  const q        = sp.get('q');
  const page     = parseInt(sp.get('page') || '1');
  const limit    = parseInt(sp.get('limit') || '12');
  const offset   = (page - 1) * limit;

  let where = `status = 'active'`;
  const params: (string | number)[] = [];

  if (category) { where += ` AND category = ?`; params.push(category); }
  if (tag)      { where += ` AND tags LIKE ?`;  params.push(`%"${tag}"%`); }
  if (q)        { where += ` AND (title LIKE ? OR excerpt LIKE ?)`; params.push(`%${q}%`, `%${q}%`); }

  const total = ((await db.prepare(`SELECT COUNT(*) AS c FROM blogs WHERE ${where}`).get(...params)) as { c: number }).c;
  const rows  = await db.prepare(
    `SELECT id, title, slug, excerpt, author, category, tags, cover_image, published_at
     FROM blogs WHERE ${where}
     ORDER BY published_at DESC LIMIT ? OFFSET ?`
  ).all(...params, limit, offset);

  return NextResponse.json({ success: true, data: rows, total, page, pages: Math.ceil(total / limit) });
}
