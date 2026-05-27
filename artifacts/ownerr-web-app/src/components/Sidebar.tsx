import { LogOut, Menu } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn, founderAvatarUrl } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useOptionalOwnerrNetwork } from "@/context/ownerr-network/OwnerrNetworkProvider";
import {
  getAuthenticatedSidebarNav,
  getMarketplaceSidebarSections,
  getOwnerrOsSidebarSections,
  getSidebarNavGroupLabel,
  isSidebarNavActive,
  type SidebarNavItemDef,
  type SidebarNavSection,
} from "@/routing/navigationRegistry";
import { resolveSidebarNavGroup } from "@/routing/productResolver";
import { productSettingsPath } from "@/lib/platform/productSettingsPaths";
import { MARKETPLACE_ROUTES } from "@/routing/routeRegistry";

function DeskNavLinks({
  onNavigate,
  location,
  links,
  closeWithSheet = false,
}: {
  onNavigate?: () => void;
  location: string;
  links: readonly SidebarNavItemDef[];
  closeWithSheet?: boolean;
}) {
  const linkClass = (active: boolean) =>
    cn(
      "flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:text-primary sm:min-h-0 sm:py-2",
      active && "bg-muted text-primary",
    );

  return (
    <nav
      className="grid items-start gap-1 text-sm font-medium sm:gap-0.5"
      aria-label={sidebarNavLabel(links)}
    >
      {links.map(({ id, href, label, icon: Icon }) => {
        const active = isSidebarNavActive(location, href);
        const inner = (
          <>
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </>
        );
        if (closeWithSheet) {
          return (
            <SheetClose key={id} asChild>
              <Link href={href} onClick={onNavigate} className={linkClass(active)}>
                {inner}
              </Link>
            </SheetClose>
          );
        }
        return (
          <Link key={id} href={href} onClick={onNavigate} className={linkClass(active)}>
            {inner}
          </Link>
        );
      })}
    </nav>
  );
}

function DeskNavSections({
  onNavigate,
  location,
  sections,
  closeWithSheet = false,
}: {
  onNavigate?: () => void;
  location: string;
  sections: readonly SidebarNavSection[];
  closeWithSheet?: boolean;
}) {
  return (
    <div className="space-y-6">
      {sections.map((section) => (
        <div key={section.title}>
          <p className="mb-2 px-3 text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
            {section.title}
          </p>
          <DeskNavLinks
            onNavigate={onNavigate}
            location={location}
            links={section.items}
            closeWithSheet={closeWithSheet}
          />
        </div>
      ))}
    </div>
  );
}

function sidebarNavLabel(links: readonly SidebarNavItemDef[]): string {
  const group = links[0]?.group;
  return group ? `${getSidebarNavGroupLabel(group)} navigation` : "Workspace";
}

function useAuthenticatedNav() {
  const [location] = useLocation();
  const { session, currentUser, logout } = useAuth();
  const ownerrNetwork = useOptionalOwnerrNetwork();
  const navGroup = resolveSidebarNavGroup(location);

  const subject = useMemo(
    () => ({
      session: Boolean(session),
      deskUser: currentUser,
      networkProfile: Boolean(ownerrNetwork?.profile?.id),
    }),
    [session, currentUser, ownerrNetwork?.profile?.id],
  );

  const sidebarLinks = useMemo(
    () => (navGroup ? getAuthenticatedSidebarNav(navGroup, subject) : []),
    [navGroup, subject],
  );

  const marketplaceSections = useMemo(
    () => (navGroup === 'marketplace' ? getMarketplaceSidebarSections(subject) : null),
    [navGroup, subject],
  );

  const ownerrSections = useMemo(
    () => (navGroup === 'ownerr-os' ? getOwnerrOsSidebarSections(subject) : null),
    [navGroup, subject],
  );

  const displayName =
    currentUser?.name ??
    session?.user.email?.split("@")[0] ??
    "Account";
  const email = currentUser?.email ?? session?.user.email ?? "";
  const avatarSeed = currentUser?.avatarSeed ?? currentUser?.id ?? session?.user.id ?? "user";

  return {
    location,
    navGroup,
    sidebarLinks,
    marketplaceSections,
    ownerrSections,
    displayName,
    email,
    avatarSeed,
    logout,
  };
}

/** Mobile-only: in-app navigation sheet. */
export function DashboardMobileNav() {
  const { location, navGroup, sidebarLinks, marketplaceSections, ownerrSections, displayName, email, avatarSeed, logout } =
    useAuthenticatedNav();
  const settingsHref = navGroup
    ? productSettingsPath(navGroup)
    : MARKETPLACE_ROUTES.settings;
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-10 w-10 shrink-0 border-0 bg-transparent text-[color:var(--brand-accent)] shadow-none hover:bg-transparent hover:text-[color:var(--brand-accent-hover)]"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" strokeWidth={2} />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className={cn(
          "desk-app-theme flex w-[min(100vw-1rem,20rem)] flex-col gap-0 border-border bg-background pb-[env(safe-area-inset-bottom,0px)] text-foreground sm:max-w-sm",
        )}
      >
        <SheetHeader className="space-y-1 border-b border-border pb-4 text-left">
          <SheetTitle className="text-base font-bold">
            {navGroup ? getSidebarNavGroupLabel(navGroup) : "Workspace"}
          </SheetTitle>
          <p className="text-xs font-normal leading-snug text-muted-foreground">
            App navigation and settings.
          </p>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto py-5 pr-2">
          <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/20 p-3">
            <img
              src={founderAvatarUrl(avatarSeed)}
              alt=""
              className="h-10 w-10 rounded-full border border-border object-cover"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-foreground">{displayName}</p>
              <p className="truncate text-xs text-muted-foreground">{email}</p>
            </div>
          </div>
          {marketplaceSections ? (
            <DeskNavSections
              closeWithSheet
              onNavigate={close}
              location={location}
              sections={marketplaceSections}
            />
          ) : ownerrSections ? (
            <DeskNavSections
              closeWithSheet
              onNavigate={close}
              location={location}
              sections={ownerrSections}
            />
          ) : (
            <DeskNavLinks closeWithSheet onNavigate={close} location={location} links={sidebarLinks} />
          )}
          <SheetClose asChild>
            <Link
              href={settingsHref}
              onClick={close}
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:text-primary"
            >
              Settings
            </Link>
          </SheetClose>
          <div className="mt-auto flex justify-stretch border-t border-border pt-4">
            <Button
              type="button"
              variant="outline"
              className="h-11 min-h-11 w-full font-bold sm:h-10 sm:min-h-0"
              onClick={() => {
                close();
                void logout();
              }}
            >
              <LogOut className="mr-2 h-4 w-4 shrink-0" />
              Log out
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function DashboardSidebar() {
  const { location, navGroup, sidebarLinks, marketplaceSections, ownerrSections } = useAuthenticatedNav();

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <div className="shrink-0 p-4">
        <div className="flex items-center gap-2 text-lg font-bold text-foreground">
          <img src="/Ownerr Logo.svg" alt="" className="h-6 w-6" />
          <span className="truncate">
            {navGroup ? getSidebarNavGroupLabel(navGroup) : 'OWNERR'}
          </span>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6">
        {marketplaceSections ? (
          <DeskNavSections location={location} sections={marketplaceSections} />
        ) : ownerrSections ? (
          <DeskNavSections location={location} sections={ownerrSections} />
        ) : (
          <DeskNavLinks location={location} links={sidebarLinks} />
        )}
      </div>
    </div>
  );
}
