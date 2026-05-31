import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { ReauthOtpPanel } from "@/components/auth/ReauthOtpPanel";
import { PasswordRulesHint } from "@/components/auth/PasswordRulesHint";
import { isReauthenticationRequiredError } from "@/lib/auth/authErrors";
import {
  validateAuthPassword,
  validatePasswordConfirmation,
} from "@/lib/auth/validation";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  /** Terminal-style card on founder / network profiles. */
  variant?: "default" | "terminal";
};

export function AccountChangePasswordSection({
  className,
  variant = "default",
}: Props) {
  const { updatePassword, formatAuthError } = useAuth();
  const { toast } = useToast();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [reauthOpen, setReauthOpen] = useState(false);
  const [pendingSave, setPendingSave] = useState(false);
  const [reauthSession, setReauthSession] = useState(0);

  const cardClass =
    variant === "terminal"
      ? "rounded-[12px] border border-[color:var(--terminal-border)] bg-[color:var(--terminal-surface)]/80 p-5 space-y-4"
      : "rounded-xl border border-border bg-card p-5 space-y-4";

  function openReauthDialog() {
    setPendingSave(true);
    setReauthSession((n) => n + 1);
    setReauthOpen(true);
  }

  async function savePassword() {
    const pwCheck = validateAuthPassword(password);
    if (!pwCheck.ok) {
      toast({ title: pwCheck.message, variant: "destructive" });
      return;
    }
    const matchCheck = validatePasswordConfirmation(password, confirm);
    if (!matchCheck.ok) {
      toast({ title: matchCheck.message, variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      await updatePassword(password);
      toast({ title: "Password updated" });
      setPassword("");
      setConfirm("");
    } catch (err) {
      if (isReauthenticationRequiredError(err)) {
        openReauthDialog();
        return;
      }
      toast({
        title: "Could not update password",
        description: formatAuthError(err),
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }

  async function afterReauthVerified(nonce: string) {
    setBusy(true);
    try {
      await updatePassword(password, { nonce });
      toast({ title: "Password updated" });
      setPassword("");
      setConfirm("");
      setReauthOpen(false);
      setPendingSave(false);
    } catch (err) {
      toast({
        title: "Could not update password",
        description: formatAuthError(err),
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <section className={cn(cardClass, className)}>
        <div>
          <h2
            className={
              variant === "terminal"
                ? "text-sm font-bold uppercase tracking-wide text-[color:var(--terminal-muted)]"
                : "text-sm font-bold uppercase tracking-wide text-muted-foreground"
            }
          >
            Password
          </h2>
          <p
            className={
              variant === "terminal"
                ? "mt-1 text-sm text-[color:var(--terminal-muted)]"
                : "mt-1 text-sm text-muted-foreground"
            }
          >
            Choose a new password. If your session requires it, we will email
            you a verification code before saving.
          </p>
        </div>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="account-new-password">New password</Label>
            <Input
              id="account-new-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={busy}
            />
            <PasswordRulesHint password={password} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="account-confirm-password">Confirm password</Label>
            <Input
              id="account-confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              disabled={busy}
            />
          </div>
          <Button
            type="button"
            disabled={busy}
            onClick={() => void savePassword()}
          >
            {busy ? "Saving…" : "Update password"}
          </Button>
        </div>
      </section>

      <Dialog open={reauthOpen} onOpenChange={setReauthOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Verify your identity</DialogTitle>
            <DialogDescription>
              Enter the code from your email to continue updating your password.
            </DialogDescription>
          </DialogHeader>
          <ReauthOtpPanel
            key={reauthSession}
            compact
            sendOnMount
            onVerified={(nonce) => {
              if (!pendingSave) return Promise.resolve();
              return afterReauthVerified(nonce);
            }}
            onCancel={() => {
              setReauthOpen(false);
              setPendingSave(false);
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
