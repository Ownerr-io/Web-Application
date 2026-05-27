import type { User } from '@supabase/supabase-js';
import {
  ensureMarketplaceProfile,
  fetchMarketplaceProfilesForUser,
  getBuyerProfileId,
  getSellerProfileId,
  type MarketplaceProfileRow,
} from '@/lib/marketplace/profiles';

export type { MarketplaceProfileRow };

export async function ensureBuyerProfile(user: User): Promise<MarketplaceProfileRow> {
  const row = await ensureMarketplaceProfile(user, 'buyer');
  return row;
}

export async function ensureSellerProfile(user: User): Promise<MarketplaceProfileRow> {
  return ensureMarketplaceProfile(user, 'seller');
}

export {
  ensureMarketplaceProfile,
  fetchMarketplaceProfilesForUser,
  getBuyerProfileId,
  getSellerProfileId,
};
