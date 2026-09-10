import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';
import { PAYOUT_THRESHOLD_THB } from '@/lib/affiliate/constants';

export const dynamic = 'force-dynamic';

// GET: admin affiliate ledger — affiliates with an eligible balance ≥ the payout
// threshold (the payout queue), plus a full commissions ledger (all statuses,
// all affiliates) for visibility/filtering. Mirrors the shape of
// app/api/admin/payment-projects/route.ts (one GET, client filters in-browser).
export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session || session.role !== 'admin')
    return NextResponse.json({ success: false, message: 'ต้องการสิทธิ์ Admin' }, { status: 403 });

  const affiliates = await db
    .prepare(
      `SELECT a.id, a.name, a.email, a.referral_code, a.status,
              a.payout_bank_name, a.payout_account_number, a.payout_account_name,
              COALESCE(SUM(CASE WHEN c.status = 'eligible' THEN c.commission_amount ELSE 0 END), 0) AS eligible_balance
       FROM affiliates a
       LEFT JOIN affiliate_commissions c ON c.affiliate_id = a.id
       GROUP BY a.id
       HAVING COALESCE(SUM(CASE WHEN c.status = 'eligible' THEN c.commission_amount ELSE 0 END), 0) >= ?
       ORDER BY eligible_balance DESC`
    )
    .all(PAYOUT_THRESHOLD_THB);

  const commissions = await db
    .prepare(
      `SELECT c.*, i.name AS installer_name, a.name AS affiliate_name, a.email AS affiliate_email
       FROM affiliate_commissions c
       JOIN installers i ON i.id = c.installer_id
       JOIN affiliates a ON a.id = c.affiliate_id
       ORDER BY c.created_at DESC
       LIMIT 500`
    )
    .all();

  const payouts = await db
    .prepare(
      `SELECT p.*, a.name AS affiliate_name, a.email AS affiliate_email
       FROM affiliate_payouts p
       JOIN affiliates a ON a.id = p.affiliate_id
       ORDER BY p.created_at DESC
       LIMIT 200`
    )
    .all();

  return NextResponse.json({
    success: true,
    affiliates,
    commissions,
    payouts,
    payoutThreshold: PAYOUT_THRESHOLD_THB,
  });
}
