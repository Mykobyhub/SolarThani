import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';
import { recomputeProjectStatus, type PaymentMilestoneRow, type PaymentProjectRow } from '@/lib/payment/service';
import { notifyMilestoneDone } from '@/lib/payment/notify';

export const dynamic = 'force-dynamic';

// POST: installer flags a milestone as done. Only allowed from 'in_progress' —
// validated server-side, not just hidden in the UI.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string; milestoneId: string }> }) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ success: false, message: 'กรุณาเข้าสู่ระบบก่อน' }, { status: 401 });

  const { id, milestoneId } = await params;

  const project = (await db.prepare('SELECT * FROM payment_projects WHERE id = ? AND installer_id = ?').get(id, session.id)) as
    | PaymentProjectRow
    | undefined;
  if (!project) return NextResponse.json({ success: false, message: 'ไม่พบโครงการนี้' }, { status: 404 });

  const milestone = (await db
    .prepare('SELECT * FROM payment_milestones WHERE id = ? AND project_id = ?')
    .get(milestoneId, id)) as PaymentMilestoneRow | undefined;
  if (!milestone) return NextResponse.json({ success: false, message: 'ไม่พบงวดนี้' }, { status: 404 });

  if (milestone.status !== 'in_progress')
    return NextResponse.json({ success: false, message: 'แจ้งงวดเสร็จได้เฉพาะงวดที่กำลังดำเนินงานเท่านั้น' }, { status: 400 });

  await db
    .prepare("UPDATE payment_milestones SET status = 'awaiting_confirmation', completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
    .run(milestone.id);
  await recomputeProjectStatus(Number(id));

  notifyMilestoneDone(project, { ...milestone, status: 'awaiting_confirmation' }).catch(() => {}); // fire-and-forget, see api/contact/route.ts for the same convention

  return NextResponse.json({ success: true, message: 'แจ้งงวดเสร็จแล้ว รอลูกค้ายืนยัน' });
}
