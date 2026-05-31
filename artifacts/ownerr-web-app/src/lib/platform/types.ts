import type { AuthProduct } from "@/lib/auth/routes";
import type { AuthRole, DeskUser } from "@/lib/auth/types";

export type PlatformLayer = "public" | "auth" | "protected";

/** Product app boundary (not every marketing page). */
export type ProductApp =
  | "platform"
  | "marketplace"
  | "ownerr-os"
  | "ownerr-network";

/** How Supabase credentials are applied after auth UI submit. */
export type AuthCredentialProfile = "ownerr-network" | "desk";

export type RouteAccessRule = {
  prefix: string;
  layer: PlatformLayer;
  productApp: ProductApp;
  publicAccess: boolean;
  authRequired: boolean;
  authProduct: AuthProduct | null;
  credentialProfile: AuthCredentialProfile | null;
  postLoginDefault: string;
  signupDefaultRole: AuthRole | null;
};

export type AuthActionIntent =
  | "bid"
  | "contact_founder"
  | "create_listing"
  | "express_interest"
  | "save_startup"
  | "add_startup"
  | "open_desk"
  | "open_ownerr_network_app";

export type StoredAuthIntent = {
  action: AuthActionIntent;
  returnPath: string;
  createdAt: number;
};

export type AuthGateInput = {
  pathname: string;
  action?: AuthActionIntent;
  isAuthenticated: boolean;
  hasDeskUser: boolean;
  deskRole?: AuthRole | null;
};

export type AuthGateResult =
  | { allowed: true }
  | {
      allowed: false;
      loginHref: string;
      registerHref: string;
      reason: "session" | "desk_role";
    };

export type PostAuthResolveInput = {
  redirectParam: string | null;
  pathname: string;
  product: AuthProduct | null;
  currentUser: DeskUser | null;
  hasSession: boolean;
  hasOwnerrNetworkProfile?: boolean;
  pendingIntent: StoredAuthIntent | null;
  /** When true, skip product desks and resolve to `/admin`. */
  platformAdmin?: boolean;
};
