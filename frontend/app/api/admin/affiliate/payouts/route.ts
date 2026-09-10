import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';
import { stripTags } from '@/lib/sanitize';

export const dynamic = 'force-dynamic';

interface EligibleCommissionRow {
  id: number;
  commission_amount: number;
}

// POST: admin marks a batch of an affiliate's eligible commissions as paid —
// this only *records* that the admin already transferred the money outside the
// app (round 1 has no automated payout rail, matching payment_transactions'
// mock provider), it never moves money itself. Body: { affiliateId, commissionIds, reference }.
//
// This codebase has no exposed DB-transaction wrapper (lib/db.ts issues each
// prepared statement as its own pool.query call, same as every other multi-step
// write in the app — e.g. the milestone-release flow). The commissionIds are
// re-validated against the DB (status='eligible' + ownership) immediately before
// the update rather than trusted from the client, which keeps this safe against
// a stale/tampered selection even without a hard transaction boundary.
export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session || session.role !== 'admin')
    return NextResponse.json({ success: false, message: 'ต้องการสิทธิ์ Admin' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const affiliateId = Number(body.affiliateId);
  const commissionIds = Array.isArray(body.commissionIds) ? body.commissionIds.map(Number).filter((n: number) => Number.isFinite(n)) : [];
  const reference = stripTags(String(body.reference || '')).substring(0, 500);

  if (!affiliateId) return NextResponse.json({ success: false, message: 'กรุณาระบุ affiliate' }, { status: 400 });
  if (commissionIds.length === 0) return NextResponse.json({ success: false, message: 'กรุณาเลือกรายการคอมมิชชันอย่างน้อย 1 รายการ' }, { status: 400 });
  if (!reference) return NextResponse.json({ success: false, message: 'กรุณากรอกเลขที่อ้างอิง/หมายเหตุการโอนเงิน' }, { status: 400 });

  const affiliate = await db.prepare('SELECT id, name FROM affiliates WHERE id = ?').get(affiliateId);
  if (!affiliate) return NextResponse.json({ success: false, message: 'ไม่พบ affiliate นี้' }, { status: 404 });

  const placeholders = commissionIds.map(() => '?').join(',');
  const eligibleRows = (await db
    .prepare(
      `SELECT id, commission_amount FROM affiliate_commissions
       WHERE affiliate_id = ? AND status = 'eligible' AND id IN (${placeholders})`
    )
    .all(affiliateId, ...commissionIds)) as EligibleCommissionRow[];

  if (eligibleRows.length === 0)
    return NextResponse.json({ success: false, message: 'รายการที่เลือกไม่อยู่ในสถานะ eligible แล้ว กรุณารีเฟรชและลองใหม่' }, { status: 400 });

  const totalAmount = eligibleRows.reduce((sum, r) => sum + Number(r.commission_amount), 0);

  const payout = (await db
    .prepare(
      `INSERT INTO affiliate_payouts (affiliate_id, total_amount, status, reference, admin_id, paid_at)
       VALUES (?, ?, 'paid', ?, ?, CURRENT_TIMESTAMP) RETURNING id`
    )
    .get(affiliateId, totalAmount, reference, session.id)) as { id: number };

  const eligibleIds = eligibleRows.map((r) => r.id);
  const updatePlaceholders = eligibleIds.map(() => '?').join(',');
  await db
    .prepare(
      `UPDATE affiliate_commissions
       SET status = 'paid', payout_id = ?, paid_at = CURRENT_TIMESTAMP
       WHERE id IN (${updatePlaceholders})`
    )
    .run(payout.id, ...eligibleIds);

  return NextResponse.json({
    success: true,
    message: `บันทึกการจ่ายเงิน ${eligibleRows.length} รายการให้ ${affiliate.name} เรียบร้อย`,
    payoutId: payout.id,
    totalAmount,
  });
}
