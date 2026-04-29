import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMockSession } from "@/context/MockSessionContext";
import { useToast } from "@/hooks/use-toast";
import { MOCK_AUTH_DEMO_PASSWORD, MOCK_AUTH_LOGIN_ACCOUNTS } from "@/lib/mockAuthService";
import { founderAvatarUrl } from "@/lib/utils";

export function AuthDialog() {
  const { authDialogOpen, closeAuthDialog, login, register } = useMockSession();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(MOCK_AUTH_DEMO_PASSWORD);
  const [role, setRole] = useState<"buyer" | "founder">("buyer");
  const [busy, setBusy] = useState(false);
  const loginAccounts = useMemo(
    () => MOCK_AUTH_LOGIN_ACCOUNTS.filter((account) => account.role === "buyer" || account.role === "founder"),
    [],
  );

  async function onSubmit() {
    setBusy(true);
    try {
      const user =
        mode === "login"
          ? await login(email, password)
          : await register({ name, email, password, role });

      toast({ title: `Welcome, ${user.name}` });

      // V2: Role-based redirect
      const targetPath = user.role === "buyer" ? "/buyer" : "/seller";
      navigate(targetPath, { replace: true });

      setName("");
      setEmail("");
      setPassword(MOCK_AUTH_DEMO_PASSWORD);
      closeAuthDialog(); // Close dialog on success
    } catch (error) {
      toast({
        title: mode === "login" ? "Login failed" : "Registration failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }

  function autofillAccount(emailValue: string, passwordValue: string) {
    setEmail(emailValue);
    setPassword(passwordValue);
  }

  return (
    <Dialog open={authDialogOpen} onOpenChange={(open) => !open && closeAuthDialog()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === "login" ? "Sign in" : "Create account"}</DialogTitle>
          <DialogDescription>Secure account access for buyers and founders.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Button type="button" variant={mode === "login" ? "default" : "outline"} className="flex-1" onClick={() => setMode("login")}>
              Login
            </Button>
            <Button type="button" variant={mode === "register" ? "default" : "outline"} className="flex-1" onClick={() => setMode("register")}>
              Register
            </Button>
          </div>
          {mode === "register" ? (
            <div className="space-y-2">
              <Label htmlFor="auth-name">Name</Label>
              <Input id="auth-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" />
            </div>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="auth-email">Email</Label>
            <Input id="auth-email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@Ownerr" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="auth-password">Password</Label>
            <Input id="auth-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {mode === "register" ? (
            <div className="space-y-2">
              <Label>Account type</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button type="button" variant={role === "buyer" ? "default" : "outline"} onClick={() => setRole("buyer")}>
                  Buyer
                </Button>
                <Button type="button" variant={role === "founder" ? "default" : "outline"} onClick={() => setRole("founder")}>
                  Founder
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
              <p className="text-xs font-semibold text-foreground">Quick login accounts</p>
              <div className="space-y-2">
                {loginAccounts.map((account) => (
                  <button
                    key={account.id}
                    type="button"
                    className="flex w-full items-center justify-between gap-3 rounded-md border border-border bg-background px-2.5 py-2 text-left hover:bg-muted/40"
                    onClick={() => autofillAccount(account.email, account.password)}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <img
                        src={founderAvatarUrl(account.avatarSeed)}
                        alt=""
                        className="h-7 w-7 shrink-0 rounded-full border border-border object-cover"
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-semibold text-foreground">{account.name}</span>
                        <span className="block truncate text-[11px] text-muted-foreground">{account.email}</span>
                      </span>
                    </span>
                    <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                      {account.role}
                    </span>
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Password: <span className="font-semibold text-foreground">{MOCK_AUTH_DEMO_PASSWORD}</span>
              </p>
            </div>
          )}
          <Button type="button" className="w-full" disabled={busy} onClick={() => void onSubmit()}>
            {busy ? "Please wait..." : mode === "login" ? "Login" : "Create account"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}