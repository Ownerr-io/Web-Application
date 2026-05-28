import type { AuthProduct } from "@/lib/auth/routes";
import type { AuthCredentialProfile } from "@/lib/platform/types";
import {
  matchRouteRule,
  normalizePathname,
} from "@/lib/platform/routeRegistry";
import {
  parseAuthProductQuery,
  sanitizeRedirectParam,
} from "@/lib/platform/authRedirectMachine";
import { appSlugToAuthProduct } from "@/lib/auth/productLock";
import { parseAppSlugParam } from "@/lib/auth/productLock";

export type AuthUiMetadata = {
  product: AuthProduct | null;
  credentialProfile: AuthCredentialProfile | null;
  showWorkspaceRole: boolean;
  postLoginDefault: string;
};

export function resolveAuthUiMetadata(input: {
  redirectParam: string | null;
  productQuery: string | null;
  appQuery?: string | null;
}): AuthUiMetadata {
  const appSlug = parseAppSlugParam(input.appQuery ?? null);
  const product =
    parseAuthProductQuery(input.productQuery) ??
    (appSlug ? appSlugToAuthProduct(appSlug) : null);
  const redirectPath = sanitizeRedirectParam(input.redirectParam);
  const rule = matchRouteRule(redirectPath ?? "/");

  const resolvedProduct = product ?? rule.authProduct;
  const credentialProfile: AuthCredentialProfile | null =
    resolvedProduct === "ownerr-network"
      ? "ownerr-network"
      : resolvedProduct === "ownerr-os" || rule.credentialProfile === "desk"
        ? "desk"
        : rule.credentialProfile;

  return {
    product: resolvedProduct,
    credentialProfile,
    showWorkspaceRole: credentialProfile === "desk",
    postLoginDefault: rule.postLoginDefault,
  };
}

export function normalizeAuthReturnPath(pathname: string): string {
  return normalizePathname(pathname);
}
