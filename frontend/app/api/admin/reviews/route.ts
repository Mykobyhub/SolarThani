import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session || session.role !== 'admin')
    return NextResponse.json({ success: false, message: 'ต้องการสิทธิ์ Admin' }, { status: 403 });

  const sp     = req.nextUrl.searchParams;
  const status = sp.get('status');
  const page   = Math.max(parseInt(sp.get('page') || '1'), 1);
  const lim    = 20;
  const off    = (page - 1) * lim;

  const safeStatus = ['pending', 'active', 'rejected'].includes(status || '') ? status : null;
  const where  = safeStatus ? `WHERE r.status = ?` : '';
  const params = safeStatus ? [safeStatus, lim, off] : [lim, off];

  const total = ((await db.prepare(`SELECT COUNT(*) AS cnt FROM reviews r ${where}`)
    .get(...(safeStatus ? [safeStatus] : []))) as { cnt: number }).cnt;

  const rows = await db.prepare(`
    SELECT r.id, r.installer_id, r.reviewer_name, r.reviewer_email,
           r.rating, r.title, r.body, r.install_date, r.status,
           r.verified_at, r.created_at, i.name AS installer_name
    FROM reviews r LEFT JOIN installers i ON r.installer_id = i.id
    ${where}
    ORDER BY r.created_at DESC LIMIT ? OFFSET ?
  `).all(...params);

  return NextResponse.json({ success: true, total, page, data: rows });
}
