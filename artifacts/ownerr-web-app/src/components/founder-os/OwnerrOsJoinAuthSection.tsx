import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { OwnerrOsPublicIdeaForm } from "@/components/founder-os/OwnerrOsPublicIdeaForm";
import { buildOwnerrOsGoogleRedirect } from "@/lib/auth/ownerrOsGoogleRedirect";
import { resolveProductAuthPath } from "@/lib/auth/productAuthRoutes";
import { syncOwnerrFounderRole } from "@/lib/auth/syncOwnerrFounderRole";
import { cn } from "@/lib/utils";

export type OwnerrOsJoinMode = "signin" | "register";

type Props = {
  referralCode?: string | null;
  initialMode?: OwnerrOsJoinMode;
};

function parseJoinMode(search: string): OwnerrOsJoinMode {
  const mode = new URLSearchParams(
    search.startsWith("?") ? search : `?${search}`,
  ).get("mode");
  return mode === "signin" ? "signin" : "register";
}

export function OwnerrOsJoinAuthSection({ referralCode, initialMode }: Props) {
  const [location, setLocation] = useLocation();
  const { configured, loading, session, signInWithEmail, signInWithGoogle } =
    useAuth();
  const { toast } = useToast();

  const [mode, setMode] = useState<OwnerrOsJoinMode>(
    () => initialMode ?? parseJoinMode(location.split("?")[1] ?? ""),
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setMode(parseJoinMode(location.split("?")[1] ?? ""));
  }, [location]);

  function setJoinMode(next: OwnerrOsJoinMode) {
    setMode(next);
    const [path, search = ""] = location.includes("?")
      ? location.split("?")
      : [location, ""];
    const params = new URLSearchParams(search);
    params.set("mode", next);
    const qs = params.toString();
    setLocation(qs ? `${path}?${qs}` : path, { replace: true });
  }

  async function onEmailSignIn(e: React.FormEvent) {
    e.preventDefault();
    if (!configured) {
      toast({
        title: "Sign-in unavailable",
        description: "Configure Supabase env vars to enable auth.",
        variant: "destructive",
      });
      return;
    }
    const trimmedEmail = email.trim();
    if (!trimmedEmail.includes("@")) {
      toast({ title: "Invalid email", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({
        title: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }
    setBusy(true);
    try {
      await signInWithEmail(trimmedEmail, password);
      await syncOwnerrFounderRole();
    } catch (err) {
      toast({
        title: "Sign-in failed",
        description:
          err instanceof Error ? err.message : "Check your email and password.",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }

  async function onGoogleSignIn() {
    if (session) return;
    setBusy(true);
    try {
      await signInWithGoogle(buildOwnerrOsGoogleRedirect());
    } catch (err) {
      toast({
        title: "Google sign-in failed",
        description: err instanceof Error ? err.message : "Try again.",
        variant: "destructive",
      });
      setBusy(false);
    }
  }

  return (
    <div className="w-full space-y-5">
      <div
        className="flex rounded-[10px] border border-[color:var(--terminal-border)]/80 bg-[color:var(--terminal-bg)]/60 p-1"
        role="tablist"
        aria-label="Join or sign in"
      >
        <button
          type="button"
          role="tab"
          aria-selected={mode === "signin"}
          className={cn(
            "flex-1 rounded-[8px] px-3 py-2.5 text-xs font-bold transition-colors sm:text-sm",
            mode === "signin"
              ? "bg-[color:var(--terminal-surface)] text-[color:var(--terminal-fg)] shadow-sm"
              : "text-[color:var(--terminal-muted)] hover:text-[color:var(--terminal-fg)]",
          )}
          onClick={() => setJoinMode("signin")}
        >
          I have an account
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "register"}
          className={cn(
            "flex-1 rounded-[8px] px-3 py-2.5 text-xs font-bold transition-colors sm:text-sm",
            mode === "register"
              ? "bg-[color:var(--terminal-surface)] text-[color:var(--terminal-fg)] shadow-sm"
              : "text-[color:var(--terminal-muted)] hover:text-[color:var(--terminal-fg)]",
          )}
          onClick={() => setJoinMode("register")}
        >
          New founder
        </button>
      </div>

      {mode === "signin" ? (
        <motion.div
          key="signin"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="saas-glass-card w-full space-y-5 rounded-[14px] border border-[color:var(--terminal-border)]/80 p-6 sm:p-8"
        >
          <div>
            <p className="text-sm font-bold text-[color:var(--terminal-fg)]">
              Welcome back
            </p>
            <p className="mt-1 text-xs text-[color:var(--terminal-muted)]">
              Sign in to open your dashboard — no need to re-enter your startup
              details.
            </p>
          </div>

          <form
            className="space-y-4"
            onSubmit={(e) => void onEmailSignIn(e)}
            noValidate
          >
            <div className="space-y-2">
              <Label htmlFor="ownerr-os-signin-email">Email</Label>
              <Input
                id="ownerr-os-signin-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border-[color:var(--terminal-border)] bg-[color:var(--terminal-bg)]"
                autoComplete="email"
                required
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="ownerr-os-signin-password">Password</Label>
                <Link
                  href={resolveProductAuthPath("ownerr_os", "forgot-password")}
                  className="text-xs font-semibold text-[color:var(--terminal-ochre)] hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="ownerr-os-signin-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="border-[color:var(--terminal-border)] bg-[color:var(--terminal-bg)]"
                autoComplete="current-password"
                minLength={6}
                required
              />
            </div>
            <Button
              type="submit"
              disabled={busy || loading}
              className="btn-platform-gradient h-11 w-full font-bold"
            >
              {busy ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <Button
            type="button"
            variant="outline"
            className="h-11 w-full border-[color:var(--terminal-border)]"
            disabled={busy}
            onClick={() => void onGoogleSignIn()}
          >
            {busy ? "Opening Google…" : "Continue with Google"}
          </Button>

          <p className="text-center text-xs text-[color:var(--terminal-muted)]">
            New to OWNERR OS?{" "}
            <button
              type="button"
              className="font-bold text-[color:var(--brand-orange)] hover:underline"
              onClick={() => setJoinMode("register")}
            >
              Register with your startup idea
            </button>
          </p>
        </motion.div>
      ) : (
        <motion.div
          key="register"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <OwnerrOsPublicIdeaForm referralCode={referralCode} />
          <p className="mt-4 text-center text-xs text-[color:var(--terminal-muted)]">
            Already listed or have an account?{" "}
            <button
              type="button"
              className="font-bold text-[color:var(--brand-orange)] hover:underline"
              onClick={() => setJoinMode("signin")}
            >
              Sign in instead
            </button>
          </p>
        </motion.div>
      )}
    </div>
  );
}
