import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json();

    if (!token || !password || password.length < 8)
      return NextResponse.json(
        { success: false, error: 'ข้อมูลไม่ถูกต้อง รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร' },
        { status: 400 }
      );

    const reset = (await db
      .prepare("SELECT * FROM password_resets WHERE token = ? AND used = 0 AND expires_at > NOW()")
      .get(token)) as { id: number; email: string } | undefined;

    if (!reset)
      return NextResponse.json({ success: false, error: 'ลิงก์ไม่ถูกต้องหรือหมดอายุแล้ว' }, { status: 400 });

    const password_hash = await bcrypt.hash(password, 12);
    await db.prepare('UPDATE installers SET password_hash = ? WHERE email = ?').run(password_hash, reset.email);
    await db.prepare('UPDATE password_resets SET used = 1 WHERE id = ?').run(reset.id);

    return NextResponse.json({ success: true, message: 'รีเซ็ตรหัสผ่านสำเร็จ กรุณาเข้าสู่ระบบใหม่' });
  } catch (err) {
    console.error('Reset password error:', err);
    return NextResponse.json({ success: false, error: 'เกิดข้อผิดพลาด กรุณาลองใหม่' }, { status: 500 });
  }
}
