import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

export async function PUT(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ success: false, message: 'กรุณาเข้าสู่ระบบก่อน' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const currentPassword = body.currentPassword ?? body.current_password;
  const newPassword = body.newPassword ?? body.new_password;

  if (!currentPassword || !newPassword || String(newPassword).length < 8)
    return NextResponse.json({ success: false, message: 'รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร' }, { status: 400 });

  const installer = (await db.prepare('SELECT password_hash FROM installers WHERE id = ?').get(session.id)) as { password_hash: string } | undefined;
  if (!installer) return NextResponse.json({ success: false, message: 'ไม่พบข้อมูล' }, { status: 404 });

  const match = await bcrypt.compare(String(currentPassword), installer.password_hash);
  if (!match) return NextResponse.json({ success: false, message: 'รหัสผ่านปัจจุบันไม่ถูกต้อง' }, { status: 401 });

  const password_hash = await bcrypt.hash(String(newPassword), 12);
  await db.prepare('UPDATE installers SET password_hash = ?, must_change_password = 0 WHERE id = ?').run(password_hash, session.id);

  return NextResponse.json({ success: true, message: 'เปลี่ยนรหัสผ่านสำเร็จ' });
}
