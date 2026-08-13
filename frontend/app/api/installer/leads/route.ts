import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ success: false, message: 'กรุณาเข้าสู่ระบบก่อน' }, { status: 401 });

  const leads = await db.prepare(
    'SELECT * FROM leads WHERE installer_id = ? ORDER BY created_at DESC'
  ).all(session.id);

  return NextResponse.json({ success: true, total: leads.length, data: leads });
}
