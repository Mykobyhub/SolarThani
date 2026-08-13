import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const installer = (await db
    .prepare('SELECT id, name, email, role, logo_url, status FROM installers WHERE id = ?')
    .get(session.id)) as Record<string, unknown> | undefined;

  if (!installer || installer.status === 'suspended')
    return NextResponse.json({ success: false, error: 'บัญชีไม่พร้อมใช้งาน' }, { status: 403 });

  return NextResponse.json({ success: true, user: installer });
}
