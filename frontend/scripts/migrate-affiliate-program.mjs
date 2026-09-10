// Idempotent migration: Affiliate / Referral Program — Phase 1 (DB schema
// only). Adds the new `affiliates` public role, its email-verify table, the
// installer opt-in/commission columns, click tracking, lead attribution
// snapshot columns, and the commission/payout ledger. Safe to re-run. Mirrors
// the section appended to frontend/db/schema.sql. See
// SolarPanel-Requirements.md, "Confirmed spec — Affiliate / Referral
// Program" (~line 3784-3927) for the full DDL/rationale this was copied from.
//
// Ordering note: affiliate_payouts is created BEFORE affiliate_commissions
// since the latter's payout_id column FK-references it.
//
// Usage: node scripts/migrate-affiliate-program.mjs
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
CREATE TABLE IF NOT EXISTS affiliates (
    id                    SERIAL PRIMARY KEY,
    email                 TEXT UNIQUE NOT NULL,
    password_hash         TEXT NOT NULL,
    name                  TEXT NOT NULL,
    phone                 TEXT,
    referral_code         TEXT UNIQUE NOT NULL,
    status                TEXT NOT NULL DEFAULT 'pending_verification'
                          CHECK (status IN ('pending_verification','active','suspended')),
    payout_bank_name      TEXT,
    payout_account_number TEXT,
    payout_account_name   TEXT,
    verified_at           TIMESTAMP,
    created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS affiliate_verifications (
    id           SERIAL PRIMARY KEY,
    affiliate_id INTEGER NOT NULL REFERENCES affiliates(id),
    token        TEXT NOT NULL,
    expires_at   TIMESTAMP NOT NULL,
    used         INTEGER DEFAULT 0,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE installers ADD COLUMN IF NOT EXISTS affiliate_enabled INTEGER NOT NULL DEFAULT 0;
ALTER TABLE installers ADD COLUMN IF NOT EXISTS affiliate_commission_type TEXT DEFAULT 'percent'
  CHECK (affiliate_commission_type IN ('percent','flat'));
ALTER TABLE installers ADD COLUMN IF NOT EXISTS affiliate_commission_value DOUBLE PRECISION DEFAULT 0;

CREATE TABLE IF NOT EXISTS affiliate_clicks (
    id           SERIAL PRIMARY KEY,
    affiliate_id INTEGER NOT NULL REFERENCES affiliates(id),
    installer_id INTEGER REFERENCES installers(id),
    ip_hash      TEXT,
    user_agent   TEXT,
    landing_path TEXT,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE leads ADD COLUMN IF NOT EXISTS affiliate_id INTEGER REFERENCES affiliates(id);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS affiliate_commission_type TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS affiliate_commission_value DOUBLE PRECISION;

CREATE TABLE IF NOT EXISTS affiliate_payouts (
    id           SERIAL PRIMARY KEY,
    affiliate_id INTEGER NOT NULL REFERENCES affiliates(id),
    total_amount DOUBLE PRECISION NOT NULL,
    status       TEXT NOT NULL DEFAULT 'paid' CHECK (status IN ('paid','cancelled')),
    reference    TEXT,
    admin_id     INTEGER REFERENCES installers(id),
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    paid_at      TIMESTAMP
);

CREATE TABLE IF NOT EXISTS affiliate_commissions (
    id                SERIAL PRIMARY KEY,
    affiliate_id      INTEGER NOT NULL REFERENCES affiliates(id),
    lead_id           INTEGER REFERENCES leads(id),
    project_id        INTEGER REFERENCES payment_projects(id),
    milestone_id      INTEGER REFERENCES payment_milestones(id),
    installer_id      INTEGER NOT NULL REFERENCES installers(id),
    commission_type   TEXT NOT NULL CHECK (commission_type IN ('percent','flat')),
    base_amount       DOUBLE PRECISION NOT NULL,
    commission_amount DOUBLE PRECISION NOT NULL,
    status            TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','eligible','paid','clawed_back')),
    payout_id         INTEGER REFERENCES affiliate_payouts(id),
    clawback_reason   TEXT,
    computed_at       TIMESTAMP,
    paid_at           TIMESTAMP,
    created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_affiliate      ON affiliate_clicks(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_affiliate ON affiliate_commissions(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_installer ON affiliate_commissions(installer_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_milestone ON affiliate_commissions(milestone_id);
CREATE INDEX IF NOT EXISTS idx_affiliates_referral_code        ON affiliates(referral_code);
`;

await client.connect();
try {
  await client.query(SQL);
  console.log('Affiliate program schema migrated successfully.');
} finally {
  await client.end();
}
