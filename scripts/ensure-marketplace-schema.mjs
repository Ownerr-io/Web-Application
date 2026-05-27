#!/usr/bin/env node
/**
 * Ensures marketplace tables + catalog exist on the linked Supabase DB.
 * Safe for production: only runs full catalog seed when `startups` is missing or empty.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { config } from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const migrationsDir = path.join(repoRoot, 'supabase', 'migrations');

const MARKETPLACE_FILES = [
  '20260601120000_marketplace_core_schema.sql',
  '20260601120100_marketplace_seed_data.sql',
  '20260602120000_marketplace_hardening.sql',
];

config({ path: path.join(repoRoot, '.env.local') });
config({ path: path.join(repoRoot, '.env') });

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL missing in .env.local');
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: url,
  ssl: url.includes('supabase.co') ? { rejectUnauthorized: false } : undefined,
});

async function tableExists(name) {
  const { rows } = await pool.query(
    `select 1 from information_schema.tables where table_schema = 'public' and table_name = $1`,
    [name],
  );
  return rows.length > 0;
}

async function startupCount() {
  const { rows } = await pool.query(`select count(*)::int as c from public.startups`);
  return rows[0]?.c ?? 0;
}

async function applyFile(file) {
  const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
  console.log(`Applying ${file}…`);
  await pool.query(sql);
  console.log('  OK');
}

async function main() {
  const hasStartups = await tableExists('startups');

  if (!hasStartups) {
    console.log('Marketplace schema not found — applying core + catalog + hardening.');
    await applyFile(MARKETPLACE_FILES[0]);
    await applyFile(MARKETPLACE_FILES[1]);
    await applyFile(MARKETPLACE_FILES[2]);
  } else {
    const count = await startupCount();
    console.log(`Marketplace startups table exists (${count} rows).`);
    if (count === 0) {
      console.log('Catalog empty — applying marketplace seed data + hardening.');
      await applyFile(MARKETPLACE_FILES[1]);
      await applyFile(MARKETPLACE_FILES[2]);
    } else {
      console.log('Applying hardening migration only (idempotent).');
      try {
        await applyFile(MARKETPLACE_FILES[2]);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes('already exists') || msg.includes('duplicate')) {
          console.log('  (hardening partially applied — continuing)');
        } else {
          throw err;
        }
      }
    }
  }

  const finalCount = await startupCount();
  if (finalCount === 0) {
    console.error('No startups in database after setup. Check migrations.');
    process.exit(1);
  }
  console.log(`Marketplace ready (${finalCount} startups).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => pool.end());
