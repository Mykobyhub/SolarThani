import { db } from '@/lib/db';

interface MilestoneForCommission {
  id: number;
  project_id: number;
  amount: number;
}

interface ProjectForCommission {
  id: number;
  lead_id: number | null;
  installer_id: number;
  total_amount: number;
}

interface LeadAffiliateSnapshot {
  affiliate_id: number | null;
  affiliate_commission_type: 'percent' | 'flat' | null;
  affiliate_commission_value: number | null;
}

/**
 * Creates the affiliate_commissions row(s) for a milestone that was just released.
 * Call this from every code path that sets `payment_milestones.released_at` — right
 * now that's the customer direct-confirm route and the admin dispute-resolve
 * ('release' branch) route. Always await this inline (wrap in try/catch if you want
 * a failure to be non-fatal to the HTTP response) — never detach it into an
 * unawaited fire-and-forget promise like the email/LINE notify calls, since this
 * writes money-adjacent ledger data.
 *
 * Lifecycle per the confirmed spec (SolarPanel-Requirements.md, "Confirmed spec —
 * Affiliate / Referral Program"):
 *   - No lead on the project, or the lead was never tagged with an affiliate → no-op.
 *   - percent → creates ONE row EVERY time this runs for the project, based on
 *     *this* milestone's amount (not the project total) — commission trickles in
 *     with the same escrow cadence as the installer's payout.
 *   - flat → creates a row ONLY on the first successful milestone release of the
 *     project. Enforced here via an existence check (not a DB constraint) per spec.
 */
export async function createCommissionsForReleasedMilestone(milestoneId: number): Promise<void> {
  const milestone = (await db
    .prepare('SELECT id, project_id, amount FROM payment_milestones WHERE id = ?')
    .get(milestoneId)) as MilestoneForCommission | undefined;
  if (!milestone) return;

  const project = (await db
    .prepare('SELECT id, lead_id, installer_id, total_amount FROM payment_projects WHERE id = ?')
    .get(milestone.project_id)) as ProjectForCommission | undefined;
  if (!project || project.lead_id == null) return; // no lead → no affiliate, nothing to do

  const lead = (await db
    .prepare('SELECT affiliate_id, affiliate_commission_type, affiliate_commission_value FROM leads WHERE id = ?')
    .get(project.lead_id)) as LeadAffiliateSnapshot | undefined;
  if (!lead || lead.affiliate_id == null) return;

  const commissionType = lead.affiliate_commission_type;
  const commissionValue = lead.affiliate_commission_value ?? 0;
  if (commissionType !== 'percent' && commissionType !== 'flat') return; // defensive; snapshot should always be one of the two

  if (commissionType === 'percent') {
    const baseAmount = milestone.amount;
    const commissionAmount = (baseAmount * commissionValue) / 100;
    await insertCommissionRow({
      affiliateId: lead.affiliate_id,
      leadId: project.lead_id,
      projectId: project.id,
      milestoneId: milestone.id,
      installerId: project.installer_id,
      commissionType,
      baseAmount,
      commissionAmount,
    });
    return;
  }

  // flat: only on the first successful release of this project — app-logic
  // guard, not a DB constraint (per spec).
  const existing = await db
    .prepare('SELECT id FROM affiliate_commissions WHERE project_id = ? LIMIT 1')
    .get(project.id);
  if (existing) return;

  await insertCommissionRow({
    affiliateId: lead.affiliate_id,
    leadId: project.lead_id,
    projectId: project.id,
    milestoneId: milestone.id,
    installerId: project.installer_id,
    commissionType,
    baseAmount: project.total_amount,
    commissionAmount: commissionValue,
  });
}

async function insertCommissionRow(opts: {
  affiliateId: number;
  leadId: number;
  projectId: number;
  milestoneId: number;
  installerId: number;
  commissionType: 'percent' | 'flat';
  baseAmount: number;
  commissionAmount: number;
}): Promise<void> {
  await db
    .prepare(
      `INSERT INTO affiliate_commissions
         (affiliate_id, lead_id, project_id, milestone_id, installer_id, commission_type, base_amount, commission_amount, status, computed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'eligible', CURRENT_TIMESTAMP)`
    )
    .run(
      opts.affiliateId,
      opts.leadId,
      opts.projectId,
      opts.milestoneId,
      opts.installerId,
      opts.commissionType,
      opts.baseAmount,
      opts.commissionAmount
    );
}

/**
 * Flips any `eligible`/`paid` affiliate_commissions rows tied to `milestoneId` to
 * `clawed_back` with `reason`, when a dispute on an already-commissioned milestone
 * is resolved as a refund. Call from the admin dispute-resolve route's 'refund'
 * branch only, after the dispute is marked `resolved_refund`.
 *
 * Round 1 has no automated payout-deduction rail: if a row was already `paid`,
 * this does NOT claw back real money — it only records `clawed_back` +
 * `clawback_reason`, matching the spec's note that an already-paid clawback is
 * deducted from the affiliate's *next* manual payout batch, not reversed automatically.
 */
export async function clawbackCommissionsForMilestone(milestoneId: number, reason: string): Promise<void> {
  await db
    .prepare(
      `UPDATE affiliate_commissions
       SET status = 'clawed_back', clawback_reason = ?
       WHERE milestone_id = ? AND status IN ('eligible', 'paid')`
    )
    .run(reason, milestoneId);
}
