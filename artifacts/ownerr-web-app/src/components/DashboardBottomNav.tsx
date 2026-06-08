import { MoreHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "wouter";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useAuthenticatedNav } from "@/hooks/useAuthenticatedNav";
import { isSidebarNavActive } from "@/routing/navigationRegistry";
import { cn } from "@/lib/utils";
import type { SidebarNavItemDef } from "@/routing/navigationRegistry";

const MAX_PRIMARY_TABS = 4;

const SHORT_LABELS: Record<string, string> = {
  "marketplace.buyer.overview": "Home",
  "marketplace.seller.overview": "Home",
  "ownerr-os.dashboard": "Home",
  "ownerr-network.dashboard": "Home",
  "marketplace.buyer.browse": "Browse",
  "marketplace.buyer.interests": "Interests",
  "marketplace.buyer.offers": "Offers",
  "marketplace.seller.listings": "Listings",
  "marketplace.seller.inbox": "Inbox",
  "marketplace.seller.verification": "Verify",
  "ownerr-os.listings": "Startups",
  "ownerr-os.analytics": "Stats",
  "ownerr-network.referrals": "Refer",
  "ownerr-network.leaderboard": "Ranks",
  "ownerr-network.profile": "Profile",
  "marketplace.buyer.profile": "Profile",
  "marketplace.seller.profile": "Profile",
  "ownerr-os.profile": "Profile",
};

function tabLabel(item: SidebarNavItemDef): string {
  return SHORT_LABELS[item.id] ?? item.label;
}

function BottomNavTab({
  item,
  location,
  compact,
}: {
  item: SidebarNavItemDef;
  location: string;
  compact?: boolean;
}) {
  const active = isSidebarNavActive(location, item.href);
  const Icon = item.icon;
  const label = tabLabel(item);

  return (
    <Link
      href={item.href}
      className={cn(
        "flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1.5 outline-none transition-colors",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        active
          ? "text-brand-lime"
          : "text-muted-foreground hover:text-brand-orange",
      )}
      aria-current={active ? "page" : undefined}
    >
      <Icon
        className={cn("h-5 w-5 shrink-0", active && "text-brand-lime")}
        strokeWidth={active ? 2.25 : 2}
        aria-hidden
      />
      <span
        className={cn(
          "max-w-full truncate text-center font-semibold leading-tight",
          compact ? "text-[9px]" : "text-[10px]",
        )}
      >
        {label}
      </span>
    </Link>
  );
}

function MoreNavSheet({
  items,
  location,
}: {
  items: readonly SidebarNavItemDef[];
  location: string;
}) {
  const [open, setOpen] = useState(false);
  const anyMoreActive = items.some((item) =>
    isSidebarNavActive(location, item.href),
  );

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1.5 outline-none transition-colors",
            "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            anyMoreActive
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground",
          )}
          aria-label="More navigation"
        >
          <MoreHorizontal
            className="h-5 w-5 shrink-0"
            strokeWidth={anyMoreActive ? 2.25 : 2}
            aria-hidden
          />
          <span className="text-[10px] font-semibold leading-tight">More</span>
        </button>
      </SheetTrigger>
      <SheetContent
        side="bottom"
        className="desk-app-theme rounded-t-2xl border-border bg-background pb-[max(1rem,env(safe-area-inset-bottom))] text-foreground"
      >
        <SheetHeader className="pb-2 text-left">
          <SheetTitle className="text-base font-bold">More</SheetTitle>
        </SheetHeader>
        <nav className="grid gap-1 py-2" aria-label="Additional app screens">
          {items.map((item) => {
            const active = isSidebarNavActive(location, item.href);
            const Icon = item.icon;
            return (
              <SheetClose key={item.id} asChild>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-colors",
                    active
                      ? "bg-muted text-primary"
                      : "text-foreground hover:bg-muted/60",
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon className="h-5 w-5 shrink-0" aria-hidden />
                  {item.label}
                </Link>
              </SheetClose>
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
}

/** Mobile-only fixed bottom tab bar (replaces hamburger navigation). */
export function DashboardBottomNav() {
  const { location, navGroup, bottomNavLinks } = useAuthenticatedNav();

  const { primary, overflow } = useMemo(() => {
    const links = bottomNavLinks;
    if (links.length <= MAX_PRIMARY_TABS) {
      return { primary: links, overflow: [] as SidebarNavItemDef[] };
    }
    return {
      primary: links.slice(0, MAX_PRIMARY_TABS),
      overflow: links.slice(MAX_PRIMARY_TABS),
    };
  }, [bottomNavLinks]);

  if (!navGroup || bottomNavLinks.length === 0) return null;

  const compact = primary.length >= 4 || overflow.length > 0;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/90 lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      aria-label="App navigation"
    >
      <div className="flex min-h-[3.5rem] max-w-lg items-stretch gap-0.5 px-1 pt-0.5 sm:max-w-none">
        {primary.map((item) => (
          <BottomNavTab
            key={item.id}
            item={item}
            location={location}
            compact={compact}
          />
        ))}
        {overflow.length > 0 ? (
          <MoreNavSheet items={overflow} location={location} />
        ) : null}
      </div>
    </nav>
  );
}

/** Reserve space above the fixed bottom bar so content is not covered. */
export const DASHBOARD_MOBILE_BOTTOM_NAV_SPACER_CLASS =
  "pb-[calc(3.5rem+env(safe-area-inset-bottom,0px))] lg:pb-0";
