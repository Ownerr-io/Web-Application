/** Shared demo marketplace identities (used by seed/reset scripts only). */

export const DEMO_BUYER = {
  email: 'demo-buyer@marketplace.app',
  password: 'DemoBuyer123!',
  metadata: {
    full_name: 'Demo Buyer',
    role: 'buyer',
  },
  profile: {
    desk_role: 'buyer',
    metadata: {
      display_name: 'Demo Buyer',
      full_name: 'Demo Buyer',
      company_name: 'Demo Acquisitions',
      verified: true,
    },
  },
  membershipRole: 'buyer',
};

export const DEMO_SELLER = {
  email: 'demo-seller@marketplace.app',
  password: 'DemoSeller123!',
  metadata: {
    full_name: 'Demo Founder',
    role: 'founder',
  },
  profile: {
    desk_role: 'seller',
    metadata: {
      display_name: 'Demo Founder',
      full_name: 'Demo Founder',
      company_name: 'Demo Ventures',
      verified: true,
    },
  },
  membershipRole: 'founder',
};

/** Startups assigned to demo seller (must exist in marketplace seed). */
export const DEMO_SELLER_STARTUP_SLUGS = ['stan', 'sorio-ai', 'rezi'];

export const DEMO_CONVERSATION_STARTUP_SLUG = 'sorio-ai';
