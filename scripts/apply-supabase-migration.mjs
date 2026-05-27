/**
 * Applies SQL files in supabase/migrations/ using DATABASE_URL from repo root .env.local
 * Use when `supabase db push` is not linked or drizzle-kit cannot run.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { config } from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

config({ path: path.join(repoRoot, ".env.local") });
config({ path: path.join(repoRoot, ".env") });

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL missing. Set it in .env.local (Supabase → Database → URI).");
  process.exit(1);
}

const migrationsDir = path.join(repoRoot, "supabase", "migrations");
const files = fs
  .readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

if (files.length === 0) {
  console.error("No .sql files in supabase/migrations/");
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: url,
  ssl: url.includes("supabase.co") ? { rejectUnauthorized: false } : undefined,
});

try {
  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
    console.log(`Applying ${file}…`);
    await pool.query(sql);
    console.log(`  OK`);
  }
  console.log("All migrations applied.");
} catch (err) {
  console.error("Migration failed:", err instanceof Error ? err.message : err);
  process.exit(1);
} finally {
  await pool.end();
}
