import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';
import { getPaymentProvider } from '@/lib/payment/provider';
import { insertTransaction, isMilestoneUnblocked, recomputeProjectStatus, type PaymentMilestoneRow } from '@/lib/payment/service';

export const dynamic = 'force-dynamic';

// POST: records that the customer has paid this milestone.
//
// Round 1 has no customer-facing payment page yet (that's round 2, along with the real
// gateway integration) — until then, this admin-only action is how an offline/manual
// payment confirmation (or QA testing of the full workflow) moves a milestone forward.
// It calls the same mock payment provider round 2's real customer flow will call.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string; milestoneId: string }> }) {
  const session = await getSessionFromRequest(req);
  if (!session || session.role !== 'admin')
    return NextResponse.json({ success: false, message: 'ต้องการสิทธิ์ Admin' }, { status: 403 });

  const { id, milestoneId } = await params;

  const milestone = (await db
    .prepare('SELECT * FROM payment_milestones WHERE id = ? AND project_id = ?')
    .get(milestoneId, id)) as PaymentMilestoneRow | undefined;
  if (!milestone) return NextResponse.json({ success: false, message: 'ไม่พบงวดนี้' }, { status: 404 });

  if (milestone.status !== 'pending_payment')
    return NextResponse.json({ success: false, message: 'งวดนี้ไม่ได้อยู่ในสถานะรอชำระเงิน' }, { status: 400 });
  if (!(await isMilestoneUnblocked(milestone)))
    return NextResponse.json({ success: false, message: 'งวดก่อนหน้ายังไม่ถูกปล่อยเงิน จึงยังชำระงวดนี้ไม่ได้' }, { status: 400 });

  const provider = getPaymentProvider();
  const result = await provider.createHold({ amount: milestone.amount, projectId: Number(id), milestoneId: milestone.id });
  if (!result.success) return NextResponse.json({ success: false, message: 'การชำระเงินไม่สำเร็จ' }, { status: 502 });

  await insertTransaction({
    milestoneId: milestone.id,
    type: 'hold',
    provider: provider.name,
    providerReferenceId: result.referenceId,
    amount: milestone.amount,
  });
  await db.prepare("UPDATE payment_milestones SET status = 'paid_hold', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(milestone.id);
  await recomputeProjectStatus(Number(id));

  return NextResponse.json({ success: true, message: `บันทึกการชำระเงินสำเร็จ (ref: ${result.referenceId})` });
}
