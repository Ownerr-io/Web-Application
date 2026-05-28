import { useCallback } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import {
  evaluateAuthGate,
  storeActionAndGetLoginHref,
} from "@/lib/platform/authGate";
import type { AuthActionIntent } from "@/lib/platform/types";
import { authLoginHrefForApp } from "@/lib/auth/authLogin";
import { captureProductIntentFromPath } from "@/lib/auth/productLock";

export type RequireAuthOptions = {
  action: AuthActionIntent;
  onAllowed: () => void;
  fallbackPath?: string;
};

export function useRequireAuth() {
  const [location, setLocation] = useLocation();
  const { isAuthenticated, currentUser, requestLogin } = useAuth();

  const requireAuth = useCallback(
    ({ action, onAllowed, fallbackPath }: RequireAuthOptions) => {
      const pathname = fallbackPath ?? location;
      const gate = evaluateAuthGate({
        pathname,
        action,
        isAuthenticated,
        hasDeskUser: Boolean(currentUser),
        deskRole: currentUser?.role ?? null,
      });

      if (gate.allowed) {
        onAllowed();
        return true;
      }

      const href = storeActionAndGetLoginHref(pathname, action);
      setLocation(href);
      return false;
    },
    [location, isAuthenticated, currentUser, setLocation],
  );

  const requireSession = useCallback(
    (onAllowed: () => void, opts?: { productPath?: string }) => {
      if (isAuthenticated) {
        onAllowed();
        return true;
      }
      const path = opts?.productPath ?? location;
      const slug = captureProductIntentFromPath(path);
      if (slug) {
        setLocation(authLoginHrefForApp(slug));
        return false;
      }
      requestLogin();
      return false;
    },
    [isAuthenticated, requestLogin, location, setLocation],
  );

  return { requireAuth, requireSession };
}
