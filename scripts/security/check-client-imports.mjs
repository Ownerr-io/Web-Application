#!/usr/bin/env node
/**
 * Fails if the browser bundle tree imports server-only API modules or service role env names.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..", "..");
const srcRoot = join(root, "artifacts/ownerr-web-app/src");

const forbiddenImportSubstrings = [
  "api/_lib/supabaseService",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SYNC_WORKER_CRON_SECRET",
];

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, files);
    else if (/\.(tsx?|jsx?)$/.test(name)) files.push(p);
  }
  return files;
}

const hits = [];
for (const file of walk(srcRoot)) {
  const text = readFileSync(file, "utf8");
  for (const needle of forbiddenImportSubstrings) {
    if (text.includes(needle)) {
      hits.push(`${file.replace(root + "/", "")}: contains "${needle}"`);
    }
  }
}

if (hits.length) {
  console.error("Client secret guard failed:\n" + hits.join("\n"));
  process.exit(1);
}

console.info("Client secret guard OK");
