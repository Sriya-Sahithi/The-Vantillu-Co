import { Pool, types } from "pg";
import { env } from "@/lib/server/env";

/* eslint-disable @typescript-eslint/no-explicit-any */
export type Row = Record<string, any>;
/* eslint-enable @typescript-eslint/no-explicit-any */

export interface Queryable {
  query<T extends Row = Row>(text: string, params?: unknown[]): Promise<{ rows: T[]; rowCount: number }>;
}
export interface Db extends Queryable {
  tx<T>(fn: (q: Queryable) => Promise<T>): Promise<T>;
}

// int8 (counts, identity ids) fit comfortably in a JS number for this application.
types.setTypeParser(20, (value) => Number(value));

type Globals = typeof globalThis & { __vantilluPool?: Pool; __vantilluDbOverride?: Db };
const g = globalThis as Globals;

function createPool(): Pool {
  const connectionString = env.databaseUrl;
  if (!connectionString) throw new Error("DATABASE_URL is not configured.");
  const ca = env.databaseCaCert?.replace(/\\n/g, "\n");
  return new Pool({
    connectionString,
    max: env.databasePoolMax,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 8_000,
    statement_timeout: 15_000,
    ...(ca ? { ssl: { ca, rejectUnauthorized: true } } : {}),
  });
}

function pgDb(): Db {
  const pool = (g.__vantilluPool ??= createPool());
  return {
    async query(text, params) {
      const result = await pool.query(text, params as unknown[]);
      return { rows: result.rows, rowCount: result.rowCount ?? 0 };
    },
    async tx(fn) {
      const client = await pool.connect();
      try {
        await client.query("begin");
        const result = await fn({
          async query(text, params) {
            const r = await client.query(text, params as unknown[]);
            return { rows: r.rows, rowCount: r.rowCount ?? 0 };
          },
        });
        await client.query("commit");
        return result;
      } catch (error) {
        await client.query("rollback").catch(() => undefined);
        throw error;
      } finally {
        client.release();
      }
    },
  };
}

export function hasDatabase(): boolean {
  return Boolean(g.__vantilluDbOverride || env.databaseUrl);
}

export function getDb(): Db {
  return g.__vantilluDbOverride ?? pgDb();
}

/** Test hook: route all queries to an in-process database. */
export function setDbOverride(db: Db | undefined) {
  g.__vantilluDbOverride = db;
}
