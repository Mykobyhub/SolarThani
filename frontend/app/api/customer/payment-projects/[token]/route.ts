import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getProjectByToken, isMilestoneUnblocked, type PaymentMilestoneRow } from '@/lib/payment/service';
import { getLineConfig } from '@/lib/line/send';

export const dynamic = 'force-dynamic';

// GET: customer project hub — overview, milestone timeline, past receipts, pending action,
// and LINE-link status. This is what the token link resolves to by default (design spec §C).
export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const project = await getProjectByToken(token);
  if (!project) return NextResponse.json({ success: false, message: 'ไม่พบโครงการนี้ ลิงก์อาจไม่ถูกต้องหรือหมดอายุ' }, { status: 404 });

  const milestones = (await db
    .prepare('SELECT * FROM payment_milestones WHERE project_id = ? ORDER BY seq')
    .all(project.id)) as PaymentMilestoneRow[];

  // A receipt exists for any milestone that has been paid (a hold transaction exists) —
  // independent of whether the funds have since been released to the installer, since the
  // receipt is proof-of-payment, not proof-of-payout.
  const receipts: { milestoneId: number; seq: number; amount: number; paidAt: string | null; reference: string | null }[] = [];
  const paidStatuses = ['paid_hold', 'in_progress', 'awaiting_confirmation', 'released', 'disputed', 'refunded'];
  for (const m of milestones.filter((x) => paidStatuses.includes(x.status))) {
    const holdTx = (await db
      .prepare("SELECT * FROM payment_transactions WHERE milestone_id = ? AND type = 'hold' ORDER BY created_at DESC LIMIT 1")
      .get(m.id)) as { created_at: string; provider_reference_id: string | null } | undefined;
    if (!holdTx) continue;
    receipts.push({ milestoneId: m.id, seq: m.seq, amount: m.amount, paidAt: holdTx.created_at, reference: holdTx.provider_reference_id });
  }
  receipts.sort((a, b) => b.seq - a.seq);

  let pendingAction: { type: 'accept' | 'pay' | 'confirm'; milestoneId?: number } | null = null;
  if (project.status === 'proposed') {
    pendingAction = { type: 'accept' };
  } else {
    const payable = milestones.find((m) => m.status === 'pending_payment');
    if (payable && (await isMilestoneUnblocked(payable))) {
      pendingAction = { type: 'pay', milestoneId: payable.id };
    } else {
      const confirmable = milestones.find((m) => m.status === 'awaiting_confirmation');
      if (confirmable) pendingAction = { type: 'confirm', milestoneId: confirmable.id };
    }
  }

  const lineCfg = await getLineConfig();

  return NextResponse.json({
    success: true,
    project: {
      id: project.id,
      title: project.title,
      address: project.address,
      customer_name: project.customer_name,
      total_amount: project.total_amount,
      status: project.status,
      installer_name: project.installer_name,
      installer_phone: project.installer_phone,
      notify_channel: project.customer_notify_channel,
      line_linked: !!project.customer_line_user_id,
    },
    milestones,
    receipts,
    pendingAction,
    line: { enabled: lineCfg.enabled, oaBasicId: lineCfg.oaBasicId },
  });
}
