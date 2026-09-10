import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getPaymentProvider } from '@/lib/payment/provider';
import {
  getProjectByToken,
  insertTransaction,
  isMilestoneUnblocked,
  recomputeProjectStatus,
  type PaymentMilestoneRow,
} from '@/lib/payment/service';
import { notifyPaymentReceived } from '@/lib/payment/notify';

export const dynamic = 'force-dynamic';

// POST: customer pays the milestone at the front of the queue, via whichever provider
// getPaymentProvider() resolves to (mock, or Omise once configured) — calls the same
// createHold() round 1's admin-only manual-pay action already exercises.
export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string; milestoneId: string }> }) {
  const { token, milestoneId } = await params;
  const project = await getProjectByToken(token);
  if (!project) return NextResponse.json({ success: false, message: 'ไม่พบโครงการนี้' }, { status: 404 });

  if (project.status === 'proposed')
    return NextResponse.json({ success: false, message: 'กรุณายอมรับแผนงวดก่อนจึงจะชำระเงินได้' }, { status: 400 });

  // Always scope the milestone lookup by project.id resolved from the token — never trust
  // milestoneId alone — so a guessed id belonging to a different project can never be paid.
  const milestone = (await db
    .prepare('SELECT * FROM payment_milestones WHERE id = ? AND project_id = ?')
    .get(milestoneId, project.id)) as PaymentMilestoneRow | undefined;
  if (!milestone) return NextResponse.json({ success: false, message: 'ไม่พบงวดนี้' }, { status: 404 });

  if (milestone.status !== 'pending_payment')
    return NextResponse.json({ success: false, message: 'งวดนี้ไม่ได้อยู่ในสถานะรอชำระเงิน' }, { status: 400 });
  if (!(await isMilestoneUnblocked(milestone)))
    return NextResponse.json({ success: false, message: 'งวดก่อนหน้ายังไม่ถูกปล่อยเงิน จึงยังชำระงวดนี้ไม่ได้' }, { status: 400 });

  const provider = await getPaymentProvider();
  const result = await provider.createHold({ amount: milestone.amount, projectId: project.id, milestoneId: milestone.id });
  if (!result.success) return NextResponse.json({ success: false, message: 'การชำระเงินไม่สำเร็จ กรุณาลองใหม่' }, { status: 502 });

  // result.reused means createHold() found and re-fetched an already-pending charge for this
  // milestone (e.g. a "retry" after the QR poll timed out) instead of creating a new one — update
  // that existing row rather than inserting a second transaction for the same underlying charge.
  if (result.reused) {
    await db.prepare("UPDATE payment_transactions SET status = ? WHERE provider_reference_id = ? AND type = 'hold'").run(result.status, result.referenceId);
  } else {
    await insertTransaction({
      milestoneId: milestone.id,
      type: 'hold',
      provider: provider.name,
      providerReferenceId: result.referenceId,
      amount: milestone.amount,
      status: result.status,
    });
  }

  // Synchronous provider (mock) — hold is in effect immediately.
  if (result.status === 'succeeded') {
    await db.prepare("UPDATE payment_milestones SET status = 'paid_hold', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(milestone.id);
    await recomputeProjectStatus(project.id);
    notifyPaymentReceived(project, { ...milestone, status: 'paid_hold' }).catch(() => {}); // fire-and-forget, see resolve/route.ts
    return NextResponse.json({ success: true, message: 'ชำระเงินสำเร็จ เงินถูกพักไว้ในระบบจนกว่างานจะเสร็จ', milestoneId: milestone.id });
  }

  // Asynchronous provider (e.g. Omise PromptPay) — the charge was created but the customer
  // still needs to complete payment out-of-band (scan the QR at nextActionUrl). The milestone
  // stays 'pending_payment' until the charge.complete webhook confirms it (see
  // app/api/webhooks/omise/route.ts), which is what actually flips it to 'paid_hold'.
  return NextResponse.json({
    success: true,
    pending: true,
    message: 'สร้างรายการชำระเงินแล้ว กรุณาชำระเงินให้เสร็จสิ้นตามช่องทางที่ระบุ',
    milestoneId: milestone.id,
    nextActionUrl: result.nextActionUrl || null,
  });
}
