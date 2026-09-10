// Omise (Opn Payments) provider — Recipient API only (see provider.ts's header comment for the
// architecture decision). Talks to Omise's REST API with plain `fetch` + HTTP Basic Auth (secret
// key as username, empty password) rather than the `omise` npm package, per the approved plan.
//
// Config (public/secret keys, active mode, reserved integration_mode) lives in `site_content`,
// same convention as lib/line/send.ts's getLineConfig() — never `process.env`.

import { db } from '@/lib/db';
import type { PaymentActionResult, PaymentHoldParams, PaymentProvider, PaymentReleaseParams, PaymentRefundParams } from './provider';

const OMISE_API = 'https://api.omise.co';

export interface OmiseConfig {
  mode: 'test' | 'live';
  /** Reserved for a future Account Chaining addition — only stored/returned today, no branching logic reads it. */
  integrationMode: 'recipient_api' | 'account_chaining';
  testPublicKey: string;
  testSecretKey: string;
  livePublicKey: string;
  liveSecretKey: string;
}

/** Reads Omise config from site_content — mirrors getLineConfig()'s lookup style exactly. */
export async function getOmiseConfig(): Promise<OmiseConfig> {
  const rows = (await db
    .prepare(
      `SELECT key, value FROM site_content WHERE key IN
       ('omise_mode','omise_integration_mode','omise_test_public_key','omise_test_secret_key','omise_live_public_key','omise_live_secret_key')`
    )
    .all()) as { key: string; value: string }[];
  const cfg = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return {
    mode: cfg.omise_mode === 'live' ? 'live' : 'test',
    integrationMode: cfg.omise_integration_mode === 'account_chaining' ? 'account_chaining' : 'recipient_api',
    testPublicKey: cfg.omise_test_public_key || '',
    testSecretKey: cfg.omise_test_secret_key || '',
    livePublicKey: cfg.omise_live_public_key || '',
    liveSecretKey: cfg.omise_live_secret_key || '',
  };
}

/** The secret key for whichever mode is currently active — empty string means "not configured". */
export function activeOmiseSecretKey(cfg: OmiseConfig): string {
  return cfg.mode === 'live' ? cfg.liveSecretKey : cfg.testSecretKey;
}

function authHeader(secretKey: string): string {
  return `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`;
}

