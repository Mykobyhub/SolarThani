import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const session = await getSessionFromRequest(req);
  if (!session || session.role !== 'admin')
    return NextResponse.json({ success: false, message: 'ต้องการสิทธิ์ Admin' }, { status: 403 });

  const { provider } = await params;
  if (!['google', 'facebook', 'twitter', 'tiktok'].includes(provider))
    return NextResponse.json({ success: false, message: 'ไม่รองรับ provider นี้' }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const { client_id = '', client_secret = '', active = 0 } = body;

  await db.prepare(
    'UPDATE oauth_providers SET client_id=?, client_secret=?, active=? WHERE provider=?'
  ).run(String(client_id).trim(), String(client_secret).trim(), active ? 1 : 0, provider);

  return NextResponse.json({ success: true });
}
