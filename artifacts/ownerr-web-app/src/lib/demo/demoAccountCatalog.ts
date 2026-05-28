/**
 * Demo account emails created by `npm run marketplace:seed-demo` (Supabase Auth + DB).
 * Passwords live only in the seed script — never in Vite env or the client bundle.
 * Keep emails in sync with `scripts/demo-marketplace.constants.mjs`.
 */
export const DEMO_MARKETPLACE_BUYER_EMAIL = "demo-buyer@marketplace.app";
export const DEMO_MARKETPLACE_SELLER_EMAIL = "demo-seller@marketplace.app";

const ALL = [
  DEMO_MARKETPLACE_BUYER_EMAIL,
  DEMO_MARKETPLACE_SELLER_EMAIL,
] as const;

/** Optional UI hints in local/QA (does not supply credentials). */
export function showDemoAccountHints(): boolean {
  return import.meta.env.VITE_ENABLE_DEMO_USERS === "true";
}

export function isDemoAccountEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return ALL.some((e) => e.toLowerCase() === normalized);
}

export function demoAccountLabel(
  email: string | null | undefined,
): string | null {
  if (!email) return null;
  const n = email.trim().toLowerCase();
  if (n === DEMO_MARKETPLACE_BUYER_EMAIL.toLowerCase()) return "Demo Buyer";
  if (n === DEMO_MARKETPLACE_SELLER_EMAIL.toLowerCase()) return "Demo Seller";
  return null;
}
