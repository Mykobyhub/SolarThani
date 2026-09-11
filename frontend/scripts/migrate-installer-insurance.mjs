// Idempotent migration: installer liability-insurance verification. Adds columns so admin can
// record that they reviewed an installer's insurance policy document off-platform (mirrors how
// installers.verified_at already works, with the same "manual check, no document trail in-app"
// process), plus an expiry date — unlike general verification, insurance genuinely lapses, so the
// public badge must stop showing once insurance_expires_at is in the past. provider/policy_number
// are admin-only reference fields (not shown publicly) to help recall what was checked. Safe to
// re-run. Mirrors the section appended to frontend/db/schema.sql.
//
// Usage: node scripts/migrate-installer-insurance.mjs
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
ALTER TABLE installers ADD COLUMN IF NOT EXISTS insurance_verified_at TIMESTAMP;
ALTER TABLE installers ADD COLUMN IF NOT EXISTS insurance_expires_at DATE;
ALTER TABLE installers ADD COLUMN IF NOT EXISTS insurance_provider TEXT;
ALTER TABLE installers ADD COLUMN IF NOT EXISTS insurance_policy_number TEXT;
`;

await client.connect();
try {
  await client.query(SQL);
  console.log('Installer insurance verification schema migrated successfully.');
} finally {
  await client.end();
}
