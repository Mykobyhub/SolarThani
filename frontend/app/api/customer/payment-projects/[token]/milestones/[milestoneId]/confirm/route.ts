import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getPaymentProvider } from '@/lib/payment/provider';
import { getProjectByToken, insertTransaction, recomputeProjectStatus, type PaymentMilestoneRow } from '@/lib/payment/service';
import { notifyCustomerDecision } from '@/lib/payment/notify';
import { createCommissionsForReleasedMilestone } from '@/lib/affiliate/commission-service';

export const dynamic = 'force-dynamic';

// POST: customer confirms the installer's completion claim and releases the held funds directly
// — this is the direct-release path (no admin/dispute involved), separate from the admin-only
// force-resolve endpoint used for actual disputes.
export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string; milestoneId: string }> }) {
  const { token, milestoneId } = await params;
  const project = await getProjectByToken(token);
  if (!project) return NextResponse.json({ success: false, message: 'ไม่พบโครงการนี้' }, { status: 404 });

  const milestone = (await db
    .prepare('SELECT * FROM payment_milestones WHERE id = ? AND project_id = ?')
    .get(milestoneId, project.id)) as PaymentMilestoneRow | undefined;
  if (!milestone) return NextResponse.json({ success: false, message: 'ไม่พบงวดนี้' }, { status: 404 });

  if (milestone.status !== 'awaiting_confirmation')
    return NextResponse.json({ success: false, message: 'ยืนยันได้เฉพาะงวดที่รอการยืนยันจากคุณเท่านั้น' }, { status: 400 });

  const hold = (await db
    .prepare("SELECT provider_reference_id FROM payment_transactions WHERE milestone_id = ? AND type = 'hold' ORDER BY created_at DESC LIMIT 1")
    .get(milestone.id)) as { provider_reference_id: string | null } | undefined;

  const provider = await getPaymentProvider();
  const result = await provider.releaseHold({ holdReferenceId: hold?.provider_reference_id || '', amount: milestone.amount, milestoneId: milestone.id });
  if (!result.success) return NextResponse.json({ success: false, message: 'ปล่อยเงินไม่สำเร็จ กรุณาลองใหม่' }, { status: 502 });

  await insertTransaction({ milestoneId: milestone.id, type: 'release', provider: provider.name, providerReferenceId: result.referenceId, amount: milestone.amount, status: result.status });

  if (result.status !== 'succeeded') {
    // Asynchronous provider (e.g. Omise Transfer) — the payout was initiated but not yet
    // confirmed paid. Milestone stays as-is; the transfer.paid/transfer.fail webhook (see
    // app/api/webhooks/omise/route.ts) is what actually flips it to 'released' (and creates
    // the affiliate commission), or leaves it unreleased with a logged failure.
    return NextResponse.json({ success: true, pending: true, message: 'ยืนยันงานเสร็จแล้ว กำลังโอนเงินให้ผู้ติดตั้ง ระบบจะอัปเดตสถานะเมื่อโอนสำเร็จ', milestoneId: milestone.id });
  }

  await db
    .prepare("UPDATE payment_milestones SET status = 'released', released_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
    .run(milestone.id);
  await recomputeProjectStatus(project.id);

  // Affiliate commission creation — money-adjacent ledger write, always awaited
  // inline (never fire-and-forget like the notify call below). Non-fatal to this
  // response on failure since the release itself already succeeded.
  try {
    await createCommissionsForReleasedMilestone(milestone.id);
  } catch (err) {
    console.error('createCommissionsForReleasedMilestone failed', milestone.id, err);
  }

  notifyCustomerDecision(project, { ...milestone, status: 'released' }, 'released').catch(() => {}); // fire-and-forget, see resolve/route.ts

  return NextResponse.json({ success: true, message: 'ยืนยันงานเสร็จแล้ว ปล่อยเงินให้ผู้ติดตั้งเรียบร้อย', milestoneId: milestone.id });
}
