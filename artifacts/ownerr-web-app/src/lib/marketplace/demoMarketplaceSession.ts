import type { AuthRole } from "@/lib/auth/types";
import {
  isDemoAccountEmail,
  showDemoAccountHints,
} from "@/lib/demo/demoAccountCatalog";

/** Demo marketplace desks use DB auth only — no env credential shortcuts. */
export function canUseDemoMarketplaceDesk(): boolean {
  return showDemoAccountHints();
}

/** @deprecated Use normal sign-in with seeded Supabase users. */
export function demoCredentialsForDeskRole(_role: AuthRole): null {
  return null;
}

export { isDemoAccountEmail };
