import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAffiliateSessionFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Installers that currently opt into the affiliate program — powers the
// "installer-specific link" picker on the Links tab. Empty until at least
// one installer flips affiliate_enabled on via Dashboard → ตั้งค่า
// (app/dashboard/DashboardClient.tsx).
export async function GET(req: NextRequest) {
  const session = await getAffiliateSessionFromRequest(req);
  if (!session) return NextResponse.json({ success: false, message: 'กรุณาเข้าสู่ระบบก่อน' }, { status: 401 });

  const rows = await db.prepare(`
    SELECT id, name, logo_url, location
    FROM installers
    WHERE affiliate_enabled = 1 AND status = 'active'
    ORDER BY name ASC
  `).all();

  return NextResponse.json({ success: true, data: rows });
}
