import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromRequest(req);
  if (!session || session.role !== 'admin')
    return NextResponse.json({ success: false, message: 'ต้องการสิทธิ์ Admin' }, { status: 403 });

  const { id } = await params;
  if (!(await db.prepare('SELECT id FROM installers WHERE id = ?').get(id)))
    return NextResponse.json({ success: false, message: 'ไม่พบผู้ติดตั้ง' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const { is_featured, featured_from, featured_until } = body;

  await db.prepare('UPDATE installers SET is_featured=?, featured_from=?, featured_until=? WHERE id=?')
    .run(is_featured ? 1 : 0, featured_from || null, featured_until || null, id);

  return NextResponse.json({ success: true, message: is_featured ? 'ตั้งเป็นแนะนำแล้ว' : 'ยกเลิกการแนะนำแล้ว' });
}
