import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session || session.role !== 'admin')
    return NextResponse.json({ success: false, message: 'ต้องการสิทธิ์ Admin' }, { status: 403 });

  const sp       = req.nextUrl.searchParams;
  const status   = sp.get('status');
  const province = sp.get('province');
  const q        = sp.get('q');
  const page     = Math.max(parseInt(sp.get('page') || '1'), 1);
  const lim      = 20;
  const off      = (page - 1) * lim;

  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (['new', 'contacted', 'closed'].includes(status || '')) { conditions.push('l.status = ?'); params.push(status!); }
  if (province) { conditions.push('l.province = ?'); params.push(province); }
  if (q)        { conditions.push('l.name LIKE ?');  params.push(`%${q}%`); }

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  const total = ((await db.prepare(`SELECT COUNT(*) AS cnt FROM leads l ${where}`).get(...params)) as { cnt: number }).cnt;

  const rows = await db.prepare(`
    SELECT l.id, l.name, l.email, l.phone, l.province, l.message,
           l.status, l.system_kw, l.created_at, l.installer_id,
           l.calc_data, l.calc_file, i.name AS installer_name
    FROM leads l LEFT JOIN installers i ON l.installer_id = i.id
    ${where}
    ORDER BY l.created_at DESC LIMIT ? OFFSET ?
  `).all(...params, lim, off);

  return NextResponse.json({ success: true, total, page, data: rows });
}
