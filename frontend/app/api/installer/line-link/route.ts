import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// DELETE: unlinks LINE from the logged-in installer's account.
export async function DELETE(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ success: false, message: 'กรุณาเข้าสู่ระบบก่อน' }, { status: 401 });

  await db.prepare('UPDATE installers SET line_user_id = NULL WHERE id = ?').run(session.id);
  await db.prepare("UPDATE payment_projects SET installer_notify_channel = 'email' WHERE installer_id = ? AND installer_notify_channel != 'email'").run(session.id);

  return NextResponse.json({ success: true, message: 'ยกเลิกการเชื่อมต่อ LINE แล้ว' });
}
