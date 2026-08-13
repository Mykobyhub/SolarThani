import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

function parseInstallerJson(row: Record<string, unknown>) {
  for (const f of ['services', 'certifications', 'projects', 'reviews_sample', 'service_provinces']) {
    try { row[f] = JSON.parse((row[f] as string) || '[]'); }
    catch { row[f] = []; }
  }
  return row;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = (await db.prepare(`
    SELECT id, name, description, phone, email, location, about, logo_url,
           experience, founded_year, rating, reviews_count, total_projects,
           total_kw, satisfaction_rate, line_id, response_time,
           warranty_panel, warranty_inverter, warranty_workmanship,
           services, certifications, projects, reviews_sample, verified_at,
           lat, lng, service_provinces, profile_views,
           youtube_url, tiktok_url, facebook_url, website_url
    FROM installers WHERE id = ? AND status = 'active'
  `).get(id)) as Record<string, unknown> | undefined;

  if (!row) return NextResponse.json({ success: false, message: 'ไม่พบผู้ติดตั้ง' }, { status: 404 });

  await db.prepare(`UPDATE installers SET profile_views = profile_views + 1 WHERE id = ?`).run(id);

  return NextResponse.json({ success: true, data: parseInstallerJson(row) });
}
