import { Pool, types, type QueryResultRow } from 'pg';

// pg returns BIGINT (COUNT(*), SUM(integer_col)) as strings by default, since JS numbers
// can't safely hold all int8 values. This codebase's aggregates never approach that range
// and expect plain numbers (matching better-sqlite3's behavior) — parse as JS number instead.
types.setTypeParser(20, (val) => parseInt(val, 10));

declare global {
  // eslint-disable-next-line no-var
  var __pgPool: Pool | undefined;
}

const pool: Pool = global.__pgPool ?? (global.__pgPool = new Pool({ connectionString: process.env.DATABASE_URL }));

function toPositional(sql: string): string {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

// Mirrors better-sqlite3's db.prepare(sql).get/all/run(...params) call shape,
// but async (Postgres has no sync driver). Callers add `await`; TypeScript
// flags any call site that forgets it, since get()/all() no longer return T directly.
interface Statement<T extends QueryResultRow> {
  get(...params: unknown[]): Promise<T | undefined>;
  all(...params: unknown[]): Promise<T[]>;
  run(...params: unknown[]): Promise<{ changes: number }>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function prepare<T extends QueryResultRow = any>(sql: string): Statement<T> {
  const positionalSql = toPositional(sql);
  return {
    async get(...params: unknown[]) {
      const result = await pool.query<T>(positionalSql, params);
      return result.rows[0];
    },
    async all(...params: unknown[]) {
      const result = await pool.query<T>(positionalSql, params);
      return result.rows;
    },
    async run(...params: unknown[]) {
      const result = await pool.query(positionalSql, params);
      return { changes: result.rowCount ?? 0 };
    },
  };
}

export const db = { prepare };
