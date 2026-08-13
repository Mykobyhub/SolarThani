import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';
import { saveFile } from '@/lib/upload';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ success: false, message: 'กรุณาเข้าสู่ระบบก่อน' }, { status: 401 });

  const formData = await req.formData().catch(() => null);
  const file = formData?.get('logo') as File | null;
  if (!file || file.size === 0) return NextResponse.json({ success: false, message: 'กรุณาเลือกรูปภาพ' }, { status: 400 });
  if (!file.type.startsWith('image/')) return NextResponse.json({ success: false, message: 'รองรับเฉพาะไฟล์รูปภาพ' }, { status: 400 });
  if (file.size > 2 * 1024 * 1024) return NextResponse.json({ success: false, message: 'ไฟล์ขนาดใหญ่เกิน 2MB' }, { status: 400 });

  const logoUrl = await saveFile(file, 'logos', `installer-${session.id}-${Date.now()}`);
  await db.prepare('UPDATE installers SET logo_url = ? WHERE id = ?').run(logoUrl, session.id);

  return NextResponse.json({ success: true, logo_url: logoUrl });
}
