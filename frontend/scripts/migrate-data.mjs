// One-off data migration: g:\SolarPanel\solarpanel.db (SQLite) -> Neon (Postgres).
// Usage: DATABASE_URL=postgres://... node scripts/migrate-data.mjs
// Read-only against SQLite; safe to re-run against an empty Postgres DB (rerun after TRUNCATE if needed).

import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import pg from 'pg';

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SQLITE_PATH = path.join(__dirname, '..', '..', 'solarpanel.db');

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL env var is required (Neon pooled connection string).');
  process.exit(1);
}

// Insert order respects FK dependencies (installers before portfolio_photos/reviews).
const TABLES = [
  'blogs',
  'contact_messages',
  'installers',
  'leads',
  'oauth_providers',
  'password_resets',
  'portfolio_photos',
  'reviews',
  'site_content',
];

// Tables with a SERIAL id column whose sequence must be advanced past the migrated max id.
const SERIAL_TABLES = ['blogs', 'contact_messages', 'installers', 'leads', 'password_resets', 'portfolio_photos', 'reviews'];

async function main() {
  const sqlite = new Database(SQLITE_PATH, { readonly: true });
  const pool = new Pool({ connectionString: DATABASE_URL });

  let allOk = true;

  for (const table of TABLES) {
    const cols = sqlite.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name);
    const rows = sqlite.prepare(`SELECT * FROM ${table}`).all();

    if (rows.length > 0) {
      const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
      const insertSql = `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`;
      for (const row of rows) {
        const values = cols.map((c) => row[c]);
        await pool.query(insertSql, values);
      }
    }

    if (SERIAL_TABLES.includes(table)) {
      await pool.query(
        `SELECT setval(pg_get_serial_sequence('${table}', 'id'), COALESCE((SELECT MAX(id) FROM ${table}), 1))`
      );
    }

    const pgCount = await pool.query(`SELECT COUNT(*) AS c FROM ${table}`);
    const sqliteCount = rows.length;
    const pgCountNum = Number(pgCount.rows[0].c);
    const ok = pgCountNum === sqliteCount;
    allOk = allOk && ok;
    console.log(`${ok ? 'OK  ' : 'FAIL'} ${table}: sqlite=${sqliteCount} postgres=${pgCountNum}`);
  }

  await pool.end();
  sqlite.close();

  if (!allOk) {
    console.error('\nRow count mismatch detected — review above before proceeding.');
    process.exit(1);
  }
  console.log('\nAll row counts match.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