async function omiseFetch(path: string, secretKey: string, init?: RequestInit): Promise<{ ok: boolean; status: number; body: Record<string, unknown> }> {
  const res = await fetch(`${OMISE_API}${path}`, {
    ...init,
    headers: {
      Authorization: authHeader(secretKey),
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body };
}

/** THB -> satang (Omise amounts are always the smallest currency unit). */
function toSatang(amountThb: number): number {
  return Math.round(amountThb * 100);
}

/**
 * Best-effort mapping from the free-text Thai bank name installers type into their payout
 * fields (installers.payout_bank_name — same column/convention as affiliates' manual-payout
 * form) to the bank "brand" code Omise's Recipient API requires. This is a substring-match
 * heuristic covering the common Thai banks; an unmatched name falls through to a slugified
 * guess that Omise will most likely reject — flagged as a follow-up to replace this free-text
 * field with a proper bank dropdown before this goes anywhere near production.
 */
const BANK_NAME_TO_OMISE_BRAND: { match: string; brand: string }[] = [
  { match: 'กสิกร', brand: 'kbank' },
  { match: 'kbank', brand: 'kbank' },
  { match: 'ไทยพาณิชย์', brand: 'scb' },
  { match: 'scb', brand: 'scb' },
  { match: 'กรุงไทย', brand: 'ktb' },
  { match: 'ktb', brand: 'ktb' },
  { match: 'กรุงเทพ', brand: 'bbl' },
  { match: 'bbl', brand: 'bbl' },
  { match: 'กรุงศรี', brand: 'bay' },
  { match: 'bay', brand: 'bay' },
  { match: 'ทหารไทยธนชาต', brand: 'ttb' },
  { match: 'ธนชาต', brand: 'ttb' },
  { match: 'ttb', brand: 'ttb' },
  { match: 'ออมสิน', brand: 'gsb' },
  { match: 'อาคารสงเคราะห์', brand: 'ghb' },
  { match: 'ยูโอบี', brand: 'uob' },
  { match: 'uob', brand: 'uob' },
  { match: 'ซีไอเอ็มบี', brand: 'cimb' },
  { match: 'cimb', brand: 'cimb' },
  { match: 'เกียรตินาคิน', brand: 'kkp' },
  { match: 'ทิสโก้', brand: 'tisco' },
  { match: 'แลนด์ แอนด์ เฮ้าส์', brand: 'lhb' },
  { match: 'แลนด์แอนด์เฮ้าส์', brand: 'lhb' },
];

function mapBankNameToOmiseBrand(bankName: string): string {
  const lower = bankName.toLowerCase();
  for (const { match, brand } of BANK_NAME_TO_OMISE_BRAND) {
    if (lower.includes(match.toLowerCase())) return brand;
  }
  console.error(`[omise] no known brand mapping for bank name "${bankName}" — sending a best-effort slug, Omise will likely reject it`);
  return lower.replace(/[^a-z]/g, '').slice(0, 20) || 'other';
}

interface InstallerPayoutRow {
  installer_id: number;
  payout_bank_name: string | null;
  payout_account_number: string | null;
  payout_account_name: string | null;
  omise_recipient_id: string | null;
}

async function getInstallerPayoutForMilestone(milestoneId: number): Promise<InstallerPayoutRow | undefined> {
  return (await db
    .prepare(
      `SELECT p.installer_id, i.payout_bank_name, i.payout_account_number, i.payout_account_name, i.omise_recipient_id
       FROM payment_milestones m
       JOIN payment_projects p ON p.id = m.project_id
       JOIN installers i ON i.id = p.installer_id
       WHERE m.id = ?`
    )
    .get(milestoneId)) as InstallerPayoutRow | undefined;
}

function mapChargeStatus(status: unknown): 'succeeded' | 'pending' | 'failed' {
  if (status === 'successful') return 'succeeded';
  if (status === 'failed' || status === 'expired') return 'failed';
  return 'pending';
}

function mapTransferStatus(status: unknown): 'succeeded' | 'pending' | 'failed' {
  if (status === 'paid') return 'succeeded';
  if (status === 'failed') return 'failed';
  return 'pending';
}

export class OmisePaymentProvider implements PaymentProvider {
  readonly name = 'omise';

  private async secretKey(): Promise<string> {
    const cfg = await getOmiseConfig();
    const key = activeOmiseSecretKey(cfg);
    if (!key) throw new Error('Omise secret key not configured for the active mode');
    return key;
  }

  /**
   * Creates an Omise Charge for the milestone amount, PromptPay by default (a QR the customer
   * scans in their banking app — no card required, matches how most Thai customers pay).
   * Charges are asynchronous: the charge is created 'pending' and only becomes 'successful'
   * once the customer actually pays, reported later via the charge.complete webhook.
   */
  async createHold({ amount, projectId, milestoneId }: PaymentHoldParams): Promise<PaymentActionResult> {
    const secretKey = await this.secretKey();
    const { ok, body } = await omiseFetch('/charges', secretKey, {
      method: 'POST',
      body: JSON.stringify({
        amount: toSatang(amount),
        currency: 'thb',
        source: { type: 'promptpay' },
        metadata: { projectId, milestoneId },
      }),
    });

    if (!ok || !body.id) {
      console.error('[omise] createHold (charge) failed', projectId, milestoneId, body);
      return { success: false, status: 'failed', referenceId: '' };
    }

    const status = mapChargeStatus(body.status);
    const source = body.source as Record<string, unknown> | undefined;
    const scannableImage = (source?.scannable_code as Record<string, unknown> | undefined)?.image as Record<string, unknown> | undefined;
    const nextActionUrl = (body.authorize_uri as string | undefined) || (scannableImage?.download_uri as string | undefined) || undefined;

    return { success: status !== 'failed', status, referenceId: String(body.id), nextActionUrl };
  }

  /**
   * Pays the installer out for one milestone via Omise Transfer. Creates (and persists) an
   * Omise Recipient the first time this installer is paid, then transfers the amount to it.
   * Transfers are asynchronous — 'pending' until confirmed by the transfer.paid/transfer.fail
   * webhook.
   */
  async releaseHold({ amount, milestoneId }: PaymentReleaseParams): Promise<PaymentActionResult> {
    const secretKey = await this.secretKey();
    const payout = await getInstallerPayoutForMilestone(milestoneId);
    if (!payout) {
      console.error('[omise] releaseHold: could not resolve installer payout details for milestone', milestoneId);
      return { success: false, status: 'failed', referenceId: '' };
    }

    let recipientId = payout.omise_recipient_id;
    if (!recipientId) {
      if (!payout.payout_bank_name || !payout.payout_account_number || !payout.payout_account_name) {
        console.error('[omise] releaseHold: installer', payout.installer_id, 'has no payout bank details on file');
        return { success: false, status: 'failed', referenceId: '' };
      }
      const { ok, body } = await omiseFetch('/recipients', secretKey, {
        method: 'POST',
        body: JSON.stringify({
          name: payout.payout_account_name,
          type: 'individual',
          bank_account: {
            brand: mapBankNameToOmiseBrand(payout.payout_bank_name),
            number: payout.payout_account_number,
            name: payout.payout_account_name,
          },
        }),
      });
      if (!ok || !body.id) {
        console.error('[omise] releaseHold: recipient creation failed for installer', payout.installer_id, body);
        return { success: false, status: 'failed', referenceId: '' };
      }
      recipientId = String(body.id);
      await db.prepare('UPDATE installers SET omise_recipient_id = ? WHERE id = ?').run(recipientId, payout.installer_id);
    }

    const { ok, body } = await omiseFetch('/transfers', secretKey, {
      method: 'POST',
      body: JSON.stringify({
        amount: toSatang(amount),
        recipient: recipientId,
        metadata: { milestoneId },
      }),
    });
    if (!ok || !body.id) {
      console.error('[omise] releaseHold (transfer) failed', milestoneId, body);
      return { success: false, status: 'failed', referenceId: '' };
    }

    const status = mapTransferStatus(body.status);
    return { success: status !== 'failed', status, referenceId: String(body.id) };
  }

  /** Refunds a charge. Omise processes refunds synchronously for the payment methods this app
   * uses (PromptPay), so this resolves 'succeeded'/'failed' immediately — no refund webhook
   * event is handled (see webhook route's header comment). */
  async refundHold({ holdReferenceId, amount, milestoneId }: PaymentRefundParams): Promise<PaymentActionResult> {
    const secretKey = await this.secretKey();
    if (!holdReferenceId) {
      console.error('[omise] refundHold: missing original charge id for milestone', milestoneId);
      return { success: false, status: 'failed', referenceId: '' };
    }
    const { ok, body } = await omiseFetch(`/charges/${holdReferenceId}/refunds`, secretKey, {
      method: 'POST',
      body: JSON.stringify({ amount: toSatang(amount) }),
    });
    if (!ok || !body.id) {
      console.error('[omise] refundHold failed', milestoneId, holdReferenceId, body);
      return { success: false, status: 'failed', referenceId: '' };
    }
    return { success: true, status: 'succeeded', referenceId: String(body.id) };
  }
}
