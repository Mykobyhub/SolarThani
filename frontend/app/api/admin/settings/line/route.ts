import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';
import { stripTags } from '@/lib/sanitize';

export const dynamic = 'force-dynamic';

// LINE Official Account settings — credential storage + feature toggle only.
// Round 1 scope: form + DB storage, ready for round 2 to wire up the real
// LINE Messaging API webhook/notification logic. No message is actually sent yet.
export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session || session.role !== 'admin')
    return NextResponse.json({ success: false, message: 'ต้องการสิทธิ์ Admin' }, { status: 403 });

  const rows = (await db
    .prepare(
      `SELECT key, value FROM site_content WHERE key IN
       ('line_channel_id','line_oa_basic_id','line_channel_secret','line_channel_access_token','line_notify_enabled')`
    )
    .all()) as { key: string; value: string }[];
  const cfg = Object.fromEntries(rows.map((r) => [r.key, r.value]));

  const appUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

  return NextResponse.json({
    success: true,
    channel_id: cfg.line_channel_id || '',
    oa_basic_id: cfg.line_oa_basic_id || '',
    channel_secret_set: !!cfg.line_channel_secret,
    channel_access_token_set: !!cfg.line_channel_access_token,
    notify_enabled: cfg.line_notify_enabled === '1',
    webhook_url: `${appUrl}/api/line/webhook`,
  });
}

export async function PUT(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session || session.role !== 'admin')
    return NextResponse.json({ success: false, message: 'ต้องการสิทธิ์ Admin' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const stmt = db.prepare(
    "INSERT INTO site_content (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at"
  );

  await stmt.run('line_channel_id', stripTags(body.channel_id || ''));
  await stmt.run('line_oa_basic_id', stripTags(body.oa_basic_id || ''));
  await stmt.run('line_notify_enabled', body.notify_enabled ? '1' : '0');

  // Write-only fields: blank/omitted means "leave the currently saved value unchanged".
  const channelSecret = typeof body.channel_secret === 'string' ? body.channel_secret.trim() : '';
  if (channelSecret) await stmt.run('line_channel_secret', channelSecret);
  const accessToken = typeof body.channel_access_token === 'string' ? body.channel_access_token.trim() : '';
  if (accessToken) await stmt.run('line_channel_access_token', accessToken);

  return NextResponse.json({ success: true, message: 'บันทึกการตั้งค่า LINE OA แล้ว' });
}
