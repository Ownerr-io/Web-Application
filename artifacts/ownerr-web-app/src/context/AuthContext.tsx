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
import { fetchPlatformAdminFromDb } from "@/lib/auth/platformAdmin";
import { authAbsoluteUrl } from "@/lib/auth/routes";
import { normalizeAuthEmail } from "@/lib/auth/validation";
import { mapSupabaseAuthError } from "@/lib/auth/authErrors";
import type { ReauthSendResult } from "@/lib/auth/reauthenticate";
import {
  sendReauthenticationOtp,
  updatePasswordWithReauthNonce,
  confirmReauthenticationNonce,
} from "@/lib/auth/reauthenticate";

type MagicLinkOptions = {
  emailRedirectTo: string;
  shouldCreateUser?: boolean;
  metadata?: Record<string, unknown>;
};

type AuthContextValue = {
  configured: boolean;
  loading: boolean;
  /** False until platform admin status has been loaded for the current session. */
  platformAdminReady: boolean;
  /** From `public.users.role` via `is_platform_admin` RPC. */
  isPlatformAdmin: boolean;
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
  /** Magic link email (Supabase signInWithOtp + emailRedirectTo). */
  signInWithMagicLink: (
    email: string,
    options: MagicLinkOptions,
  ) => Promise<void>;
  resetPasswordForEmail: (email: string, redirectTo?: string) => Promise<void>;
  updatePassword: (
    newPassword: string,
    reauth?: { nonce: string },
  ) => Promise<void>;
  /** Sends reauthentication OTP email (logged-in user). */
  sendReauthenticationOtp: (options?: {
    force?: boolean;
  }) => Promise<ReauthSendResult>;
  /** Confirms reauth OTP via updateUser({ nonce }) — not verifyOtp. */
  confirmReauthenticationNonce: (nonce: string) => Promise<void>;
  resendSignupVerification: (email: string) => Promise<void>;
  formatAuthError: (error: unknown) => string;
  /** Navigate to product login or `/products` when product is unknown. */
  requestLogin: (options?: { app?: AppSlug }) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const configured = isSupabaseConfigured();
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(configured);
  const [session, setSession] = useState<Session | null>(null);
  const [platformAdminReady, setPlatformAdminReady] = useState(!configured);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);

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

  useEffect(() => {
    if (!configured) {
      setIsPlatformAdmin(false);
      setPlatformAdminReady(true);
      return;
    }
    if (!session?.user?.id) {
      setIsPlatformAdmin(false);
      setPlatformAdminReady(true);
      return;
    }

    let cancelled = false;
    setPlatformAdminReady(false);
    void fetchPlatformAdminFromDb().then((admin) => {
      if (cancelled) return;
      setIsPlatformAdmin(admin);
      setPlatformAdminReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [configured, session?.user?.id]);

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
      const normalized = normalizeAuthEmail(email);
      const { error } = await supabase.auth.signInWithPassword({
        email: normalized,
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
      const normalized = normalizeAuthEmail(email);
      const { error } = await supabase.auth.signUp({
        email: normalized,
        password,
        options: {
          emailRedirectTo: authAbsoluteUrl("/auth/confirm"),
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

  const signInWithMagicLink = useCallback(
    async (email: string, options: MagicLinkOptions) => {
      requireConfigured();
      const supabase = getSupabase();
      const normalized = normalizeAuthEmail(email);
      const { error } = await supabase.auth.signInWithOtp({
        email: normalized,
        options: {
          shouldCreateUser: options.shouldCreateUser ?? false,
          emailRedirectTo: options.emailRedirectTo,
          data: options.metadata,
        },
      });
      if (error) throw error;
    },
    [requireConfigured],
  );

  const resetPasswordForEmail = useCallback(
    async (email: string, redirectTo?: string) => {
      requireConfigured();
      const supabase = getSupabase();
      const normalized = normalizeAuthEmail(email);
      const destination =
        redirectTo ??
        authAbsoluteUrl(
          `/auth/reset-password${typeof window !== "undefined" ? window.location.search : ""}`,
        );
      const { error } = await supabase.auth.resetPasswordForEmail(normalized, {
        redirectTo: destination,
      });
      if (error) throw error;
    },
    [requireConfigured],
  );

  const updatePassword = useCallback(
    async (newPassword: string, reauth?: { nonce: string }) => {
      requireConfigured();
      if (reauth?.nonce) {
        await updatePasswordWithReauthNonce(newPassword, reauth.nonce);
        return;
      }
      const supabase = getSupabase();
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;
    },
    [requireConfigured],
  );

  const sendReauthenticationOtpFn = useCallback(
    async (options?: { force?: boolean }) => {
      requireConfigured();
      return sendReauthenticationOtp(options);
    },
    [requireConfigured],
  );

  const confirmReauthenticationNonceFn = useCallback(
    async (nonce: string) => {
      requireConfigured();
      await confirmReauthenticationNonce(nonce);
    },
    [requireConfigured],
  );

  const resendSignupVerification = useCallback(
    async (email: string) => {
      requireConfigured();
      const supabase = getSupabase();
      const normalized = normalizeAuthEmail(email);
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: normalized,
        options: {
          emailRedirectTo: authAbsoluteUrl("/auth/confirm"),
        },
      });
      if (error) throw error;
    },
    [requireConfigured],
  );

  const formatAuthError = useCallback(
    (error: unknown) => mapSupabaseAuthError(error),
    [],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      configured,
      loading,
      platformAdminReady,
      isPlatformAdmin,
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
      signInWithMagicLink,
      resetPasswordForEmail,
      updatePassword,
      sendReauthenticationOtp: sendReauthenticationOtpFn,
      confirmReauthenticationNonce: confirmReauthenticationNonceFn,
      resendSignupVerification,
      formatAuthError,
      requestLogin,
    }),
    [
      configured,
      loading,
      platformAdminReady,
      isPlatformAdmin,
      session,
      currentUser,
      requestLogin,
      logout,
      signInWithEmail,
      signUpWithEmail,
      signInWithGoogle,
      signInWithMagicLink,
      resetPasswordForEmail,
      updatePassword,
      sendReauthenticationOtpFn,
      confirmReauthenticationNonceFn,
      resendSignupVerification,
      formatAuthError,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
