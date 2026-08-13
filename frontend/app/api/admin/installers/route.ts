import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session || session.role !== 'admin')
    return NextResponse.json({ success: false, message: 'ต้องการสิทธิ์ Admin' }, { status: 403 });

  const installers = await db.prepare(
    'SELECT id, email, name, phone, location, status, role, created_at, verified_at, is_featured, featured_from, featured_until FROM installers ORDER BY created_at DESC'
  ).all();

  return NextResponse.json({ success: true, total: installers.length, data: installers });
}
