import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session || session.role !== 'admin')
    return NextResponse.json({ success: false, message: 'ต้องการสิทธิ์ Admin' }, { status: 403 });

  const row = (await db.prepare("SELECT value FROM site_content WHERE key = 'milestone_payment_enabled'").get()) as
    | { value: string }
    | undefined;

  return NextResponse.json({ success: true, enabled: row?.value === '1' });
}

export async function PUT(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session || session.role !== 'admin')
    return NextResponse.json({ success: false, message: 'ต้องการสิทธิ์ Admin' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const enabled = !!body.enabled;

  await db
    .prepare(
      `INSERT INTO site_content (key, value, updated_at) VALUES ('milestone_payment_enabled', ?, CURRENT_TIMESTAMP)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at`
    )
    .run(enabled ? '1' : '0');

  return NextResponse.json({ success: true, message: enabled ? 'เปิดใช้งานฟีเจอร์ผ่อนชำระแล้ว' : 'ปิดใช้งานฟีเจอร์ผ่อนชำระแล้ว' });
}
