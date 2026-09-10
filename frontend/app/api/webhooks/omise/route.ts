import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getOmiseConfig, activeOmiseSecretKey } from '@/lib/payment/omise-provider';
import { recomputeProjectStatus, type PaymentMilestoneRow } from '@/lib/payment/service';
import { notifyPaymentReceived, notifyCustomerDecision } from '@/lib/payment/notify';
import { createCommissionsForReleasedMilestone } from '@/lib/affiliate/commission-service';

export const dynamic = 'force-dynamic';

const OMISE_API = 'https://api.omise.co';

interface OmiseWebhookEvent {
  key?: string;
  data?: { object?: string; id?: string };
}

// Omise webhook payloads are NOT signed — anyone who finds this URL could POST a fake
// "charge succeeded" body. So the body itself is never trusted for anything beyond "which
// object should I go look up" — every event re-fetches the referenced charge/transfer
// straight from Omise's API (with our own secret key) before acting on it, same principle
// as verifying a LINE signature, just via a re-fetch instead of an HMAC since Omise doesn't
// sign webhooks at all.
//
// Handles:
//  - charge.complete: reconciles the matching 'hold' payment_transactions row, and on a
//    successful charge flips the milestone pending_payment -> paid_hold.
//  - transfer.paid / transfer.fail: reconciles the matching 'release' payment_transactions
//    row, and on a paid transfer flips the milestone to 'released' (+ affiliate commission).
//    On a failed transfer the milestone is left as-is and the failure is logged loudly —
//    there is no admin-facing alert surface for this yet (follow-up).
// Refunds are not handled here — Omise processes refunds for the payment methods this app
// uses (PromptPay) synchronously, so refundHold() already returns a final status with no
// webhook round-trip needed.
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as OmiseWebhookEvent | null;

  try {
    if (body?.key && body.data?.id) {
      const cfg = await getOmiseConfig();
      const secretKey = activeOmiseSecretKey(cfg);
      if (secretKey) {
        if (body.key === 'charge.complete') {
          await handleChargeComplete(body.data.id, secretKey);
        } else if (body.key === 'transfer.paid' || body.key === 'transfer.fail') {
          await handleTransferEvent(body.data.id, secretKey);
        }
      }
    }
  } catch (err) {
    console.error('[omise webhook] unhandled error', err);
  }

  // Always ack 200 quickly — Omise retries on non-2xx, and slow/failed processing on our
  // side should never look like "the webhook URL is broken" from Omise's perspective.
  return NextResponse.json({ success: true });
}

function authHeader(secretKey: string): string {
  return `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`;
}

async function fetchOmiseObject(path: string, secretKey: string): Promise<Record<string, unknown> | null> {
  const res = await fetch(`${OMISE_API}${path}`, { headers: { Authorization: authHeader(secretKey) } });
  if (!res.ok) {
    console.error('[omise webhook] failed to re-fetch', path, res.status);
    return null;
  }
  return res.json().catch(() => null);
}

async function handleChargeComplete(chargeId: string, secretKey: string): Promise<void> {
  const charge = await fetchOmiseObject(`/charges/${chargeId}`, secretKey);
  if (!charge) return;

  const succeeded = charge.status === 'successful';
  const failed = charge.status === 'failed' || charge.status === 'expired';
  const newStatus = succeeded ? 'succeeded' : failed ? 'failed' : 'pending';

  const tx = (await db
    .prepare("SELECT * FROM payment_transactions WHERE provider_reference_id = ? AND type = 'hold' ORDER BY created_at DESC LIMIT 1")
    .get(chargeId)) as { id: number; milestone_id: number; status: string } | undefined;
  if (!tx) {
    console.error('[omise webhook] charge.complete: no matching hold transaction for charge', chargeId);
    return;
  }

  await db.prepare('UPDATE payment_transactions SET status = ? WHERE id = ?').run(newStatus, tx.id);

  if (!succeeded) {
    if (failed) console.error('[omise webhook] charge failed/expired for milestone', tx.milestone_id, 'charge', chargeId, 'status', charge.status);
    return;
  }

  const milestone = (await db.prepare('SELECT * FROM payment_milestones WHERE id = ?').get(tx.milestone_id)) as PaymentMilestoneRow | undefined;
  if (!milestone || milestone.status !== 'pending_payment') return; // already reconciled, or moved on — nothing to do

  await db.prepare("UPDATE payment_milestones SET status = 'paid_hold', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(milestone.id);
  await recomputeProjectStatus(milestone.project_id);

  const project = (await db.prepare('SELECT * FROM payment_projects WHERE id = ?').get(milestone.project_id)) as
    | Parameters<typeof notifyPaymentReceived>[0]
    | undefined;
  if (project) notifyPaymentReceived(project, { ...milestone, status: 'paid_hold' }).catch(() => {});
}

async function handleTransferEvent(transferId: string, secretKey: string): Promise<void> {
  const transfer = await fetchOmiseObject(`/transfers/${transferId}`, secretKey);
  if (!transfer) return;

  const paid = transfer.paid === true || transfer.status === 'paid';
  const failed = transfer.failure_code != null || transfer.status === 'failed';
  const newStatus = paid ? 'succeeded' : failed ? 'failed' : 'pending';

  const tx = (await db
    .prepare("SELECT * FROM payment_transactions WHERE provider_reference_id = ? AND type = 'release' ORDER BY created_at DESC LIMIT 1")
    .get(transferId)) as { id: number; milestone_id: number; status: string } | undefined;
  if (!tx) {
    console.error('[omise webhook] transfer event: no matching release transaction for transfer', transferId);
    return;
  }

  await db.prepare('UPDATE payment_transactions SET status = ? WHERE id = ?').run(newStatus, tx.id);

  const milestone = (await db.prepare('SELECT * FROM payment_milestones WHERE id = ?').get(tx.milestone_id)) as PaymentMilestoneRow | undefined;
  if (!milestone) return;

  if (!paid) {
    // Transfer failed — deliberately NOT silently swallowed: this is real money that didn't
    // reach the installer after the milestone was already marked as being released/resolved.
    // There's no admin-facing alert surface for this yet (flagged as a follow-up) so this
    // console.error, with the ids needed to find and fix it by hand, is the only signal today.
    console.error(
      `[omise webhook] TRANSFER FAILED — installer was NOT paid. transfer=${transferId} milestone=${milestone.id} project=${milestone.project_id} amount=${milestone.amount}. Needs manual admin follow-up.`
    );
    return;
  }

  if (milestone.status === 'released') return; // already reconciled

  await db
    .prepare("UPDATE payment_milestones SET status = 'released', released_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
    .run(milestone.id);
  await recomputeProjectStatus(milestone.project_id);

  try {
    await createCommissionsForReleasedMilestone(milestone.id);
  } catch (err) {
    console.error('[omise webhook] createCommissionsForReleasedMilestone failed', milestone.id, err);
  }

  const project = (await db.prepare('SELECT * FROM payment_projects WHERE id = ?').get(milestone.project_id)) as
    | Parameters<typeof notifyCustomerDecision>[0]
    | undefined;
  if (project) notifyCustomerDecision(project, { ...milestone, status: 'released' }, 'released').catch(() => {});
}
