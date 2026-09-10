import crypto from 'crypto';
import { db } from '@/lib/db';
import { getPaymentProvider } from './provider';

export interface PaymentMilestoneRow {
  id: number;
  project_id: number;
  seq: number;
  description: string;
  amount: number;
  status: string;
  due_date: string | null;
  completed_at: string | null;
  released_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentProjectRow {
  id: number;
  lead_id: number | null;
  installer_id: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  title: string;
  address: string | null;
  total_amount: number;
  status: string;
  customer_token: string;
  customer_line_user_id: string | null;
  installer_line_user_id: string | null;
  customer_notify_channel: string;
  installer_notify_channel: string;
  cancel_requested: number;
  created_at: string;
  updated_at: string;
}

export interface PaymentTransactionRow {
  id: number;
  milestone_id: number;
  type: 'hold' | 'release' | 'refund';
  provider: string;
  provider_reference_id: string | null;
  amount: number;
  status: string;
  created_at: string;
}

export interface PaymentDisputeRow {
  id: number;
  milestone_id: number;
  raised_by: 'customer' | 'installer';
  reason: string;
  status: string;
  admin_resolution: string | null;
  resolved_by_admin_id: number | null;
  resolved_at: string | null;
  created_at: string;
}

/** Unguessable token identifying+authorizing the customer for their project (round 2's token-link pages key off this). */
export function generateCustomerToken(): string {
  return crypto.randomBytes(24).toString('base64url');
}

export type PaymentProjectWithInstaller = PaymentProjectRow & { installer_name: string; installer_phone: string | null };

/**
 * Resolves a project by its `customer_token` only — every customer-facing endpoint must go
 * through this (never a bare numeric project id from the URL) so possession of the unguessable
 * token is what authorizes the request, matching the rest of the app's "secret link" pattern.
 */
export async function getProjectByToken(token: string): Promise<PaymentProjectWithInstaller | undefined> {
  if (!token) return undefined;
  return (await db
    .prepare(
      `SELECT p.*, i.name AS installer_name, i.phone AS installer_phone
       FROM payment_projects p JOIN installers i ON i.id = p.installer_id
       WHERE p.customer_token = ?`
    )
    .get(token)) as PaymentProjectWithInstaller | undefined;
}

const MILESTONE_TERMINAL_OK_STATUSES = ['released', 'refunded'];

// Milestone statuses that count as "the project is done with this milestone, no further
// action possible" for the purposes of the completed/cancelled roll-up below. 'cancelled'
// (round 2) is a voided-before-payment milestone — same bucket as released/refunded.
const MILESTONE_TERMINAL_ANY_STATUSES = [...MILESTONE_TERMINAL_OK_STATUSES, 'cancelled'];

/** Rolls a project's status up from its milestones' statuses. Call after any milestone status change. */
export async function recomputeProjectStatus(projectId: number): Promise<string> {
  const milestones = (await db
    .prepare('SELECT status FROM payment_milestones WHERE project_id = ?')
    .all(projectId)) as { status: string }[];
  const project = (await db.prepare('SELECT cancel_requested FROM payment_projects WHERE id = ?').get(projectId)) as
    | { cancel_requested: number }
    | undefined;
  const cancelRequested = !!project?.cancel_requested;

  let status: string;
  if (milestones.some((m) => m.status === 'disputed')) {
    status = 'disputed';
  } else if (milestones.length > 0 && milestones.every((m) => MILESTONE_TERMINAL_ANY_STATUSES.includes(m.status))) {
    // Every milestone reached a terminal state — this is either a genuinely completed project,
    // or the tail end of a cancellation that routed through disputes (round 2). cancel_requested
    // disambiguates the two so a cancelled project never gets mislabeled "completed".
    status = cancelRequested ? 'cancelled' : 'completed';
  } else if (milestones.some((m) => m.status !== 'pending_payment')) {
    // At least one milestone has moved past pending_payment — covers both "currently mid-flight"
    // (paid_hold/in_progress/awaiting_confirmation) AND "already resolved while a later milestone
    // is still pending_payment" (e.g. milestone 1 released, milestone 2 not yet paid) — the
    // project is genuinely underway either way, never "not yet accepted" (round 2 fix; the
    // original check only covered the mid-flight case and mislabeled the second case 'proposed').
    status = 'active';
  } else {
    status = 'proposed';
  }

  await db.prepare('UPDATE payment_projects SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, projectId);
  return status;
}

/** True if `milestone` is allowed to move forward (pay / start work) right now: first in sequence, or its immediate predecessor has been released/refunded. */
export async function isMilestoneUnblocked(milestone: PaymentMilestoneRow): Promise<boolean> {
  if (milestone.seq <= 1) return true;
  const prev = (await db
    .prepare('SELECT status FROM payment_milestones WHERE project_id = ? AND seq = ?')
    .get(milestone.project_id, milestone.seq - 1)) as { status: string } | undefined;
  return !!prev && MILESTONE_TERMINAL_OK_STATUSES.includes(prev.status);
}

export async function insertTransaction(opts: {
  milestoneId: number;
  type: 'hold' | 'release' | 'refund';
  provider: string;
  providerReferenceId: string;
  amount: number;
  status?: 'succeeded' | 'pending' | 'failed';
}): Promise<void> {
  await db
    .prepare(
      'INSERT INTO payment_transactions (milestone_id, type, provider, provider_reference_id, amount, status) VALUES (?, ?, ?, ?, ?, ?)'
    )
    .run(opts.milestoneId, opts.type, opts.provider, opts.providerReferenceId, opts.amount, opts.status || 'succeeded');
}

export async function isMilestonePaymentEnabled(): Promise<boolean> {
  const row = (await db.prepare("SELECT value FROM site_content WHERE key = 'milestone_payment_enabled'").get()) as
    | { value: string }
    | undefined;
  return row?.value === '1';
}

export interface CancelProjectResult {
  cancelledMilestoneIds: number[];
  refundedMilestoneIds: number[];
  disputedMilestoneIds: number[];
  projectStatus: string;
}

/**
 * Cancellation rule (per design spec): a milestone still `pending_payment` is simply voided
 * (no money moved); a milestone already `paid_hold` (paid, work not started) is auto-refunded;
 * a milestone `in_progress`/`awaiting_confirmation` (work potentially underway) is NOT
 * auto-refunded — it's routed into the existing admin dispute queue instead, since only a human
 * can judge partial completion. `released`/`refunded` milestones are untouched (already final).
 *
 * Shared by both the customer-facing cancel endpoint and the admin-facing one — same mechanism,
 * no second parallel state machine. `payment_disputes.raised_by` only allows 'customer'/'installer'
 * (round 1 schema) so an admin-initiated cancellation is recorded as raised_by='installer'; the
 * human-readable requester is still spelled out in the dispute reason text.
 */
export async function cancelProject(projectId: number, requestedBy: 'customer' | 'installer' | 'admin'): Promise<CancelProjectResult> {
  const milestones = (await db.prepare('SELECT * FROM payment_milestones WHERE project_id = ? ORDER BY seq').all(projectId)) as PaymentMilestoneRow[];
  const provider = await getPaymentProvider();

  const cancelledMilestoneIds: number[] = [];
  const refundedMilestoneIds: number[] = [];
  const disputedMilestoneIds: number[] = [];

  const requestedByLabel = requestedBy === 'customer' ? 'ลูกค้า' : requestedBy === 'installer' ? 'ผู้ติดตั้ง' : 'ผู้ดูแลระบบ';

  for (const m of milestones) {
    if (m.status === 'pending_payment') {
      await db.prepare("UPDATE payment_milestones SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(m.id);
      cancelledMilestoneIds.push(m.id);
    } else if (m.status === 'paid_hold') {
      const hold = (await db
        .prepare("SELECT provider_reference_id FROM payment_transactions WHERE milestone_id = ? AND type = 'hold' ORDER BY created_at DESC LIMIT 1")
        .get(m.id)) as { provider_reference_id: string | null } | undefined;
      const result = await provider.refundHold({ holdReferenceId: hold?.provider_reference_id || '', amount: m.amount, milestoneId: m.id });
      if (result.success) {
        await insertTransaction({ milestoneId: m.id, type: 'refund', provider: provider.name, providerReferenceId: result.referenceId, amount: m.amount });
        await db.prepare("UPDATE payment_milestones SET status = 'refunded', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(m.id);
        refundedMilestoneIds.push(m.id);
      }
    } else if (m.status === 'in_progress' || m.status === 'awaiting_confirmation') {
      await db
        .prepare("INSERT INTO payment_disputes (milestone_id, raised_by, reason, status) VALUES (?, ?, ?, 'open')")
        .run(
          m.id,
          requestedBy === 'customer' ? 'customer' : 'installer',
          `ขอยกเลิกโครงการระหว่างดำเนินงาน (คำขอโดย${requestedByLabel}) — งวดนี้อยู่ระหว่างดำเนินงาน ต้องให้ Admin ตัดสินก่อนจึงจะปิดโครงการได้`
        );
      await db.prepare("UPDATE payment_milestones SET status = 'disputed', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(m.id);
      disputedMilestoneIds.push(m.id);
    }
    // released / refunded / disputed / cancelled milestones: already final, untouched.
  }

  await db.prepare('UPDATE payment_projects SET cancel_requested = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(projectId);

  let projectStatus: string;
  if (disputedMilestoneIds.length > 0) {
    // At least one milestone is now disputed — project stays/becomes 'disputed' until admin resolves it.
    projectStatus = await recomputeProjectStatus(projectId);
  } else {
    await db.prepare("UPDATE payment_projects SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(projectId);
    projectStatus = 'cancelled';
  }

  return { cancelledMilestoneIds, refundedMilestoneIds, disputedMilestoneIds, projectStatus };
}
