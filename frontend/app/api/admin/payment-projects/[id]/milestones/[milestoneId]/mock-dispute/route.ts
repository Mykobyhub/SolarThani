import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';
import { recomputeProjectStatus, type PaymentMilestoneRow } from '@/lib/payment/service';
import { stripTags } from '@/lib/sanitize';

export const dynamic = 'force-dynamic';

// POST: opens a test dispute on a milestone awaiting customer confirmation.
//
// Round 2 adds the real customer confirm/dispute page — this admin-only action exists
// purely so the admin dispute queue (and force-release/force-refund) can be tested this
// round without that page existing yet. Not a real product feature; safe to remove once
// round 2 ships the real dispute-raising flow.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string; milestoneId: string }> }) {
  const session = await getSessionFromRequest(req);
  if (!session || session.role !== 'admin')
    return NextResponse.json({ success: false, message: 'ต้องการสิทธิ์ Admin' }, { status: 403 });

  const { id, milestoneId } = await params;

  const milestone = (await db
    .prepare('SELECT * FROM payment_milestones WHERE id = ? AND project_id = ?')
    .get(milestoneId, id)) as PaymentMilestoneRow | undefined;
  if (!milestone) return NextResponse.json({ success: false, message: 'ไม่พบงวดนี้' }, { status: 404 });

  if (milestone.status !== 'awaiting_confirmation')
    return NextResponse.json({ success: false, message: 'เปิดข้อโต้แย้งได้เฉพาะงวดที่รอลูกค้ายืนยันเท่านั้น' }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const reason = stripTags(body.reason || 'ทดสอบข้อโต้แย้งโดย Admin (จำลอง)').substring(0, 500);

  await db
    .prepare('INSERT INTO payment_disputes (milestone_id, raised_by, reason, status) VALUES (?, ?, ?, ?)')
    .run(milestone.id, 'customer', reason, 'open');
  await db.prepare("UPDATE payment_milestones SET status = 'disputed', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(milestone.id);
  await recomputeProjectStatus(Number(id));

  return NextResponse.json({ success: true, message: 'เปิดข้อโต้แย้งทดสอบแล้ว' });
}
