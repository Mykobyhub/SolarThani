import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';
import { deleteFile } from '@/lib/upload';

export const dynamic = 'force-dynamic';

export async function DELETE(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session || session.role !== 'admin')
    return NextResponse.json({ success: false, message: 'ต้องการสิทธิ์ Admin' }, { status: 403 });

  const row = (await db.prepare(`SELECT value FROM site_content WHERE key = 'hero_bg_image'`).get()) as { value: string } | undefined;
  if (row?.value) deleteFile(row.value);
  await db.prepare(
    `INSERT INTO site_content (key, value, updated_at) VALUES ('hero_bg_image', '', NOW()) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at`
  ).run();

  return NextResponse.json({ success: true });
}
