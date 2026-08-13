import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';
import { sendEmail, buildInstallerNewLeadEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromRequest(req);
  if (!session || session.role !== 'admin')
    return NextResponse.json({ success: false, message: 'ต้องการสิทธิ์ Admin' }, { status: 403 });

  const { id } = await params;
  const lead = await db.prepare('SELECT id FROM leads WHERE id = ?').get(id);
  if (!lead) return NextResponse.json({ success: false, message: 'ไม่พบ lead' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const { installer_id } = body;

  if (installer_id) {
    const inst = await db.prepare(`SELECT id FROM installers WHERE id = ? AND status = 'active'`).get(installer_id);
    if (!inst) return NextResponse.json({ success: false, message: 'ไม่พบผู้ติดตั้งที่ active' }, { status: 400 });
  }

  await db.prepare('UPDATE leads SET installer_id = ? WHERE id = ?').run(installer_id || null, id);

  if (installer_id) {
    const inst     = (await db.prepare('SELECT id, name, email FROM installers WHERE id = ?').get(installer_id)) as { id: number; name: string; email: string };
    const leadData = (await db.prepare('SELECT * FROM leads WHERE id = ?').get(id)) as { name: string; email: string; phone: string; province: string; message?: string };
    if (inst && leadData) {
      const html = await buildInstallerNewLeadEmail(inst.name, leadData);
      sendEmail({
        to: inst.email,
        subject: `[Solar Thani] มี Lead ใหม่จากจังหวัด${leadData.province}!`,
        html,
      }).catch(() => {});
    }
  }

  return NextResponse.json({ success: true, message: 'Assign สำเร็จ' });
}
