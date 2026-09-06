import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const VALID_CHANNELS = ['email', 'line', 'both'];

// PUT: installer sets their notification channel preference for one project.
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ success: false, message: 'กรุณาเข้าสู่ระบบก่อน' }, { status: 401 });

  const { id } = await params;
  const project = (await db.prepare('SELECT id FROM payment_projects WHERE id = ? AND installer_id = ?').get(id, session.id)) as
    | { id: number }
    | undefined;
  if (!project) return NextResponse.json({ success: false, message: 'ไม่พบโครงการนี้' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const channel = body.channel;
  if (!VALID_CHANNELS.includes(channel)) return NextResponse.json({ success: false, message: 'ช่องทางไม่ถูกต้อง' }, { status: 400 });

  if (channel !== 'email') {
    const installer = (await db.prepare('SELECT line_user_id FROM installers WHERE id = ?').get(session.id)) as { line_user_id: string | null } | undefined;
    if (!installer?.line_user_id) return NextResponse.json({ success: false, message: 'กรุณาเชื่อมต่อ LINE ก่อนจึงจะเลือกช่องทางนี้ได้' }, { status: 400 });
  }

  await db.prepare('UPDATE payment_projects SET installer_notify_channel = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(channel, project.id);

  return NextResponse.json({ success: true, message: 'บันทึกช่องทางการแจ้งเตือนแล้ว' });
}
