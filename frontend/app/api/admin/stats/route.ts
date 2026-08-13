import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session || session.role !== 'admin')
    return NextResponse.json({ success: false, message: 'ต้องการสิทธิ์ Admin' }, { status: 403 });

  const installers = await db.prepare(`
    SELECT
      SUM(CASE WHEN status='pending'   THEN 1 ELSE 0 END) AS pending,
      SUM(CASE WHEN status='active'    THEN 1 ELSE 0 END) AS active,
      SUM(CASE WHEN status='suspended' THEN 1 ELSE 0 END) AS suspended,
      SUM(CASE WHEN status='rejected'  THEN 1 ELSE 0 END) AS rejected
    FROM installers WHERE role='installer'
  `).get();

  const leads = (await db.prepare(`
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN created_at::date = CURRENT_DATE THEN 1 ELSE 0 END) AS today,
      SUM(CASE WHEN status='new' THEN 1 ELSE 0 END) AS new_count
    FROM leads
  `).get()) as { total: number; today: number; new_count: number };

  const reviews = await db.prepare(`
    SELECT
      SUM(CASE WHEN status='pending'  THEN 1 ELSE 0 END) AS pending,
      SUM(CASE WHEN status='active'   THEN 1 ELSE 0 END) AS active,
      SUM(CASE WHEN status='rejected' THEN 1 ELSE 0 END) AS rejected
    FROM reviews
  `).get();

  const recent_leads = await db.prepare(`
    SELECT l.id, l.name, l.province, l.created_at, l.status, i.name AS installer_name
    FROM leads l LEFT JOIN installers i ON l.installer_id = i.id
    ORDER BY l.created_at DESC LIMIT 5
  `).all();

  return NextResponse.json({
    success: true,
    installers,
    leads: { total: leads.total, today: leads.today, new: leads.new_count },
    reviews,
    recent_leads,
  });
}
