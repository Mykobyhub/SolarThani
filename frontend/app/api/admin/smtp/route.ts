import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session || session.role !== 'admin')
    return NextResponse.json({ success: false, message: 'ต้องการสิทธิ์ Admin' }, { status: 403 });

  const rows = (await db
    .prepare(`SELECT key, value FROM site_content WHERE key IN ('smtp_user','smtp_pass','smtp_host','smtp_port')`)
    .all()) as { key: string; value: string }[];
  const cfg = Object.fromEntries(rows.map((r) => [r.key, r.value]));

  return NextResponse.json({
    success: true,
    smtp_user:     cfg.smtp_user || '',
    smtp_pass_set: !!cfg.smtp_pass,
    smtp_host:     cfg.smtp_host || 'smtp.hostinger.com',
    smtp_port:     cfg.smtp_port || '465',
  });
}

export async function PUT(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session || session.role !== 'admin')
    return NextResponse.json({ success: false, message: 'ต้องการสิทธิ์ Admin' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const { smtp_user, smtp_pass, smtp_host, smtp_port } = body;
  if (!smtp_user || !smtp_pass)
    return NextResponse.json({ success: false, message: 'กรุณาระบุ smtp_user และ smtp_pass' }, { status: 400 });

  const stmt = db.prepare(
    "INSERT INTO site_content (key, value, updated_at) VALUES (?, ?, NOW()) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at"
  );
  await stmt.run('smtp_user', String(smtp_user).trim());
  await stmt.run('smtp_pass', String(smtp_pass).trim());
  await stmt.run('smtp_host', String(smtp_host || 'smtp.hostinger.com').trim());
  await stmt.run('smtp_port', String(smtp_port || '465').trim());

  return NextResponse.json({ success: true, message: 'บันทึกการตั้งค่า SMTP สำเร็จ' });
}
