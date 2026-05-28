import { Link } from "wouter";
import { LayoutDashboard, Link2, LogOut, User, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useOwnerrNetworkAuth } from "@/hooks/useOwnerrNetworkAuth";
import { ownerrNetworkAvatarUrl } from "@/lib/ownerr-network/avatar";
import { PRODUCT_ROUTES, PUBLIC_ROUTES } from "@/routing/routeRegistry";

export default function OwnerrNetworkSettingsPage() {
  const { session, currentUser, logout } = useAuth();
  const { profile } = useOwnerrNetworkAuth();
  const email =
    profile?.email ?? currentUser?.email ?? session?.user.email ?? "";

  return (
    <div className="w-full max-w-none min-w-0 space-y-6 sm:space-y-8">
      <header>
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[color:var(--terminal-lime)]">
          Settings
        </p>
        <h1 className="mt-1 text-2xl font-bold text-[color:var(--terminal-display)]">
          {profile ? `@${profile.username}` : "Account"}
        </h1>
        <p className="text-sm text-[color:var(--terminal-muted)]">
          Identity and preferences for Ownerr Network
        </p>
      </header>

      {profile ? (
        <section className="flex flex-col gap-4 rounded-[12px] border border-[color:var(--terminal-border)] bg-[color:var(--terminal-surface)]/80 p-5 sm:flex-row sm:items-center">
          <img
            src={ownerrNetworkAvatarUrl(profile)}
            alt=""
            className="h-16 w-16 shrink-0 rounded-full border border-[color:var(--terminal-border)] object-cover"
          />
          <div className="min-w-0 flex-1">
            <p className="text-lg font-bold text-[color:var(--terminal-display)]">
              {profile.name}
            </p>
            {email ? (
              <p className="text-sm text-[color:var(--terminal-muted)]">
                {email}
              </p>
            ) : null}
            <p className="mt-2 text-xs text-[color:var(--terminal-muted)]">
              {profile.points} credits · {profile.total_referrals} referrals
              {profile.profile_verified ? " · verified" : ""}
            </p>
          </div>
        </section>
      ) : (
        <section className="rounded-[12px] border border-[color:var(--terminal-border)] bg-[color:var(--terminal-surface)]/80 p-5">
          <p className="text-sm text-[color:var(--terminal-muted)]">
            Finish onboarding to activate your network profile.
          </p>
          <Button type="button" className="mt-4 font-bold" asChild>
            <Link href={PRODUCT_ROUTES.ownerrNetworkOnboarding}>
              Continue setup
            </Link>
          </Button>
        </section>
      )}

      <section className="space-y-3">
        <p className="text-sm font-bold uppercase tracking-widest text-[color:var(--terminal-muted)]">
          Shortcuts
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <SettingsLink
            href={PRODUCT_ROUTES.ownerrNetworkDashboard}
            icon={LayoutDashboard}
            label="Dashboard"
          />
          <SettingsLink
            href={PRODUCT_ROUTES.ownerrNetworkProfile}
            icon={User}
            label="Profile"
          />
          <SettingsLink
            href={PRODUCT_ROUTES.ownerrNetworkWallet}
            icon={Wallet}
            label="Wallet"
          />
          <SettingsLink
            href={PRODUCT_ROUTES.ownerrNetworkReferrals}
            icon={Link2}
            label="Referral"
          />
        </div>
      </section>

      <section className="rounded-[12px] border border-[color:var(--terminal-border)] bg-[color:var(--terminal-surface)]/80 p-5 space-y-4">
        <p className="text-sm text-[color:var(--terminal-muted)]">
          To use another OWNERR product, log out and open it from{" "}
          <Link
            href={PUBLIC_ROUTES.products}
            className="font-bold text-[color:var(--terminal-ochre)] hover:underline"
          >
            Products
          </Link>
          .
        </p>
        <Button
          type="button"
          variant="destructive"
          className="font-bold"
          onClick={() => void logout()}
        >
          <LogOut className="mr-2 h-4 w-4" aria-hidden />
          Log out
        </Button>
      </section>
    </div>
  );
}

function SettingsLink({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: typeof LayoutDashboard;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-[12px] border border-[color:var(--terminal-border)] bg-black/20 p-4 transition-colors hover:border-[color:var(--terminal-ochre)]/50"
    >
      <Icon
        className="h-4 w-4 text-[color:var(--terminal-ochre)]"
        aria-hidden
      />
      <span className="text-sm font-bold text-[color:var(--terminal-display)]">
        {label}
      </span>
    </Link>
  );
}
