import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getProjectByToken } from '@/lib/payment/service';

export const dynamic = 'force-dynamic';

const VALID_CHANNELS = ['email', 'line', 'both'];

// PUT: customer sets their notification channel preference for this project.
export async function PUT(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const project = await getProjectByToken(token);
  if (!project) return NextResponse.json({ success: false, message: 'ไม่พบโครงการนี้' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const channel = body.channel;
  if (!VALID_CHANNELS.includes(channel)) return NextResponse.json({ success: false, message: 'ช่องทางไม่ถูกต้อง' }, { status: 400 });
  if (channel !== 'email' && !project.customer_line_user_id)
    return NextResponse.json({ success: false, message: 'กรุณาเชื่อมต่อ LINE ก่อนจึงจะเลือกช่องทางนี้ได้' }, { status: 400 });

  await db.prepare('UPDATE payment_projects SET customer_notify_channel = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(channel, project.id);

  return NextResponse.json({ success: true, message: 'บันทึกช่องทางการแจ้งเตือนแล้ว' });
}
