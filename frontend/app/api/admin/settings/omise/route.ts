import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';
import { stripTags } from '@/lib/sanitize';

export const dynamic = 'force-dynamic';

// Omise (Opn Payments) gateway settings — credential storage + mode toggle only, same
// write-only-secret convention as app/api/admin/settings/line/route.ts. Public keys are
// plain (safe to show — they're meant to be used client-side); secret keys are write-only
// (GET only ever reports whether one is set, never the value itself).
export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session || session.role !== 'admin')
    return NextResponse.json({ success: false, message: 'ต้องการสิทธิ์ Admin' }, { status: 403 });

  const rows = (await db
    .prepare(
      `SELECT key, value FROM site_content WHERE key IN
       ('omise_mode','omise_integration_mode','omise_test_public_key','omise_test_secret_key','omise_live_public_key','omise_live_secret_key')`
    )
    .all()) as { key: string; value: string }[];
  const cfg = Object.fromEntries(rows.map((r) => [r.key, r.value]));

  const appUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

  return NextResponse.json({
    success: true,
    mode: cfg.omise_mode === 'live' ? 'live' : 'test',
    integration_mode: cfg.omise_integration_mode === 'account_chaining' ? 'account_chaining' : 'recipient_api',
    test_public_key: cfg.omise_test_public_key || '',
    live_public_key: cfg.omise_live_public_key || '',
    test_secret_key_set: !!cfg.omise_test_secret_key,
    live_secret_key_set: !!cfg.omise_live_secret_key,
    webhook_url: `${appUrl}/api/webhooks/omise`,
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

  await stmt.run('omise_mode', body.mode === 'live' ? 'live' : 'test');
  // Only 'recipient_api' is actually implemented — this is stored so the setting exists ready
  // for a future Account Chaining addition, but nothing branches on it yet.
  await stmt.run('omise_integration_mode', body.integration_mode === 'account_chaining' ? 'account_chaining' : 'recipient_api');
  await stmt.run('omise_test_public_key', stripTags(body.test_public_key || ''));
  await stmt.run('omise_live_public_key', stripTags(body.live_public_key || ''));

  // Write-only fields: blank/omitted means "leave the currently saved value unchanged".
  const testSecretKey = typeof body.test_secret_key === 'string' ? body.test_secret_key.trim() : '';
  if (testSecretKey) await stmt.run('omise_test_secret_key', testSecretKey);
  const liveSecretKey = typeof body.live_secret_key === 'string' ? body.live_secret_key.trim() : '';
  if (liveSecretKey) await stmt.run('omise_live_secret_key', liveSecretKey);

  return NextResponse.json({ success: true, message: 'บันทึกการตั้งค่า Omise แล้ว' });
}
