-- SolarPanel Postgres schema (Neon)
-- Translated from the live SQLite schema (g:\SolarPanel\solarpanel.db).
-- Apply once against a fresh Neon database:
--   psql "$DATABASE_URL" -f frontend/db/schema.sql

CREATE TABLE blogs (
    id               SERIAL PRIMARY KEY,
    title            TEXT NOT NULL,
    slug             TEXT UNIQUE NOT NULL,
    excerpt          TEXT,
    content          TEXT NOT NULL,
    cover_image      TEXT,
    author           TEXT DEFAULT 'ทีมงาน Solar Panel Thailand',
    category         TEXT DEFAULT 'ทั่วไป',
    tags             TEXT,
    status           TEXT DEFAULT 'active',
    meta_title       TEXT,
    meta_description TEXT,
    published_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    featured         INTEGER DEFAULT 0
);

CREATE TABLE contact_messages (
    id         SERIAL PRIMARY KEY,
    name       TEXT NOT NULL,
    email      TEXT NOT NULL,
    phone      TEXT,
    subject    TEXT,
    message    TEXT NOT NULL,
    status     TEXT DEFAULT 'new',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE installers (
    id                    SERIAL PRIMARY KEY,
    email                 TEXT NOT NULL,
    password_hash         TEXT NOT NULL,
    name                  TEXT NOT NULL,
    phone                 TEXT,
    location              TEXT,
    about                 TEXT,
    logo_url              TEXT,
    status                TEXT DEFAULT 'pending',
    role                  TEXT DEFAULT 'installer',
    created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    verified_at           TIMESTAMP,
    description           TEXT,
    experience            INTEGER DEFAULT 0,
    founded_year          INTEGER,
    rating                DOUBLE PRECISION DEFAULT 0,
    reviews_count         INTEGER DEFAULT 0,
    total_projects        INTEGER DEFAULT 0,
    total_kw              INTEGER DEFAULT 0,
    satisfaction_rate     INTEGER DEFAULT 0,
    line_id               TEXT,
    response_time         TEXT,
    warranty_panel        TEXT,
    warranty_inverter     TEXT,
    warranty_workmanship  TEXT,
    services              TEXT,
    certifications        TEXT,
    projects              TEXT,
    reviews_sample        TEXT,
    lat                   DOUBLE PRECISION,
    lng                   DOUBLE PRECISION,
    service_provinces     TEXT,
    profile_views         INTEGER DEFAULT 0,
    oauth_provider        TEXT,
    oauth_id              TEXT,
    is_featured           INTEGER DEFAULT 0,
    featured_from         TEXT,
    featured_until        TEXT,
    youtube_url           TEXT,
    tiktok_url            TEXT,
    facebook_url          TEXT,
    website_url           TEXT,
    card_image            TEXT,
    banner_image          TEXT,
    contact_email         TEXT,
    must_change_password  INTEGER DEFAULT 0,
    claimed_at            TIMESTAMP
);

CREATE TABLE leads (
    id           SERIAL PRIMARY KEY,
    name         TEXT NOT NULL,
    email        TEXT NOT NULL,
    phone        TEXT NOT NULL,
    province     TEXT NOT NULL,
    message      TEXT,
    installer_id INTEGER,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status       TEXT DEFAULT 'new',
    system_kw    DOUBLE PRECISION,
    calc_data    TEXT,
    calc_file    TEXT
);

CREATE TABLE oauth_providers (
    provider      TEXT PRIMARY KEY,
    client_id     TEXT NOT NULL DEFAULT '',
    client_secret TEXT NOT NULL DEFAULT '',
    active        INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE password_resets (
    id         SERIAL PRIMARY KEY,
    email      TEXT NOT NULL,
    token      TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used       INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE portfolio_photos (
    id           SERIAL PRIMARY KEY,
    installer_id INTEGER NOT NULL REFERENCES installers(id),
    photo_url    TEXT NOT NULL,
    caption      TEXT,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE reviews (
    id             SERIAL PRIMARY KEY,
    installer_id   INTEGER NOT NULL REFERENCES installers(id),
    reviewer_name  TEXT NOT NULL,
    reviewer_email TEXT NOT NULL,
    rating         INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    title          TEXT NOT NULL,
    body           TEXT NOT NULL,
    install_date   TEXT,
    reply          TEXT,
    reply_at       TIMESTAMP,
    status         TEXT DEFAULT 'pending',
    verify_token   TEXT,
    verified_at    TIMESTAMP,
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE site_content (
    key        TEXT PRIMARY KEY,
    value      TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────────────────────────────────────
-- Milestone Payment (installment / escrow) system — added round 1.
-- See scripts/migrate-milestone-payment.mjs for the idempotent migration
-- that applies this against the already-live Neon DB (this file stays the
-- from-scratch source of truth, applied via scripts/apply-schema.mjs on a
-- fresh database only).
-- ─────────────────────────────────────────────────────────────────────────

-- installers.line_user_id: prep for round 2 (LINE OA "add friend + verify code"
-- linking flow). Not written to by any round-1 code path yet.
ALTER TABLE installers ADD COLUMN line_user_id TEXT;

CREATE TABLE payment_projects (
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
    -- Round 2 prep — LINE OA linking, not wired up yet.
    customer_line_user_id     TEXT,
    installer_line_user_id    TEXT,
    customer_notify_channel   TEXT NOT NULL DEFAULT 'email' CHECK (customer_notify_channel IN ('email','line','both')),
    installer_notify_channel  TEXT NOT NULL DEFAULT 'email' CHECK (installer_notify_channel IN ('email','line','both')),
    created_at                TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at                TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE payment_milestones (
    id            SERIAL PRIMARY KEY,
    project_id    INTEGER NOT NULL REFERENCES payment_projects(id),
    seq           INTEGER NOT NULL,
    description   TEXT NOT NULL,
    amount        DOUBLE PRECISION NOT NULL,
    -- 6-state model from the design spec, plus 'refunded' (a 7th terminal
    -- state reached only via admin dispute force-refund — the spec's 6
    -- states are the primary badge/UI model, this is a superset addition).
    status        TEXT NOT NULL DEFAULT 'pending_payment'
                  CHECK (status IN ('pending_payment','paid_hold','in_progress','awaiting_confirmation','released','disputed','refunded')),
    due_date      TIMESTAMP,
    completed_at  TIMESTAMP,
    released_at   TIMESTAMP,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (project_id, seq)
);

CREATE TABLE payment_transactions (
    id                     SERIAL PRIMARY KEY,
    milestone_id           INTEGER NOT NULL REFERENCES payment_milestones(id),
    type                   TEXT NOT NULL CHECK (type IN ('hold','release','refund')),
    provider               TEXT NOT NULL DEFAULT 'mock',
    provider_reference_id  TEXT,
    amount                 DOUBLE PRECISION NOT NULL,
    status                 TEXT NOT NULL DEFAULT 'succeeded' CHECK (status IN ('succeeded','failed')),
    created_at             TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE payment_disputes (
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

CREATE INDEX idx_payment_projects_installer   ON payment_projects(installer_id);
CREATE INDEX idx_payment_projects_token       ON payment_projects(customer_token);
CREATE INDEX idx_payment_milestones_project   ON payment_milestones(project_id);
CREATE INDEX idx_payment_transactions_milestone ON payment_transactions(milestone_id);
CREATE INDEX idx_payment_disputes_milestone   ON payment_disputes(milestone_id);

-- ─────────────────────────────────────────────────────────────────────────
-- Milestone Payment round 2 additions — customer token-link pages, project
-- cancellation, real LINE Messaging API integration, notification dispatch.
-- See scripts/migrate-milestone-payment-round2.mjs for the idempotent
-- migration applied against the already-live Neon DB.
-- ─────────────────────────────────────────────────────────────────────────

-- Tracks whether cancellation was ever requested for this project, so
-- recomputeProjectStatus() can tell a genuinely-completed project apart from
-- one where every milestone happened to end up released/refunded/cancelled
-- as the *result* of a cancellation (which should read as 'cancelled', not
-- 'completed'). Additive column, defaults false for every existing row —
-- does not change status computation for any project that never requested
-- cancellation.
ALTER TABLE payment_projects ADD COLUMN cancel_requested INTEGER NOT NULL DEFAULT 0;

-- 'cancelled' is a new terminal milestone state: a pending_payment milestone
-- that was voided by project cancellation before any money moved (no
-- transaction row). Superset addition alongside round 1's 'refunded' —
-- existing states/transitions are unchanged.
ALTER TABLE payment_milestones DROP CONSTRAINT payment_milestones_status_check;
ALTER TABLE payment_milestones ADD CONSTRAINT payment_milestones_status_check
  CHECK (status IN ('pending_payment','paid_hold','in_progress','awaiting_confirmation','released','disputed','refunded','cancelled'));

-- Short-lived verification codes for the "add friend on LINE OA, then type
-- this code in chat" linking flow (customer or installer side). Consumed
-- (used_at set) by the webhook once matched to an incoming LINE user id.
CREATE TABLE line_link_codes (
    id           SERIAL PRIMARY KEY,
    code         TEXT NOT NULL,
    party        TEXT NOT NULL CHECK (party IN ('customer','installer')),
    project_id   INTEGER REFERENCES payment_projects(id),
    installer_id INTEGER REFERENCES installers(id),
    expires_at   TIMESTAMP NOT NULL,
    used_at      TIMESTAMP,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_line_link_codes_code ON line_link_codes(code);

-- ─────────────────────────────────────────────────────────────────────────
-- Sub-contractor Job Assignment — installers hire LINE-only sub-contractors
-- and split each milestone's work into 4 fixed job categories. Sub-contractors
-- never log into the dashboard; they report status/photos via LINE, reusing
-- the line_link_codes mechanism above with a new party='subcontractor' value
-- instead of a new auth system. They are paid off-platform — nothing here
-- touches payment_transactions/escrow; approve/reject is purely advisory
-- against the installer's own "mark milestone done" flow. Sub-contractor
-- identity (name/phone) is never exposed to any customer-facing API/page.
-- See scripts/migrate-subcontractor-job-assignment.mjs for the idempotent
-- migration applied against the already-live Neon DB.
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE subcontractors (
    id              SERIAL PRIMARY KEY,
    installer_id    INTEGER NOT NULL REFERENCES installers(id),
    name            TEXT NOT NULL,
    phone           TEXT,
    -- Freeform + fixed-category tags, cosmetic/non-restrictive (design decisions #3/#10) —
    -- never used to gate what this sub-contractor can be assigned to. Stored as a JSON
    -- array string, same convention as installers.service_provinces/services/certifications.
    specialty_tags  TEXT NOT NULL DEFAULT '[]',
    line_user_id    TEXT,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE job_assignments (
    id                        SERIAL PRIMARY KEY,
    milestone_id              INTEGER NOT NULL REFERENCES payment_milestones(id),
    category                  TEXT NOT NULL CHECK (category IN ('สำรวจ','ติดตั้งแผง','เดินสายไฟ','ล้างแผง')),
    subcontractor_id          INTEGER NOT NULL REFERENCES subcontractors(id),
    -- State machine: assigned -> in_progress -> submitted -> approved/rejected, with
    -- 'rejected' folded back into 'in_progress' immediately (per confirmed spec) — the reject
    -- endpoint writes status='in_progress' directly (rejected_reason/rejected_at record why),
    -- so 'rejected' is kept in this CHECK as a documented state but is never actually persisted.
    status                    TEXT NOT NULL DEFAULT 'assigned'
                              CHECK (status IN ('assigned','in_progress','submitted','approved','rejected')),
    submitted_note            TEXT,
    submitted_at              TIMESTAMP,
    rejected_reason           TEXT,
    rejected_at               TIMESTAMP,
    approved_at               TIMESTAMP,
    -- Reassignment (design decision #9) mutates this row in place — subcontractor_id changes,
    -- status resets to 'assigned' — rather than creating a new row, so job_assignment_updates
    -- history stays attached to one stable job_assignments.id. These two columns capture the
    -- most recent reassignment (if any), enough to render the "reassigned from X to Y" note;
    -- job_assignment_updates rows already logged keep their own subcontractor_id untouched.
    previous_subcontractor_id INTEGER REFERENCES subcontractors(id),
    reassigned_at             TIMESTAMP,
    created_at                TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at                TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (milestone_id, category)
);

CREATE TABLE job_assignment_updates (
    id                 SERIAL PRIMARY KEY,
    job_assignment_id  INTEGER NOT NULL REFERENCES job_assignments(id),
    -- Attributed to whichever sub-contractor was current when this was logged — stays correct
    -- across a reassignment without ever rewriting a past entry (design decision #9).
    subcontractor_id   INTEGER NOT NULL REFERENCES subcontractors(id),
    kind               TEXT NOT NULL DEFAULT 'text' CHECK (kind IN ('text','photo','system')),
    body               TEXT NOT NULL,
    created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sub-contractors link via the same "add friend, type code in chat" flow as customers/installers.
-- Widen the CHECK to a third party and add the FK it needs (existing customer/installer rows
-- are unaffected).
ALTER TABLE line_link_codes DROP CONSTRAINT line_link_codes_party_check;
ALTER TABLE line_link_codes ADD CONSTRAINT line_link_codes_party_check
  CHECK (party IN ('customer','installer','subcontractor'));
ALTER TABLE line_link_codes ADD COLUMN subcontractor_id INTEGER REFERENCES subcontractors(id);

CREATE INDEX idx_subcontractors_installer          ON subcontractors(installer_id);
CREATE INDEX idx_job_assignments_milestone         ON job_assignments(milestone_id);
CREATE INDEX idx_job_assignments_subcontractor     ON job_assignments(subcontractor_id);
CREATE INDEX idx_job_assignment_updates_job        ON job_assignment_updates(job_assignment_id);
