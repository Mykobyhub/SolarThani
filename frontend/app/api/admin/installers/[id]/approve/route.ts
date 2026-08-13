import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';
import { sendEmail, buildApprovalEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromRequest(req);
  if (!session || session.role !== 'admin')
    return NextResponse.json({ success: false, message: 'ต้องการสิทธิ์ Admin' }, { status: 403 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { action } = body;

  const statusMap: Record<string, string> = { approve: 'active', reject: 'rejected', suspend: 'suspended', reactivate: 'active' };
  const newStatus = statusMap[action];
  if (!newStatus) return NextResponse.json({ success: false, message: 'action ต้องเป็น approve | reject | suspend | reactivate' }, { status: 400 });

  const installer = (await db.prepare('SELECT * FROM installers WHERE id = ?').get(id)) as { id: number; name: string; email: string } | undefined;
  if (!installer) return NextResponse.json({ success: false, message: 'ไม่พบผู้ติดตั้ง' }, { status: 404 });

  await db.prepare('UPDATE installers SET status=? WHERE id=?').run(newStatus, id);

  if (action === 'approve') {
    const html = await buildApprovalEmail(installer.name);
    sendEmail({
      to: installer.email,
      subject: '[Solar Thani] บัญชีของคุณได้รับการอนุมัติแล้ว!',
      html,
    }).catch(() => {});
  }

  return NextResponse.json({ success: true, message: `${action} สำเร็จ` });
}
