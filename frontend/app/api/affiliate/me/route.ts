import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { stripTags } from '@/lib/sanitize';
import { getAffiliateSessionFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Commission/click totals are real queries against affiliate_commissions /
// affiliate_clicks (both live tables since Phase 1's migration) — they will
// simply return 0 until Phase 3 (click tracking) and Phase 5 (commission
// creation on milestone release) are built and start writing rows.
export async function GET(req: NextRequest) {
  const session = await getAffiliateSessionFromRequest(req);
  if (!session) return NextResponse.json({ success: false, message: 'กรุณาเข้าสู่ระบบก่อน' }, { status: 401 });

  const affiliate = (await db.prepare(`
    SELECT id, email, name, phone, referral_code, status,
           payout_bank_name, payout_account_number, payout_account_name,
           verified_at, created_at
    FROM affiliates WHERE id = ?
  `).get(session.id)) as Record<string, unknown> | undefined;

  if (!affiliate) return NextResponse.json({ success: false, message: 'ไม่พบข้อมูล' }, { status: 404 });

  const clickCount = (await db.prepare(
    'SELECT COUNT(*) as c FROM affiliate_clicks WHERE affiliate_id = ?'
  ).get(session.id)) as { c: number };

  const commissionRows = (await db.prepare(`
    SELECT status, COUNT(*) as cnt, COALESCE(SUM(commission_amount), 0) as total
    FROM affiliate_commissions WHERE affiliate_id = ? GROUP BY status
  `).all(session.id)) as { status: string; cnt: number; total: number }[];

  const commissionsByStatus: Record<string, { count: number; total: number }> = {
    pending: { count: 0, total: 0 },
    eligible: { count: 0, total: 0 },
    paid: { count: 0, total: 0 },
    clawed_back: { count: 0, total: 0 },
  };
  for (const row of commissionRows) {
    if (commissionsByStatus[row.status]) {
      commissionsByStatus[row.status] = { count: row.cnt, total: row.total };
    }
  }

  return NextResponse.json({
    success: true,
    data: {
      affiliate,
      stats: {
        totalClicks: clickCount.c,
        commissionsByStatus,
        eligibleBalance: commissionsByStatus.eligible.total,
      },
    },
  });
}

export async function PUT(req: NextRequest) {
  const session = await getAffiliateSessionFromRequest(req);
  if (!session) return NextResponse.json({ success: false, message: 'กรุณาเข้าสู่ระบบก่อน' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { payout_bank_name, payout_account_number, payout_account_name } = body;

  await db.prepare(`
    UPDATE affiliates SET
      payout_bank_name = ?, payout_account_number = ?, payout_account_name = ?, updated_at = NOW()
    WHERE id = ?
  `).run(
    payout_bank_name ? stripTags(payout_bank_name) : null,
    payout_account_number ? stripTags(payout_account_number) : null,
    payout_account_name ? stripTags(payout_account_name) : null,
    session.id
  );

  return NextResponse.json({ success: true, message: 'บันทึกข้อมูลบัญชีรับเงินสำเร็จ' });
}
