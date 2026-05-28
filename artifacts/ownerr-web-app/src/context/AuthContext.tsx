import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useLocation } from "wouter";
import type { AppSlug } from "@workspace/api-zod";
import type { Session, User } from "@supabase/supabase-js";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  captureProductIntentFromPath,
  clearActiveProduct,
} from "@/lib/auth/productLock";
import { productAuthPath } from "@/lib/auth/productAuthRoutes";
import type { DeskUser } from "@/lib/auth/types";
import { mapDeskUserFromSupabase } from "@/lib/auth/mapDeskUser";
import { buildAuthStartRedirect } from "@/routing/authResolver";

type AuthContextValue = {
  configured: boolean;
  loading: boolean;
  session: Session | null;
  authUser: User | null;
  /** Desk role derived from Supabase user metadata (no provisioning). */
  currentUser: DeskUser | null;
  isAuthenticated: boolean;
  isBuyer: boolean;
  isFounder: boolean;
  logout: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (
    email: string,
    password: string,
    name: string,
    metadata?: Record<string, unknown>,
  ) => Promise<void>;
  signInWithGoogle: (redirectTo: string) => Promise<void>;
  resetPasswordForEmail: (email: string) => Promise<void>;
  /** Navigate to product login or `/products` when product is unknown. */
  requestLogin: (options?: { app?: AppSlug }) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const configured = isSupabaseConfigured();
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(configured);
  const [session, setSession] = useState<Session | null>(null);

  const currentUser = useMemo(
    () => mapDeskUserFromSupabase(session?.user ?? null),
    [session],
  );

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }
    const supabase = getSupabase();
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      if (!next) clearActiveProduct();
    });
    return () => sub.subscription.unsubscribe();
  }, [configured]);

  const requireConfigured = useCallback(() => {
    if (!configured) {
      throw new Error(
        "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.",
      );
    }
  }, [configured]);

  const requestLogin = useCallback(
    (options?: { app?: AppSlug }) => {
      const slug =
        options?.app ??
        captureProductIntentFromPath(
          typeof window !== "undefined" ? window.location.pathname : "/",
        );
      if (slug) setLocation(productAuthPath(slug, "login"));
      else setLocation(buildAuthStartRedirect());
    },
    [setLocation],
  );

  const logout = useCallback(async () => {
    if (!configured) return;
    const supabase = getSupabase();
    await supabase.auth.signOut();
    clearActiveProduct();
  }, [configured]);

  const signInWithEmail = useCallback(
    async (email: string, password: string) => {
      requireConfigured();
      const supabase = getSupabase();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
    },
    [requireConfigured],
  );

  const signUpWithEmail = useCallback(
    async (
      email: string,
      password: string,
      name: string,
      metadata?: Record<string, unknown>,
    ) => {
      requireConfigured();
      const supabase = getSupabase();
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            ...metadata,
          },
        },
      });
      if (error) throw error;
    },
    [requireConfigured],
  );

  const signInWithGoogle = useCallback(
    async (redirectTo: string) => {
      requireConfigured();
      const supabase = getSupabase();
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          queryParams: {
            prompt: "select_account",
          },
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.location.assign(data.url);
        return;
      }

      throw new Error(
        "Google sign-in did not return a redirect URL. Enable the Google provider in Supabase (Authentication → Providers) and add this redirect URL to the allow list.",
      );
    },
    [requireConfigured],
  );

  const resetPasswordForEmail = useCallback(
    async (email: string) => {
      requireConfigured();
      const supabase = getSupabase();
      const base = import.meta.env.BASE_URL.replace(/\/$/, "");
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}${base}/products`,
      });
      if (error) throw error;
    },
    [requireConfigured],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      configured,
      loading,
      session,
      authUser: session?.user ?? null,
      currentUser,
      isAuthenticated: Boolean(session),
      isBuyer: currentUser?.role === "buyer",
      isFounder: currentUser?.role === "founder",
      logout,
      signInWithEmail,
      signUpWithEmail,
      signInWithGoogle,
      resetPasswordForEmail,
      requestLogin,
    }),
    [
      configured,
      loading,
      session,
      currentUser,
      requestLogin,
      logout,
      signInWithEmail,
      signUpWithEmail,
      signInWithGoogle,
      resetPasswordForEmail,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
