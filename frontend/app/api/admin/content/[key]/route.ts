import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';
import { stripTags } from '@/lib/sanitize';

export const dynamic = 'force-dynamic';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  const session = await getSessionFromRequest(req);
  if (!session || session.role !== 'admin')
    return NextResponse.json({ success: false, message: 'ต้องการสิทธิ์ Admin' }, { status: 403 });

  const { key } = await params;
  const body = await req.json().catch(() => ({}));
  if (body.value === undefined)
    return NextResponse.json({ success: false, message: 'กรุณาระบุ value' }, { status: 400 });

  await db.prepare(`
    INSERT INTO site_content (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=CURRENT_TIMESTAMP
  `).run(key, stripTags(String(body.value)));

  return NextResponse.json({ success: true, message: 'บันทึกสำเร็จ' });
}
