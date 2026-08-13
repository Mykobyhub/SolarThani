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

  const safeStatus = ['new', 'read', 'resolved'].includes(status || '') ? status : null;
  const where  = safeStatus ? 'WHERE status = ?' : '';
  const params = safeStatus ? [safeStatus] : [];
  const total  = ((await db.prepare(`SELECT COUNT(*) AS cnt FROM contact_messages ${where}`).get(...params)) as { cnt: number }).cnt;
  const rows   = await db.prepare(`SELECT * FROM contact_messages ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`)
    .all(...params, lim, off);

  return NextResponse.json({ success: true, total, page, data: rows });
}
