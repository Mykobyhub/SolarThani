import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAffiliateSessionFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Full commission ledger for the logged-in affiliate. Rows are created by
// lib/affiliate/commission-service.ts at milestone-release time — an empty
// array here is expected until one of this affiliate's referred leads has a
// project with a released milestone.
export async function GET(req: NextRequest) {
  const session = await getAffiliateSessionFromRequest(req);
  if (!session) return NextResponse.json({ success: false, message: 'กรุณาเข้าสู่ระบบก่อน' }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const status = searchParams.get('status');

  const rows = status
    ? await db.prepare(`
        SELECT c.*, i.name as installer_name
        FROM affiliate_commissions c
        JOIN installers i ON i.id = c.installer_id
        WHERE c.affiliate_id = ? AND c.status = ?
        ORDER BY c.created_at DESC
      `).all(session.id, status)
    : await db.prepare(`
        SELECT c.*, i.name as installer_name
        FROM affiliate_commissions c
        JOIN installers i ON i.id = c.installer_id
        WHERE c.affiliate_id = ?
        ORDER BY c.created_at DESC
      `).all(session.id);

  return NextResponse.json({ success: true, data: rows });
}
