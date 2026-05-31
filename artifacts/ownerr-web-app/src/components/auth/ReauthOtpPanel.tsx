import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { ReauthSendResult } from "@/lib/auth/reauthenticate";
import {
  OTP_LENGTH,
  normalizeOtpToken,
  validateOtpToken,
} from "@/lib/auth/validation";

const RESEND_COOLDOWN_SEC = 60;

type Props = {
  /** Receives the email code; parent applies it via updateUser({ nonce }). */
  onVerified: (code: string) => void | Promise<void>;
  onCancel?: () => void;
  /** Send code when the panel mounts (default true). */
  sendOnMount?: boolean;
  compact?: boolean;
};

export function ReauthOtpPanel({
  onVerified,
  onCancel,
  sendOnMount = true,
  compact,
}: Props) {
  const { configured, session, sendReauthenticationOtp, formatAuthError } =
    useAuth();
  const { toast } = useToast();

  const email = session?.user.email ?? "";
  const [otp, setOtp] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const sentInitialRef = useRef(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = window.setInterval(() => {
      setCooldown((c) => (c <= 1 ? 0 : c - 1));
    }, 1000);
    return () => window.clearInterval(t);
  }, [cooldown]);

  const handleSendResult = useCallback(
    (result: ReauthSendResult, forced: boolean) => {
      if (result === "sent") {
        setCodeSent(true);
        setCooldown(RESEND_COOLDOWN_SEC);
        toast({
          title: "Verification code sent",
          description: `Check ${email} for a ${OTP_LENGTH}-digit code from Ownerr Intelligence.`,
        });
        return;
      }
      if (forced) return;
      setCodeSent(true);
      toast({
        title: "Code already sent",
        description:
          "Use the latest email we sent, or wait a few seconds and tap Resend code.",
      });
    },
    [email, toast],
  );

  const sendCode = useCallback(
    async (force = false) => {
      if (!configured || !email) return;
      setBusy(true);
      try {
        const result = await sendReauthenticationOtp({ force });
        handleSendResult(result, force);
      } catch (err) {
        toast({
          title: "Could not send code",
          description: formatAuthError(err),
          variant: "destructive",
        });
      } finally {
        setBusy(false);
      }
    },
    [
      configured,
      email,
      sendReauthenticationOtp,
      formatAuthError,
      toast,
      handleSendResult,
    ],
  );

  useEffect(() => {
    if (!sendOnMount || sentInitialRef.current || !configured || !email) return;
    sentInitialRef.current = true;
    void sendCode(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot send on mount
  }, [sendOnMount, configured, email]);

  async function onVerify(e: React.FormEvent) {
    e.preventDefault();
    const check = validateOtpToken(otp);
    if (!check.ok) {
      toast({ title: check.message, variant: "destructive" });
      return;
    }
    const code = normalizeOtpToken(otp);
    setBusy(true);
    try {
      await onVerified(code);
    } catch (err) {
      toast({
        title: "Verification failed",
        description: formatAuthError(err),
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }

  if (!email) {
    return (
      <p className="text-sm text-muted-foreground">
        This account has no email address for verification.
      </p>
    );
  }

  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      <p className="text-sm text-muted-foreground">
        {codeSent
          ? `Enter the ${OTP_LENGTH}-digit code sent to ${email}.`
          : "We will email you a verification code to confirm your identity."}
      </p>
      <form className="space-y-4" onSubmit={(e) => void onVerify(e)}>
        <div className="space-y-2">
          <Label htmlFor="reauth-otp">Verification code</Label>
          <Input
            id="reauth-otp"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={OTP_LENGTH}
            value={otp}
            onChange={(e) => setOtp(normalizeOtpToken(e.target.value))}
            className="text-center font-mono text-lg tracking-[0.35em]"
            placeholder={"·".repeat(OTP_LENGTH)}
            disabled={busy}
          />
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button type="submit" disabled={busy || otp.length !== OTP_LENGTH}>
            {busy ? "Please wait…" : "Verify code"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={busy || cooldown > 0}
            onClick={() => void sendCode(true)}
          >
            {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
          </Button>
          {onCancel ? (
            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              onClick={onCancel}
            >
              Cancel
            </Button>
          ) : null}
        </div>
      </form>
    </div>
  );
}
