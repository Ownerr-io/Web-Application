#!/usr/bin/env node
/**
 * Clears demo transactional data and re-seeds sample bids/interests/messages.
 * Auth users and profiles are preserved (upserted).
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import {
  clearDemoTransactionalData,
  createAdminClient,
  ensureAuthUser,
  linkSellerStartups,
  resolveDemoStartupSlugs,
  seedDemoTransactionalData,
  upsertAppAccess,
  upsertMarketplaceProfile,
  upsertPlatformUser,
} from './demo-marketplace-lib.mjs';
import { DEMO_BUYER, DEMO_SELLER } from './demo-marketplace.constants.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../..');
config({ path: path.join(repoRoot, '.env.local') });
config({ path: path.join(repoRoot, '.env') });

async function main() {
  const admin = createAdminClient();
  const { sellerSlugs, conversationSlug } = await resolveDemoStartupSlugs(admin);
  const buyerUser = await ensureAuthUser(admin, DEMO_BUYER);
  const sellerUser = await ensureAuthUser(admin, DEMO_SELLER);

  await upsertPlatformUser(
    admin,
    buyerUser.id,
    DEMO_BUYER.email,
    DEMO_BUYER.metadata.full_name,
  );
  await upsertPlatformUser(
    admin,
    sellerUser.id,
    DEMO_SELLER.email,
    DEMO_SELLER.metadata.full_name,
  );

  const buyerProfileId = await upsertMarketplaceProfile(admin, buyerUser.id, DEMO_BUYER);
  const sellerProfileId = await upsertMarketplaceProfile(admin, sellerUser.id, DEMO_SELLER);
  await upsertAppAccess(admin, buyerUser.id, DEMO_BUYER.membershipRole, buyerProfileId);
  await upsertAppAccess(admin, sellerUser.id, DEMO_SELLER.membershipRole, sellerProfileId);

  await linkSellerStartups(admin, sellerUser.id, sellerProfileId, sellerSlugs);
  await clearDemoTransactionalData(admin, buyerProfileId, sellerProfileId);
  await seedDemoTransactionalData(
    admin,
    buyerProfileId,
    sellerProfileId,
    buyerUser.id,
    sellerUser.id,
    { sellerSlugs, conversationSlug },
  );

  console.log('Demo marketplace state reset.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
