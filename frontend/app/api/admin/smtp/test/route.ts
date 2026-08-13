import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';
import { sendEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session || session.role !== 'admin')
    return NextResponse.json({ success: false, message: 'ต้องการสิทธิ์ Admin' }, { status: 403 });

  const u = (await db.prepare(`SELECT value FROM site_content WHERE key='smtp_user'`).get()) as { value: string } | undefined;
  const p = (await db.prepare(`SELECT value FROM site_content WHERE key='smtp_pass'`).get()) as { value: string } | undefined;
  if (!u?.value || !p?.value)
    return NextResponse.json({ success: false, message: 'ยังไม่ได้ตั้งค่า SMTP' }, { status: 400 });

  try {
    await sendEmail({
      to: u.value,
      subject: '[Solar Thani] ทดสอบการส่งอีเมล',
      html: `<p>อีเมลนี้เป็นการทดสอบระบบ SMTP ของ <strong>Solar Thani Thailand</strong></p>
             <p style="color:#00b8a0;font-weight:600">✓ การตั้งค่าถูกต้อง ระบบอีเมลพร้อมใช้งาน</p>`,
    });
    return NextResponse.json({ success: true, message: `ส่ง Test Email ไปที่ ${u.value} สำเร็จ` });
  } catch (e) {
    return NextResponse.json({ success: false, message: `ส่งไม่สำเร็จ: ${(e as Error).message}` }, { status: 500 });
  }
}
