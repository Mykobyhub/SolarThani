// Idempotent migration: round-2 follow-ups to the Omise (Opn Payments) Recipient-API
// integration. Adds the installer payout-recipient-type + tax-id columns releaseHold() needs to
// create a 'corporation' Omise Recipient (instead of always 'individual'). Safe to re-run.
// Mirrors the section appended to frontend/db/schema.sql.
//
// Usage: node scripts/migrate-omise-payment-round2.mjs
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
ALTER TABLE installers ADD COLUMN IF NOT EXISTS payout_recipient_type TEXT DEFAULT 'individual';
ALTER TABLE installers ADD COLUMN IF NOT EXISTS payout_tax_id TEXT;
`;

await client.connect();
try {
  await client.query(SQL);
  console.log('Omise payment integration round-2 schema migrated successfully.');
} finally {
  await client.end();
}
