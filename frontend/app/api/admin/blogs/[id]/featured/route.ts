import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromRequest(req);
  if (!session || session.role !== 'admin')
    return NextResponse.json({ success: false, message: 'ต้องการสิทธิ์ Admin' }, { status: 403 });

  const { id } = await params;
  if (!(await db.prepare('SELECT id FROM blogs WHERE id = ?').get(id)))
    return NextResponse.json({ success: false, message: 'ไม่พบบทความ' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const { featured } = body;

  if (featured) {
    const count = ((await db.prepare(`SELECT COUNT(*) AS c FROM blogs WHERE featured = 1`).get()) as { c: number }).c;
    if (count >= 4) return NextResponse.json({ success: false, message: 'เลือกได้สูงสุด 4 บทความ กรุณายกเลิกบทความเดิมก่อน' }, { status: 400 });
  }

  await db.prepare('UPDATE blogs SET featured = ? WHERE id = ?').run(featured ? 1 : 0, id);
  return NextResponse.json({ success: true });
}
