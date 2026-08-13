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

  const { cover_image } = await req.json().catch(() => ({}));

  await db.prepare('UPDATE blogs SET cover_image = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(cover_image || null, id);

  return NextResponse.json({ success: true });
}
