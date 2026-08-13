import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromRequest(req);
  if (!session || session.role !== 'admin')
    return NextResponse.json({ success: false, message: 'ต้องการสิทธิ์ Admin' }, { status: 403 });

  const { id } = await params;
  const installer = (await db.prepare('SELECT verified_at FROM installers WHERE id = ?').get(id)) as { verified_at: string | null } | undefined;
  if (!installer) return NextResponse.json({ success: false, message: 'ไม่พบผู้ติดตั้ง' }, { status: 404 });

  const nextVerifiedAt = installer.verified_at ? null : new Date().toISOString();
  await db.prepare('UPDATE installers SET verified_at = ? WHERE id = ?').run(nextVerifiedAt, id);

  return NextResponse.json({ success: true, verified_at: nextVerifiedAt });
}
