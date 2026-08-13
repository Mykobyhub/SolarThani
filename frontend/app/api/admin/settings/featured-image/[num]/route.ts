import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';
import { deleteFile } from '@/lib/upload';

export const dynamic = 'force-dynamic';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ num: string }> }) {
  const session = await getSessionFromRequest(req);
  if (!session || session.role !== 'admin')
    return NextResponse.json({ success: false, message: 'ต้องการสิทธิ์ Admin' }, { status: 403 });

  const { num } = await params;
  if (!['1', '2', '3'].includes(num))
    return NextResponse.json({ success: false, message: 'Card number must be 1, 2, or 3' }, { status: 400 });

  const key = `featured${num}_image`;
  const row = (await db.prepare('SELECT value FROM site_content WHERE key = ?').get(key)) as { value: string } | undefined;
  if (row?.value) deleteFile(row.value);
  await db.prepare(
    "INSERT INTO site_content (key, value, updated_at) VALUES (?, ?, NOW()) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at"
  ).run(key, '');

  return NextResponse.json({ success: true });
}
