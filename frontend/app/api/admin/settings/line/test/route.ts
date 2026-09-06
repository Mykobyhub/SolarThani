import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';
import { pushLineMessage, getLineConfig } from '@/lib/line/send';

export const dynamic = 'force-dynamic';

// POST: sends a test push message to the admin's own linked LINE account. Admin accounts are
// rows in the `installers` table (role='admin'), so they use the same `line_user_id` link
// mechanism as an installer — link it from the dashboard's LINE-connect card first.
export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session || session.role !== 'admin')
    return NextResponse.json({ success: false, message: 'ต้องการสิทธิ์ Admin' }, { status: 403 });

  const cfg = await getLineConfig();
  if (!cfg.enabled || !cfg.accessToken)
    return NextResponse.json({ success: false, message: 'กรุณาตั้งค่า Channel Access Token และเปิดใช้งานก่อน' }, { status: 400 });

  const row = (await db.prepare('SELECT line_user_id FROM installers WHERE id = ?').get(session.id)) as { line_user_id: string | null } | undefined;
  if (!row?.line_user_id)
    return NextResponse.json({ success: false, message: 'บัญชีนี้ยังไม่ได้เชื่อมต่อ LINE — ไปที่หน้า Dashboard เพื่อเชื่อมต่อ LINE ของคุณก่อน' }, { status: 400 });

  await pushLineMessage(row.line_user_id, '✅ ทดสอบส่งข้อความจากระบบ Solar Thani Thailand สำเร็จ');

  return NextResponse.json({ success: true, message: 'ส่งข้อความทดสอบแล้ว กรุณาตรวจสอบแชท LINE ของคุณ' });
}
