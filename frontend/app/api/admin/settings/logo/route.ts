import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';
import { deleteFile } from '@/lib/upload';

export const dynamic = 'force-dynamic';

export async function DELETE(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session || session.role !== 'admin')
    return NextResponse.json({ success: false, message: 'ต้องการสิทธิ์ Admin' }, { status: 403 });

  const row = (await db.prepare(`SELECT value FROM site_content WHERE key = 'logo_url'`).get()) as { value: string } | undefined;
  if (row?.value) deleteFile(row.value);
  await db.prepare(`DELETE FROM site_content WHERE key = 'logo_url'`).run();

  return NextResponse.json({ success: true });
}
