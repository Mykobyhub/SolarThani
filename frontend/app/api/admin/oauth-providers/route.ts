import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session || session.role !== 'admin')
    return NextResponse.json({ success: false, message: 'ต้องการสิทธิ์ Admin' }, { status: 403 });

  // Never return the raw client_secret to the browser — only whether one is set,
  // same masking pattern as /api/admin/smtp's smtp_pass_set.
  const rows = await db.prepare(
    "SELECT provider, client_id, active, (client_secret <> '') AS client_secret_set FROM oauth_providers ORDER BY provider"
  ).all();

  return NextResponse.json({ success: true, data: rows });
}
