import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';
import { getPaymentProvider } from '@/lib/payment/provider';
import { insertTransaction, recomputeProjectStatus, type PaymentDisputeRow, type PaymentMilestoneRow, type PaymentProjectRow } from '@/lib/payment/service';
import { notifyDisputeResolved } from '@/lib/payment/notify';
import { stripTags } from '@/lib/sanitize';
import { createCommissionsForReleasedMilestone, clawbackCommissionsForMilestone } from '@/lib/affiliate/commission-service';

export const dynamic = 'force-dynamic';

// POST: admin force-resolves a dispute — either releases the held funds to the installer
// or refunds them to the customer. This moves real money (via the payment provider), so
// the client is expected to have already confirmed with the admin before calling this.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromRequest(req);
  if (!session || session.role !== 'admin')
    return NextResponse.json({ success: false, message: 'ต้องการสิทธิ์ Admin' }, { status: 403 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const action = body.action; // 'release' | 'refund'
  const resolution = stripTags(body.resolution || '').substring(0, 1000);

  if (!['release', 'refund'].includes(action))
    return NextResponse.json({ success: false, message: 'กรุณาระบุ action เป็น release หรือ refund' }, { status: 400 });

  const dispute = (await db.prepare('SELECT * FROM payment_disputes WHERE id = ?').get(id)) as PaymentDisputeRow | undefined;
  if (!dispute) return NextResponse.json({ success: false, message: 'ไม่พบข้อโต้แย้งนี้' }, { status: 404 });
  if (dispute.status !== 'open')
    return NextResponse.json({ success: false, message: 'ข้อโต้แย้งนี้ถูกตัดสินไปแล้ว' }, { status: 400 });

  const milestone = (await db.prepare('SELECT * FROM payment_milestones WHERE id = ?').get(dispute.milestone_id)) as
    | PaymentMilestoneRow
    | undefined;
  if (!milestone) return NextResponse.json({ success: false, message: 'ไม่พบงวดของข้อโต้แย้งนี้' }, { status: 404 });

  // Find the original hold transaction to reference for reconciliation.
  const hold = (await db
    .prepare("SELECT * FROM payment_transactions WHERE milestone_id = ? AND type = 'hold' ORDER BY created_at DESC LIMIT 1")
    .get(milestone.id)) as { provider_reference_id: string | null } | undefined;

  const provider = await getPaymentProvider();

  // Set for the release branch only, to (a) skip marking the milestone 'released' /
  // creating the affiliate commission until the payout is actually confirmed, and (b) tailor
  // the final response message — the mock always resolves 'succeeded' synchronously, so
  // behavior for the mock is unchanged from before this field existed.
  let releaseStatus: 'succeeded' | 'pending' | 'failed' | null = null;

  if (action === 'release') {
    const result = await provider.releaseHold({
      holdReferenceId: hold?.provider_reference_id || '',
      amount: milestone.amount,
      milestoneId: milestone.id,
    });
    if (!result.success) return NextResponse.json({ success: false, message: 'ปล่อยเงินไม่สำเร็จ' }, { status: 502 });
    await insertTransaction({ milestoneId: milestone.id, type: 'release', provider: provider.name, providerReferenceId: result.referenceId, amount: milestone.amount, status: result.status });
    releaseStatus = result.status;

    // The admin's decision is recorded immediately either way; the milestone's own status
    // (released / affiliate commission) only advances once the payout is actually confirmed —
    // synchronously here for the mock, or later via the transfer.paid webhook for Omise.
    await db
      .prepare("UPDATE payment_disputes SET status = 'resolved_release', admin_resolution = ?, resolved_by_admin_id = ?, resolved_at = CURRENT_TIMESTAMP WHERE id = ?")
      .run(resolution, session.id, id);

    if (result.status === 'succeeded') {
      await db
        .prepare("UPDATE payment_milestones SET status = 'released', released_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        .run(milestone.id);

      // Affiliate commission creation — money-adjacent ledger write, always awaited
      // inline (never fire-and-forget like the notify call below).
      try {
        await createCommissionsForReleasedMilestone(milestone.id);
      } catch (err) {
        console.error('createCommissionsForReleasedMilestone failed', milestone.id, err);
      }
    }
  } else {
    const result = await provider.refundHold({
      holdReferenceId: hold?.provider_reference_id || '',
      amount: milestone.amount,
      milestoneId: milestone.id,
    });
    if (!result.success) return NextResponse.json({ success: false, message: 'คืนเงินไม่สำเร็จ' }, { status: 502 });
    await insertTransaction({ milestoneId: milestone.id, type: 'refund', provider: provider.name, providerReferenceId: result.referenceId, amount: milestone.amount });
    await db.prepare("UPDATE payment_milestones SET status = 'refunded', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(milestone.id);
    await db
      .prepare("UPDATE payment_disputes SET status = 'resolved_refund', admin_resolution = ?, resolved_by_admin_id = ?, resolved_at = CURRENT_TIMESTAMP WHERE id = ?")
      .run(resolution, session.id, id);

    // Clawback: if this milestone had already generated an affiliate commission
    // (edge case — a milestone is usually refunded before it's ever released, but
    // dispute-on-an-already-released-milestone is architecturally possible), flip
    // it to clawed_back. Always awaited inline, same reasoning as the release branch.
    try {
      await clawbackCommissionsForMilestone(milestone.id, `Milestone ถูกคืนเงินจากข้อโต้แย้ง #${id}: ${resolution || 'ไม่มีหมายเหตุ'}`);
    } catch (err) {
      console.error('clawbackCommissionsForMilestone failed', milestone.id, err);
    }
  }

  await recomputeProjectStatus(milestone.project_id);

  const project = (await db.prepare('SELECT * FROM payment_projects WHERE id = ?').get(milestone.project_id)) as PaymentProjectRow | undefined;
  // Fire-and-forget — same pattern as the rest of the app's email sends (e.g. api/contact):
  // notifications must never block this response on slow/unreachable SMTP or LINE.
  if (project) notifyDisputeResolved(project, milestone, action).catch(() => {});

  const releaseMessage = releaseStatus === 'succeeded' ? 'ปล่อยเงินให้ผู้ติดตั้งแล้ว' : 'บันทึกการตัดสินแล้ว กำลังโอนเงินให้ผู้ติดตั้ง ระบบจะอัปเดตสถานะเมื่อโอนสำเร็จ';
  return NextResponse.json({ success: true, message: action === 'release' ? releaseMessage : 'คืนเงินให้ลูกค้าแล้ว' });
}
