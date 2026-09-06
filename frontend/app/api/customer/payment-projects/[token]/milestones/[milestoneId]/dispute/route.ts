import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getProjectByToken, recomputeProjectStatus, type PaymentMilestoneRow } from '@/lib/payment/service';
import { notifyCustomerDecision } from '@/lib/payment/notify';
import { stripTags } from '@/lib/sanitize';

export const dynamic = 'force-dynamic';

// POST: customer disputes the installer's completion claim — opens a case in the admin queue
// (reusing the same payment_disputes mechanism / resolve endpoint round 1 already built).
export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string; milestoneId: string }> }) {
  const { token, milestoneId } = await params;
  const project = await getProjectByToken(token);
  if (!project) return NextResponse.json({ success: false, message: 'ไม่พบโครงการนี้' }, { status: 404 });

  const milestone = (await db
    .prepare('SELECT * FROM payment_milestones WHERE id = ? AND project_id = ?')
    .get(milestoneId, project.id)) as PaymentMilestoneRow | undefined;
  if (!milestone) return NextResponse.json({ success: false, message: 'ไม่พบงวดนี้' }, { status: 404 });

  if (milestone.status !== 'awaiting_confirmation')
    return NextResponse.json({ success: false, message: 'โต้แย้งได้เฉพาะงวดที่รอการยืนยันจากคุณเท่านั้น' }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const reason = stripTags(body.reason || '').substring(0, 1000);
  if (!reason) return NextResponse.json({ success: false, message: 'กรุณาระบุเหตุผลที่โต้แย้ง' }, { status: 400 });

  await db.prepare("INSERT INTO payment_disputes (milestone_id, raised_by, reason, status) VALUES (?, 'customer', ?, 'open')").run(milestone.id, reason);
  await db.prepare("UPDATE payment_milestones SET status = 'disputed', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(milestone.id);
  await recomputeProjectStatus(project.id);

  notifyCustomerDecision(project, { ...milestone, status: 'disputed' }, 'disputed').catch(() => {}); // fire-and-forget, see resolve/route.ts

  return NextResponse.json({ success: true, message: 'ส่งข้อโต้แย้งแล้ว ทีมงานจะพิจารณาและแจ้งผลกลับโดยเร็วที่สุด' });
}
