import {
  Briefcase,
  Home,
  LogOut,
  Menu,
  MessageSquare,
  Search,
  ShieldCheck,
  Star,
} from "lucide-react";
import { useState } from "react";
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
import { appPath } from "@/lib/appPaths";
import { cn, founderAvatarUrl } from "@/lib/utils";
import { useMockSession } from "@/context/MockSessionContext";

const buyerLinks = [
  { href: appPath("/buyer"), label: "Overview", icon: Home },
  { href: appPath("/buyer/acquire"), label: "Browse Startups", icon: Search },
  { href: appPath("/buyer/interests"), label: "My Interests", icon: Star },
  { href: appPath("/buyer/bids"), label: "My Bids", icon: Briefcase },
];

const sellerLinks = [
  { href: appPath("/seller"), label: "Overview", icon: Home },
  { href: appPath("/seller/listings"), label: "My Listings", icon: Briefcase },
  { href: appPath("/seller/inbox"), label: "Inbox", icon: MessageSquare },
  { href: appPath("/seller/verification"), label: "Verification", icon: ShieldCheck },
];

function DeskNavLinks({
  onNavigate,
  location,
  links,
  closeWithSheet = false,
}: {
  onNavigate?: () => void;
  location: string;
  links: typeof buyerLinks;
  /** Close Radix sheet when a link is chosen (mobile drawer). */
  closeWithSheet?: boolean;
}) {
  const linkClass = (href: string) =>
    cn(
      "flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:text-primary sm:min-h-0 sm:py-2",
      location === href && "bg-muted text-primary",
    );

  return (
    <nav className="grid items-start gap-1 text-sm font-medium sm:gap-0.5" aria-label="Desk">
      {links.map(({ href, label, icon: Icon }) =>
        closeWithSheet ? (
          <SheetClose key={href} asChild>
            <Link href={href} onClick={onNavigate} className={linkClass(href)}>
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          </SheetClose>
        ) : (
          <Link key={href} href={href} onClick={onNavigate} className={linkClass(href)}>
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        ),
      )}
    </nav>
  );
}

/** Mobile-only: in-app navigation sheet (no public marketing / marketplace chrome). */
export function DashboardMobileNav() {
  const { currentUser, logout } = useMockSession();
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  const links = currentUser?.role === "buyer" ? buyerLinks : sellerLinks;
  const profileHref =
    currentUser?.role === "buyer" ? appPath("/buyer/profile") : appPath("/seller/profile");

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
          <SheetTitle className="text-base font-bold">Desk</SheetTitle>
          <p className="text-xs font-normal leading-snug text-muted-foreground">Navigate your buyer or seller workspace.</p>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto py-5 pr-2">
          {currentUser ? (
            <>
              <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/20 p-3">
                <SheetClose asChild>
                  <Link
                    href={profileHref}
                    onClick={close}
                    className="shrink-0 rounded-full ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label="Profile"
                  >
                    <img
                      src={founderAvatarUrl(currentUser.avatarSeed ?? currentUser.id)}
                      alt=""
                      className="h-10 w-10 rounded-full border border-border object-cover"
                    />
                  </Link>
                </SheetClose>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-foreground">{currentUser.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{currentUser.email}</p>
                </div>
              </div>
              <DeskNavLinks closeWithSheet onNavigate={close} location={location} links={links} />
              <div className="mt-auto flex justify-stretch border-t border-border pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 min-h-11 w-full font-bold sm:h-10 sm:min-h-0"
                  onClick={() => {
                    close();
                    logout();
                  }}
                >
                  <LogOut className="mr-2 h-4 w-4 shrink-0" />
                  Log out
                </Button>
              </div>
            </>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function DashboardSidebar() {
  const { currentUser, logout } = useMockSession();
  const [location] = useLocation();
  const links = currentUser?.role === "buyer" ? buyerLinks : sellerLinks;
  const profileHref =
    currentUser?.role === "buyer" ? appPath("/buyer/profile") : appPath("/seller/profile");

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <div className="shrink-0 p-4">
        <div className="flex items-center gap-2 font-bold text-lg text-foreground">
          <img src="/Ownerr Logo.svg" alt="" className="h-6 w-6" />
          <span>Ownerr</span>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden px-4">
        {currentUser ? (
          <DeskNavLinks location={location} links={links} />
        ) : null}
      </div>
      <div className="shrink-0 p-4 pt-2">
        {currentUser ? (
          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/20 p-2">
            <Link
              href={profileHref}
              className={cn(
                "flex shrink-0 rounded-full ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                location === profileHref && "ring-2 ring-primary ring-offset-2",
              )}
              aria-label="Profile"
            >
              <img
                src={founderAvatarUrl(currentUser.avatarSeed ?? currentUser.id)}
                alt=""
                className="h-8 w-8 rounded-full border border-border object-cover"
              />
            </Link>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold leading-tight text-foreground">{currentUser.name}</p>
              <p className="truncate text-xs leading-tight text-muted-foreground">{currentUser.email}</p>
            </div>
            <Button onClick={logout} variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label="Logout">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
