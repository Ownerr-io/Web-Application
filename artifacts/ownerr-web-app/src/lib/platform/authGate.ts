import {
  authLoginHrefForApp,
  authRegisterHrefForApp,
} from "@/lib/auth/authLogin";
import { captureProductIntentFromPath } from "@/lib/auth/productLock";
import {
  matchRouteRule,
  normalizePathname,
} from "@/lib/platform/routeRegistry";
import { persistAuthIntent } from "@/lib/platform/authIntent";
import type {
  AuthActionIntent,
  AuthGateInput,
  AuthGateResult,
} from "@/lib/platform/types";

const DESK_ACTIONS = new Set<AuthActionIntent>([
  "bid",
  "contact_founder",
  "create_listing",
  "save_startup",
  "add_startup",
  "open_desk",
]);

export function evaluateAuthGate(input: AuthGateInput): AuthGateResult {
  const pathname = normalizePathname(input.pathname);
  const rule = matchRouteRule(pathname);
  const slug = captureProductIntentFromPath(pathname);

  if (input.action && DESK_ACTIONS.has(input.action)) {
    if (!input.isAuthenticated || !input.hasDeskUser) {
      if (!slug) {
        return {
          allowed: false,
          reason: "session",
          loginHref: "/products",
          registerHref: "/products",
        };
      }
      return {
        allowed: false,
        reason: "desk_role",
        loginHref: authLoginHrefForApp(slug),
        registerHref: authRegisterHrefForApp(slug),
      };
    }
    return { allowed: true };
  }

  if (input.action === "open_ownerr_network_app") {
    if (!input.isAuthenticated) {
      return {
        allowed: false,
        reason: "session",
        loginHref: authLoginHrefForApp("ownerr_network"),
        registerHref: authRegisterHrefForApp("ownerr_network"),
      };
    }
    return { allowed: true };
  }

  if (rule.authRequired && !input.isAuthenticated) {
    if (!slug) {
      return {
        allowed: false,
        reason: "session",
        loginHref: "/products",
        registerHref: "/products",
      };
    }
    return {
      allowed: false,
      reason: "session",
      loginHref: authLoginHrefForApp(slug),
      registerHref: authRegisterHrefForApp(slug),
    };
  }

  return { allowed: true };
}

export function challengeAuthForAction(
  pathname: string,
  action: AuthActionIntent,
): AuthGateResult {
  return evaluateAuthGate({
    pathname,
    action,
    isAuthenticated: false,
    hasDeskUser: false,
  });
}

export function storeActionAndGetLoginHref(
  pathname: string,
  action: AuthActionIntent,
): string {
  persistAuthIntent({ action, returnPath: pathname });
  const challenged = challengeAuthForAction(pathname, action);
  if (!challenged.allowed) return challenged.loginHref;
  const slug = captureProductIntentFromPath(pathname);
  if (slug) return authLoginHrefForApp(slug);
  return "/products";
}
