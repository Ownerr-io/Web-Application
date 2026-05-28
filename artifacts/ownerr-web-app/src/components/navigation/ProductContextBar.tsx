import { Link, useLocation } from "wouter";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getPlatformProductContext,
  productContextLabels,
  type PlatformProductContext,
} from "@/lib/platformNavContext";
import { marketingRoutes } from "@/routes/marketingRoutes";
import { authLoginHref } from "@/lib/auth/routes";
import { useAuth } from "@/context/AuthContext";
import { isNavLinkActive } from "@/routes/navConfig";

const NAV_SHELL = "mx-auto w-full max-w-[1200px] px-4";

type SubLink = { label: string; href: string; show?: boolean };

function subLinksFor(
  context: PlatformProductContext,
  hasNetworkSession: boolean,
): SubLink[] {
  if (context === "ownerr-network") {
    return [
      { label: "Overview", href: marketingRoutes.ownerrNetwork },
      { label: "Leaderboard", href: marketingRoutes.ownerrNetworkLeaderboard },
      {
        label: "Dashboard",
        href: marketingRoutes.ownerrNetworkDashboard,
        show: hasNetworkSession,
      },
      {
        label: "Login",
        href: authLoginHref({
          product: "ownerr-network",
          redirect: marketingRoutes.ownerrNetworkDashboard,
        }),
        show: !hasNetworkSession,
      },
    ];
  }
  if (context === "ownerr-os") {
    return [
      { label: "Overview", href: marketingRoutes.ownerrOs },
      { label: "Join OWNERR OS", href: marketingRoutes.join },
    ];
  }
  return [];
}

type Props = {
  terminal?: boolean;
};

export function ProductContextBar({ terminal = true }: Props) {
  const [location] = useLocation();
  const context = getPlatformProductContext(location);
  const { session } = useAuth();

  if (!context) return null;

  const links = subLinksFor(context, Boolean(session)).filter(
    (l) => l.show !== false,
  );

  return (
    <div
      className={cn(
        "border-t",
        terminal
          ? "border-[color:var(--terminal-border)]/80 bg-[color:var(--terminal-bg)]/40"
          : "border-border bg-muted/20",
      )}
    >
      <div
        className={cn(
          NAV_SHELL,
          "flex flex-col gap-2 py-2 sm:flex-row sm:items-center sm:justify-between",
        )}
      >
        <nav
          aria-label="Breadcrumb"
          className="flex min-w-0 flex-wrap items-center gap-1 text-[10px] font-bold uppercase tracking-[0.18em] sm:text-[11px]"
        >
          <Link
            href="/"
            className={
              terminal
                ? "text-[color:var(--terminal-muted)] hover:text-[color:var(--terminal-fg)]"
                : "text-muted-foreground hover:text-foreground"
            }
          >
            OWNERR Platform
          </Link>
          <ChevronRight className="h-3 w-3 shrink-0 opacity-50" aria-hidden />
          <span
            className={
              terminal
                ? "text-[color:var(--terminal-ochre)]"
                : "text-foreground"
            }
          >
            {productContextLabels[context]}
          </span>
        </nav>
        <div className="flex flex-wrap gap-1">
          {links.map((link) => {
            const active = isNavLinkActive(location, link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-md px-2.5 py-1.5 text-[11px] font-bold transition-colors",
                  active
                    ? terminal
                      ? "bg-[color:var(--terminal-surface-2)] text-[color:var(--terminal-lime)]"
                      : "bg-muted text-foreground"
                    : terminal
                      ? "text-[color:var(--terminal-muted)] hover:text-[color:var(--terminal-fg)]"
                      : "text-muted-foreground hover:text-foreground",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
