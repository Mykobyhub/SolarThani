import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromRequest(req);
  if (!session || session.role !== 'admin')
    return NextResponse.json({ success: false, message: 'ต้องการสิทธิ์ Admin' }, { status: 403 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { status } = body;

  if (!['new', 'read', 'resolved'].includes(status))
    return NextResponse.json({ success: false, message: 'สถานะไม่ถูกต้อง' }, { status: 400 });

  const info = (await db.prepare('UPDATE contact_messages SET status = ? WHERE id = ?').run(status, id)) as { changes: number };
  if (!info.changes) return NextResponse.json({ success: false, message: 'ไม่พบข้อความ' }, { status: 404 });

  return NextResponse.json({ success: true });
}
