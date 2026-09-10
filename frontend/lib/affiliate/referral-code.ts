import crypto from 'crypto';
import { db } from '@/lib/db';

// Uppercase alphanumeric, excludes visually-ambiguous chars (I/O/0/1), same
// ambiguity-avoidance convention as generateTempPassword() in lib/auth.ts —
// referral codes get typed/shared in URLs so legibility matters.
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function randomCode(length = 8): string {
  const bytes = crypto.randomBytes(length);
  let code = '';
  for (let i = 0; i < length; i++) code += CODE_CHARS[bytes[i] % CODE_CHARS.length];
  return code;
}

// Generates a short referral code and checks it against affiliates.referral_code
// for uniqueness, retrying a handful of times before giving up (collision odds
// at 8 chars from a 33-char alphabet are astronomically low, so retries are
// just a defense-in-depth, not an expected hot path).
export async function generateUniqueReferralCode(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomCode(8);
    const existing = await db.prepare('SELECT id FROM affiliates WHERE referral_code = ?').get(code);
    if (!existing) return code;
  }
  throw new Error('ไม่สามารถสร้างรหัสแนะนำที่ไม่ซ้ำได้ กรุณาลองใหม่');
}
