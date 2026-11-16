// Applies migrations/*.sql in order, once each. Usage: DATABASE_URL=... npm run db:migrate
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}
const ca = process.env.DATABASE_CA_CERT?.replace(/\\n/g, "\n");
const client = new pg.Client({ connectionString: url, ...(ca ? { ssl: { ca, rejectUnauthorized: true } } : {}) });
await client.connect();
try {
  await client.query(`create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())`);
  const dir = join(process.cwd(), "migrations");
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    const done = await client.query(`select 1 from schema_migrations where name = $1`, [file]);
    if (done.rowCount) {
      console.log(`skip   ${file}`);
      continue;
    }
    await client.query("begin");
    try {
      await client.query(readFileSync(join(dir, file), "utf8"));
      await client.query(`insert into schema_migrations (name) values ($1)`, [file]);
      await client.query("commit");
      console.log(`apply  ${file}`);
    } catch (error) {
      await client.query("rollback");
      throw error;
    }
  }
  await client.query(`alter table schema_migrations enable row level security`);
} finally {
  await client.end();
}
