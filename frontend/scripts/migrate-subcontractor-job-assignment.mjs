// Idempotent migration: Sub-contractor Job Assignment feature (new tables
// `subcontractors`, `job_assignments`, `job_assignment_updates` + widening
// `line_link_codes` for party='subcontractor'). Safe to re-run. Mirrors the
// section appended to frontend/db/schema.sql.
//
// Usage: node scripts/migrate-subcontractor-job-assignment.mjs
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
CREATE TABLE IF NOT EXISTS subcontractors (
    id              SERIAL PRIMARY KEY,
    installer_id    INTEGER NOT NULL REFERENCES installers(id),
    name            TEXT NOT NULL,
    phone           TEXT,
    specialty_tags  TEXT NOT NULL DEFAULT '[]',
    line_user_id    TEXT,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS job_assignments (
    id                        SERIAL PRIMARY KEY,
    milestone_id              INTEGER NOT NULL REFERENCES payment_milestones(id),
    category                  TEXT NOT NULL CHECK (category IN ('สำรวจ','ติดตั้งแผง','เดินสายไฟ','ล้างแผง')),
    subcontractor_id          INTEGER NOT NULL REFERENCES subcontractors(id),
    status                    TEXT NOT NULL DEFAULT 'assigned'
                              CHECK (status IN ('assigned','in_progress','submitted','approved','rejected')),
    submitted_note            TEXT,
    submitted_at              TIMESTAMP,
    rejected_reason           TEXT,
    rejected_at               TIMESTAMP,
    approved_at               TIMESTAMP,
    previous_subcontractor_id INTEGER REFERENCES subcontractors(id),
    reassigned_at             TIMESTAMP,
    created_at                TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at                TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (milestone_id, category)
);

CREATE TABLE IF NOT EXISTS job_assignment_updates (
    id                 SERIAL PRIMARY KEY,
    job_assignment_id  INTEGER NOT NULL REFERENCES job_assignments(id),
    subcontractor_id   INTEGER NOT NULL REFERENCES subcontractors(id),
    kind               TEXT NOT NULL DEFAULT 'text' CHECK (kind IN ('text','photo','system')),
    body               TEXT NOT NULL,
    created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE line_link_codes DROP CONSTRAINT IF EXISTS line_link_codes_party_check;
ALTER TABLE line_link_codes ADD CONSTRAINT line_link_codes_party_check
  CHECK (party IN ('customer','installer','subcontractor'));
ALTER TABLE line_link_codes ADD COLUMN IF NOT EXISTS subcontractor_id INTEGER REFERENCES subcontractors(id);

CREATE INDEX IF NOT EXISTS idx_subcontractors_installer      ON subcontractors(installer_id);
CREATE INDEX IF NOT EXISTS idx_job_assignments_milestone     ON job_assignments(milestone_id);
CREATE INDEX IF NOT EXISTS idx_job_assignments_subcontractor ON job_assignments(subcontractor_id);
CREATE INDEX IF NOT EXISTS idx_job_assignment_updates_job    ON job_assignment_updates(job_assignment_id);
`;

await client.connect();
try {
  await client.query(SQL);
  console.log('Sub-contractor job assignment schema migrated successfully.');
} finally {
  await client.end();
}
