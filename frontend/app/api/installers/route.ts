import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

function parseInstallerJson(row: Record<string, unknown>) {
  for (const f of ['services', 'certifications', 'projects', 'reviews_sample', 'service_provinces']) {
    try { (row as Record<string, unknown>)[f] = JSON.parse((row[f] as string) || '[]'); }
    catch { (row as Record<string, unknown>)[f] = []; }
  }
  return row;
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const province  = searchParams.get('province');
  const minRating = searchParams.get('minRating');
  const minExp    = searchParams.get('minExp');
  const sort      = searchParams.get('sort');
  const limit     = parseInt(searchParams.get('limit') || '100');
  const offset    = parseInt(searchParams.get('offset') || '0');

  let sql = `
    SELECT id, name, description, location, service_provinces, experience, rating, reviews_count,
           total_projects, total_kw, satisfaction_rate, logo_url, response_time, about, verified_at
    FROM installers WHERE status = 'active'
  `;
  const params: (string | number)[] = [];

  if (province)  { sql += ` AND (location LIKE ? OR service_provinces LIKE ?)`; params.push(`%${province}%`, `%${province}%`); }
  if (minRating) { sql += ` AND rating >= ?`;     params.push(parseFloat(minRating)); }
  if (minExp)    { sql += ` AND experience >= ?`; params.push(parseInt(minExp)); }

  let rows = (await db.prepare(sql).all(...params)) as Record<string, unknown>[];

  if      (sort === 'rating')     rows.sort((a, b) => (b.rating as number) - (a.rating as number));
  else if (sort === 'experience') rows.sort((a, b) => (b.experience as number) - (a.experience as number));
  else if (sort === 'projects')   rows.sort((a, b) => (b.total_projects as number) - (a.total_projects as number));
  else rows.sort((a, b) =>
    ((b.rating as number) * Math.log((b.reviews_count as number) + 1)) -
    ((a.rating as number) * Math.log((a.reviews_count as number) + 1))
  );

  const total = rows.length;
  rows = rows.slice(offset, offset + limit);

  return NextResponse.json({ success: true, total, data: rows });
}
