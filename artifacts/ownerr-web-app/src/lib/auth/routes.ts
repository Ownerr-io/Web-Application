import type { AppSlug } from "@workspace/api-zod";
import { productAuthPath } from "@/lib/auth/productAuthRoutes";
import { PUBLIC_ROUTES } from "@/routing/routeRegistry";

/** @deprecated Use product-scoped paths via `productAuthPath`. */
export const authRoutes = {
  login: "/products",
  register: "/products",
  forgotPassword: "/products",
  callback: "/products",
} as const;

export type AuthProduct = "ownerr-os" | "ownerr-network";

export type AuthHrefOptions = {
  redirect?: string;
  product?: AuthProduct;
  app?: AppSlug;
};

export function authLoginHref(options?: AuthHrefOptions): string {
  if (options?.app) return productAuthPath(options.app, "login");
  return PUBLIC_ROUTES.products;
}

export function authRegisterHref(options?: AuthHrefOptions): string {
  if (options?.app) return productAuthPath(options.app, "register");
  return PUBLIC_ROUTES.products;
}

export function authForgotPasswordHref(options?: AuthHrefOptions): string {
  if (options?.app) return productAuthPath(options.app, "forgot-password");
  return PUBLIC_ROUTES.products;
}

export function authCallbackHref(options?: AuthHrefOptions): string {
  if (options?.app) return productAuthPath(options.app, "callback");
  return PUBLIC_ROUTES.products;
}

export function authAbsoluteUrl(pathWithQuery: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  const path = pathWithQuery.startsWith("/")
    ? pathWithQuery
    : `/${pathWithQuery}`;
  return `${window.location.origin}${base}${path}`;
}
