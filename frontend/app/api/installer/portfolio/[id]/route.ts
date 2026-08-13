import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';
import { deleteFile } from '@/lib/upload';

export const dynamic = 'force-dynamic';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ success: false, message: 'กรุณาเข้าสู่ระบบก่อน' }, { status: 401 });

  const { id } = await params;
  const photo = (await db.prepare('SELECT * FROM portfolio_photos WHERE id = ? AND installer_id = ?')
    .get(id, session.id)) as { id: number; photo_url: string } | undefined;

  if (!photo) return NextResponse.json({ success: false, message: 'ไม่พบรูปภาพนี้' }, { status: 404 });

  deleteFile(photo.photo_url);
  await db.prepare('DELETE FROM portfolio_photos WHERE id = ?').run(photo.id);

  return NextResponse.json({ success: true, message: 'ลบรูปภาพสำเร็จ' });
}
