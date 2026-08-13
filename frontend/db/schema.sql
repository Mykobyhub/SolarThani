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
