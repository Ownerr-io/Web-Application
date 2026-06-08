import type { AppSlug } from "@workspace/api-zod";
import { buildAuthStartRedirect } from "@/routing/authResolver";
import { MARKETPLACE_ROUTES } from "@/routing/routeRegistry";
import type { AuthRole } from "@/lib/auth/types";
import {
  provisionBuyerForUser,
  provisionSellerForUser,
} from "@/lib/marketplace/service";
import type { User } from "@supabase/supabase-js";

export type MarketplaceAction =
  | "bid"
  | "interest"
  | "buy"
  | "offer"
  | "list_startup"
  | "verify"
  | "accept_offer";

export type RoleGateResult =
  | { ok: true }
  | {
      ok: false;
      redirect: string;
      reason: "auth" | "wrong_role" | "switch_workspace";
    };

export function marketplaceAuthStartUrl(options: {
  role?: "buyer" | "seller";
  returnTo?: string;
}): string {
  const base = buildAuthStartRedirect(options.returnTo);
  const url = new URL(base, "http://local");
  url.searchParams.set("intent", "marketplace");
  if (options.role) url.searchParams.set("role", options.role);
  return `${url.pathname}${url.search}`;
}

export async function gateMarketplaceAction(input: {
  action: MarketplaceAction;
  session: boolean;
  authUser: User | null;
  deskRole: AuthRole | null;
  returnTo: string;
}): Promise<RoleGateResult> {
  const buyerActions: MarketplaceAction[] = ["bid", "interest", "buy", "offer"];
  const sellerActions: MarketplaceAction[] = [
    "list_startup",
    "verify",
    "accept_offer",
  ];

  if (!input.session || !input.authUser) {
    const role = buyerActions.includes(input.action) ? "buyer" : "seller";
    return {
      ok: false,
      redirect: marketplaceAuthStartUrl({ role, returnTo: input.returnTo }),
      reason: "auth",
    };
  }

  if (buyerActions.includes(input.action)) {
    await provisionBuyerForUser(input.authUser);
    return { ok: true };
  }

  if (sellerActions.includes(input.action)) {
    await provisionSellerForUser(input.authUser);
    return { ok: true };
  }

  return { ok: true };
}

export function resolveMarketplaceAppEntry(input: {
  hasBuyer: boolean;
  hasSeller: boolean;
  metadataRole: AuthRole | null;
}): string {
  if (input.hasBuyer && !input.hasSeller)
    return MARKETPLACE_ROUTES.buyerDashboard;
  if (input.hasSeller && !input.hasBuyer)
    return MARKETPLACE_ROUTES.sellerDashboard;
  if (input.metadataRole === "buyer") return MARKETPLACE_ROUTES.buyerDashboard;
  if (input.metadataRole === "founder")
    return MARKETPLACE_ROUTES.sellerDashboard;
  return MARKETPLACE_ROUTES.app;
}

export const MARKETPLACE_PRODUCT: AppSlug = "marketplace";
