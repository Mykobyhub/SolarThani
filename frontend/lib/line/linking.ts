import crypto from 'crypto';
import { db } from '@/lib/db';

const CODE_TTL_MINUTES = 10;

export interface LinkCodeRow {
  id: number;
  code: string;
  party: 'customer' | 'installer' | 'subcontractor';
  project_id: number | null;
  installer_id: number | null;
  subcontractor_id: number | null;
  expires_at: string;
  used_at: string | null;
  created_at: string;
}

/** 6-digit numeric verification code, shown to the user as e.g. "SP-123456". */
function generateCode(): string {
  const n = crypto.randomInt(0, 1_000_000);
  return String(n).padStart(6, '0');
}

/** Issues a fresh link code for a customer (scoped to one payment_project), an installer (scoped
 * to their account), or a sub-contractor (scoped to one subcontractors row — the installer relays
 * this code out-of-band since the sub-contractor never opens any SolarPanel UI). */
export async function createLinkCode(
  opts: { party: 'customer'; projectId: number } | { party: 'installer'; installerId: number } | { party: 'subcontractor'; subcontractorId: number }
): Promise<{ code: string; expiresAt: string }> {
  const code = generateCode();
  const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60_000);
  if (opts.party === 'customer') {
    await db
      .prepare('INSERT INTO line_link_codes (code, party, project_id, expires_at) VALUES (?, ?, ?, ?)')
      .run(code, 'customer', opts.projectId, expiresAt.toISOString());
  } else if (opts.party === 'installer') {
    await db
      .prepare('INSERT INTO line_link_codes (code, party, installer_id, expires_at) VALUES (?, ?, ?, ?)')
      .run(code, 'installer', opts.installerId, expiresAt.toISOString());
  } else {
    await db
      .prepare('INSERT INTO line_link_codes (code, party, subcontractor_id, expires_at) VALUES (?, ?, ?, ?)')
      .run(code, 'subcontractor', opts.subcontractorId, expiresAt.toISOString());
  }
  return { code, expiresAt: expiresAt.toISOString() };
}

/**
 * Called from the LINE webhook once a text message is matched to a pending code.
 * Marks the code used and links the LINE userId to the right row (payment_projects.customer_line_user_id
 * for customers, installers.line_user_id for installers — one shared identity across all their projects).
 * Returns the consumed row (for building the confirmation reply), or null if no live code matched.
 */
export async function consumeLinkCode(rawCode: string, lineUserId: string): Promise<LinkCodeRow | null> {
  const row = (await db
    .prepare(
      `UPDATE line_link_codes SET used_at = CURRENT_TIMESTAMP
       WHERE id = (
         SELECT id FROM line_link_codes
         WHERE code = ? AND used_at IS NULL AND expires_at > CURRENT_TIMESTAMP
         ORDER BY created_at DESC LIMIT 1
       )
       RETURNING *`
    )
    .get(rawCode)) as LinkCodeRow | undefined;
  if (!row) return null;

  if (row.party === 'customer' && row.project_id) {
    await db.prepare('UPDATE payment_projects SET customer_line_user_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(lineUserId, row.project_id);
  } else if (row.party === 'installer' && row.installer_id) {
    await db.prepare('UPDATE installers SET line_user_id = ? WHERE id = ?').run(lineUserId, row.installer_id);
  } else if (row.party === 'subcontractor' && row.subcontractor_id) {
    await db.prepare('UPDATE subcontractors SET line_user_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(lineUserId, row.subcontractor_id);
  }

  return row;
}

/** Extracts the first 6-digit run from a free-text LINE message (user may paste "ยืนยัน SP-123456" or just "123456"). */
export function extractCodeFromText(text: string): string | null {
  const m = text.match(/\d{6}/);
  return m ? m[0] : null;
}
