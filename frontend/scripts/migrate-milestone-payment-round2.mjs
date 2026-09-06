// Idempotent migration: round 2 additions for the Milestone Payment system
// (customer token-link pages, project cancellation, real LINE Messaging API
// integration). Safe to re-run. Mirrors the additions appended to
// frontend/db/schema.sql (round 2 section).
//
// Usage: node scripts/migrate-milestone-payment-round2.mjs
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
ALTER TABLE payment_projects ADD COLUMN IF NOT EXISTS cancel_requested INTEGER NOT NULL DEFAULT 0;

ALTER TABLE payment_milestones DROP CONSTRAINT IF EXISTS payment_milestones_status_check;
ALTER TABLE payment_milestones ADD CONSTRAINT payment_milestones_status_check
  CHECK (status IN ('pending_payment','paid_hold','in_progress','awaiting_confirmation','released','disputed','refunded','cancelled'));

CREATE TABLE IF NOT EXISTS line_link_codes (
    id           SERIAL PRIMARY KEY,
    code         TEXT NOT NULL,
    party        TEXT NOT NULL CHECK (party IN ('customer','installer')),
    project_id   INTEGER REFERENCES payment_projects(id),
    installer_id INTEGER REFERENCES installers(id),
    expires_at   TIMESTAMP NOT NULL,
    used_at      TIMESTAMP,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_line_link_codes_code ON line_link_codes(code);
`;

await client.connect();
try {
  await client.query(SQL);
  console.log('Milestone payment round 2 schema migrated successfully.');
} finally {
  await client.end();
}
