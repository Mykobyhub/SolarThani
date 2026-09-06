import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';
import { isMilestoneUnblocked, recomputeProjectStatus, type PaymentMilestoneRow } from '@/lib/payment/service';

export const dynamic = 'force-dynamic';

// POST: installer starts work on a milestone once it's been paid (escrowed) and unblocked
// (first milestone, or its predecessor has been released/refunded). Validated server-side —
// this is not just a UI affordance.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string; milestoneId: string }> }) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ success: false, message: 'กรุณาเข้าสู่ระบบก่อน' }, { status: 401 });

  const { id, milestoneId } = await params;

  const project = (await db.prepare('SELECT * FROM payment_projects WHERE id = ? AND installer_id = ?').get(id, session.id)) as
    | { id: number }
    | undefined;
  if (!project) return NextResponse.json({ success: false, message: 'ไม่พบโครงการนี้' }, { status: 404 });

  const milestone = (await db
    .prepare('SELECT * FROM payment_milestones WHERE id = ? AND project_id = ?')
    .get(milestoneId, id)) as PaymentMilestoneRow | undefined;
  if (!milestone) return NextResponse.json({ success: false, message: 'ไม่พบงวดนี้' }, { status: 404 });

  if (milestone.status !== 'paid_hold')
    return NextResponse.json({ success: false, message: 'งวดนี้ยังไม่พร้อมเริ่มงาน (ต้องชำระเงินก่อน)' }, { status: 400 });
  if (!(await isMilestoneUnblocked(milestone)))
    return NextResponse.json({ success: false, message: 'งวดก่อนหน้ายังไม่ถูกปล่อยเงิน จึงยังเริ่มงวดนี้ไม่ได้' }, { status: 400 });

  await db.prepare("UPDATE payment_milestones SET status = 'in_progress', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(milestone.id);
  await recomputeProjectStatus(Number(id));

  return NextResponse.json({ success: true, message: 'เริ่มงานงวดนี้แล้ว' });
}
