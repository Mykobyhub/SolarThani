import crypto from 'crypto';
import { db } from '@/lib/db';

interface LineConfig {
  enabled: boolean;
  oaBasicId: string;
  channelSecret: string;
  accessToken: string;
}

/** Reads LINE OA config from site_content — same pattern as lib/email.ts's getSmtpConfig(). */
export async function getLineConfig(): Promise<LineConfig> {
  const rows = (await db
    .prepare(
      `SELECT key, value FROM site_content WHERE key IN
       ('line_channel_secret','line_channel_access_token','line_notify_enabled','line_oa_basic_id')`
    )
    .all()) as { key: string; value: string }[];
  const cfg = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return {
    enabled: cfg.line_notify_enabled === '1',
    oaBasicId: cfg.line_oa_basic_id || '',
    channelSecret: cfg.line_channel_secret || '',
    accessToken: cfg.line_channel_access_token || '',
  };
}

/** Standard LINE "add friend" deep link — same URL shape already used for installers.line_id contact buttons. */
export function buildAddFriendUrl(oaBasicId: string): string {
  return `https://line.me/R/ti/p/${oaBasicId}`;
}

/**
 * Pushes a text message to a LINE userId via the Messaging API.
 * Fails silently (logs only) if LINE isn't configured/enabled or the userId is missing —
 * same "silent-skip, never throw" contract as sendEmail() so other flows never break because
 * LINE credentials haven't been set up yet.
 */
export async function pushLineMessage(userId: string | null | undefined, text: string): Promise<void> {
  if (!userId) return;
  try {
    const cfg = await getLineConfig();
    if (!cfg.enabled || !cfg.accessToken) return;
    const res = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.accessToken}` },
      body: JSON.stringify({ to: userId, messages: [{ type: 'text', text: text.slice(0, 4900) }] }),
    });
    if (!res.ok) console.error('[line] push failed', res.status, await res.text().catch(() => ''));
  } catch (err) {
    console.error('[line] push error', err);
  }
}

/** Replies to a webhook event using its replyToken (free, doesn't consume push quota). */
export async function replyLineMessage(replyToken: string, text: string): Promise<void> {
  try {
    const cfg = await getLineConfig();
    if (!cfg.accessToken) return;
    const res = await fetch('https://api.line.me/v2/bot/message/reply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.accessToken}` },
      body: JSON.stringify({ replyToken, messages: [{ type: 'text', text: text.slice(0, 4900) }] }),
    });
    if (!res.ok) console.error('[line] reply failed', res.status, await res.text().catch(() => ''));
  } catch (err) {
    console.error('[line] reply error', err);
  }
}

/** Downloads a message's binary content (photo sent by a sub-contractor) via the LINE Content
 * API. Returns null on any failure — callers should treat a missing photo as a no-op, same
 * silent-skip contract as the rest of this file. */
export async function fetchLineContent(messageId: string): Promise<{ buffer: Buffer; contentType: string } | null> {
  try {
    const cfg = await getLineConfig();
    if (!cfg.accessToken) return null;
    const res = await fetch(`https://api-data.line.me/v2/bot/message/${messageId}/content`, {
      headers: { Authorization: `Bearer ${cfg.accessToken}` },
    });
    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') || 'image/jpeg';
    const buffer = Buffer.from(await res.arrayBuffer());
    return { buffer, contentType };
  } catch (err) {
    console.error('[line] fetchLineContent error', err);
    return null;
  }
}

/** Verifies the X-Line-Signature header (HMAC-SHA256, base64) against the raw request body. */
export function verifyLineSignature(rawBody: string, signatureHeader: string | null, channelSecret: string): boolean {
  if (!signatureHeader || !channelSecret) return false;
  const expected = crypto.createHmac('sha256', channelSecret).update(rawBody).digest();
  let provided: Buffer;
  try {
    provided = Buffer.from(signatureHeader, 'base64');
  } catch {
    return false;
  }
  if (provided.length !== expected.length) return false;
  return crypto.timingSafeEqual(expected, provided);
}
