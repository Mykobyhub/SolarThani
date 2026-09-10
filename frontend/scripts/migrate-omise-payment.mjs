// Idempotent migration: Omise (Opn Payments) Recipient-API integration for the Milestone
// Payment (escrow) system. Adds the 'pending' transaction status (needed because Omise
// charges/transfers are asynchronous, unlike the synchronous mock provider), and the installer
// payout/recipient columns releaseHold() needs to pay installers out via Omise Transfer. Safe
// to re-run. Mirrors the section appended to frontend/db/schema.sql.
//
// Usage: node scripts/migrate-omise-payment.mjs
// (reads DATABASE_URL from frontend/.env.local if not already set)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

if (!process.env.DATABASE_URL) {
  const envPath = path.join(__dirname, '..', '.env.local');
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}

if (!process.env.DATABASE_URL) {
  console.error('Missing DATABASE_URL');
  process.exit(1);
}

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const SQL = `
ALTER TABLE payment_transactions DROP CONSTRAINT IF EXISTS payment_transactions_status_check;
ALTER TABLE payment_transactions ADD CONSTRAINT payment_transactions_status_check
  CHECK (status IN ('succeeded','pending','failed'));

ALTER TABLE installers ADD COLUMN IF NOT EXISTS payout_bank_name TEXT;
ALTER TABLE installers ADD COLUMN IF NOT EXISTS payout_account_number TEXT;
ALTER TABLE installers ADD COLUMN IF NOT EXISTS payout_account_name TEXT;
ALTER TABLE installers ADD COLUMN IF NOT EXISTS omise_recipient_id TEXT;
`;

await client.connect();
try {
  await client.query(SQL);
  console.log('Omise payment integration schema migrated successfully.');
} finally {
  await client.end();
}
