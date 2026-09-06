// Idempotent migration: adds the Milestone Payment (installment/escrow) tables
// to the already-live Neon Postgres DB. Safe to re-run (uses IF NOT EXISTS /
// checks column existence before ALTER). Mirrors the tables appended to
// frontend/db/schema.sql (that file remains the from-scratch source of truth
// for a brand new DB via apply-schema.mjs; this script is for the existing
// shared dev/prod DB where CREATE TABLE without guards would fail).
//
// Usage: node scripts/migrate-milestone-payment.mjs
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
ALTER TABLE installers ADD COLUMN IF NOT EXISTS line_user_id TEXT;

CREATE TABLE IF NOT EXISTS payment_projects (
    id                        SERIAL PRIMARY KEY,
    lead_id                   INTEGER REFERENCES leads(id),
    installer_id              INTEGER NOT NULL REFERENCES installers(id),
    customer_name             TEXT NOT NULL,
    customer_email            TEXT NOT NULL,
    customer_phone            TEXT,
    title                     TEXT NOT NULL,
    address                   TEXT,
    total_amount              DOUBLE PRECISION NOT NULL,
    status                    TEXT NOT NULL DEFAULT 'proposed'
                              CHECK (status IN ('proposed','awaiting_first_payment','active','completed','disputed','cancelled')),
    customer_token            TEXT UNIQUE NOT NULL,
    customer_line_user_id     TEXT,
    installer_line_user_id    TEXT,
    customer_notify_channel   TEXT NOT NULL DEFAULT 'email' CHECK (customer_notify_channel IN ('email','line','both')),
    installer_notify_channel  TEXT NOT NULL DEFAULT 'email' CHECK (installer_notify_channel IN ('email','line','both')),
    created_at                TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at                TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payment_milestones (
    id            SERIAL PRIMARY KEY,
    project_id    INTEGER NOT NULL REFERENCES payment_projects(id),
    seq           INTEGER NOT NULL,
    description   TEXT NOT NULL,
    amount        DOUBLE PRECISION NOT NULL,
    status        TEXT NOT NULL DEFAULT 'pending_payment'
                  CHECK (status IN ('pending_payment','paid_hold','in_progress','awaiting_confirmation','released','disputed','refunded')),
    due_date      TIMESTAMP,
    completed_at  TIMESTAMP,
    released_at   TIMESTAMP,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (project_id, seq)
);

CREATE TABLE IF NOT EXISTS payment_transactions (
    id                     SERIAL PRIMARY KEY,
    milestone_id           INTEGER NOT NULL REFERENCES payment_milestones(id),
    type                   TEXT NOT NULL CHECK (type IN ('hold','release','refund')),
    provider               TEXT NOT NULL DEFAULT 'mock',
    provider_reference_id  TEXT,
    amount                 DOUBLE PRECISION NOT NULL,
    status                 TEXT NOT NULL DEFAULT 'succeeded' CHECK (status IN ('succeeded','failed')),
    created_at             TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payment_disputes (
    id                     SERIAL PRIMARY KEY,
    milestone_id           INTEGER NOT NULL REFERENCES payment_milestones(id),
    raised_by              TEXT NOT NULL CHECK (raised_by IN ('customer','installer')),
    reason                 TEXT NOT NULL,
    status                 TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved_release','resolved_refund')),
    admin_resolution       TEXT,
    resolved_by_admin_id   INTEGER REFERENCES installers(id),
    resolved_at            TIMESTAMP,
    created_at             TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payment_projects_installer     ON payment_projects(installer_id);
CREATE INDEX IF NOT EXISTS idx_payment_projects_token         ON payment_projects(customer_token);
CREATE INDEX IF NOT EXISTS idx_payment_milestones_project     ON payment_milestones(project_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_milestone ON payment_transactions(milestone_id);
CREATE INDEX IF NOT EXISTS idx_payment_disputes_milestone     ON payment_disputes(milestone_id);
`;

await client.connect();
try {
  await client.query(SQL);
  console.log('Milestone payment schema migrated successfully.');
} finally {
  await client.end();
}
