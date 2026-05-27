#!/usr/bin/env node
/**
 * Idempotent seed: Supabase Auth demo users + marketplace_profiles + sample transactions.
 * Requires SUPABASE_SERVICE_ROLE_KEY (never use in the frontend).
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import { createAdminClient, seedDemoUsersFull } from './demo-marketplace-lib.mjs';
import { DEMO_BUYER, DEMO_SELLER } from './demo-marketplace.constants.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../..');
config({ path: path.join(repoRoot, '.env.local') });
config({ path: path.join(repoRoot, '.env') });

async function main() {
  const admin = createAdminClient();
  const { error: probe } = await admin.from('startups').select('id', { head: true, count: 'exact' });
  if (probe?.code === 'PGRST205' || probe?.message?.includes('startups')) {
    console.error(
      '\nMarketplace tables are missing on this Supabase project.\n' +
        'Run first:  npm run marketplace:ensure-schema\n' +
        'Or full:    npm run marketplace:setup-production\n',
    );
    process.exit(1);
  }
  const { buyerUser, sellerUser } = await seedDemoUsersFull(admin);
  console.log('\nDemo marketplace seed complete.');
  console.log(`  Buyer:  ${DEMO_BUYER.email} → ${buyerUser.id}`);
  console.log(`  Seller: ${DEMO_SELLER.email} → ${sellerUser.id}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
