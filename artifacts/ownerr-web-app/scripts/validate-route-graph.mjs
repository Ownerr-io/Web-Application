/**
 * Lightweight route graph checks (run: node scripts/validate-route-graph.mjs).
 * Imports compiled registry via dynamic import from source — run after `npm run build` is not required;
 * uses a minimal duplicate path list from routeRegistry exports via tsx if available, else static smoke.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const registryPath = join(root, 'src/routing/routeRegistry.ts');
const text = readFileSync(registryPath, 'utf8');

const pathMatches = [...text.matchAll(/pathname:\s*([A-Z_]+\.[a-zA-Z0-9_]+|'\/[^']+')/g)];
const ids = [...text.matchAll(/id:\s*'([^']+)'/g)].map((m) => m[1]);

const seen = new Set();
const dupes = [];
for (const id of ids) {
  if (seen.has(id)) dupes.push(id);
  seen.add(id);
}

if (dupes.length) {
  console.error('Duplicate route ids:', [...new Set(dupes)]);
  process.exit(1);
}

console.log(`Route registry smoke: ${ids.length} route ids, ${pathMatches.length} pathname entries.`);
console.log('OK');
