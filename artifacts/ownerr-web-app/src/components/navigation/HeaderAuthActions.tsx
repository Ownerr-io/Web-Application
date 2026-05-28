import { Link, useLocation } from "wouter";
import { ChevronDown, LayoutDashboard, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/context/AuthContext";
import {
  authLoginHrefForApp,
  authRegisterHrefForApp,
  resolveLoginHref,
} from "@/lib/auth/authLogin";
import { authRegisterHref } from "@/lib/auth/routes";
import { captureProductIntentFromPath } from "@/lib/auth/productLock";
import { cn } from "@/lib/utils";
import { appDeskHrefForRole } from "@/routes/navConfig";
import { marketplaceAppRoutes } from "@/routes/appRoutes";
import { marketingRoutes } from "@/routes/marketingRoutes";
import {
  isMarketplaceOrAppRoute,
  isOwnerrNetworkRoute,
} from "@/lib/platformNavContext";

type Props = {
  terminal: boolean;
  onNavigate?: () => void;
  className?: string;
};

export function HeaderAuthActions({ terminal, onNavigate, className }: Props) {
  const [location, setLocation] = useLocation();
  // setLocation used for sign-in when product slug known from path
  const { requestLogin, currentUser, session, logout } = useAuth();
  const onOwnerrNetwork = isOwnerrNetworkRoute(location);
  const onMarketplace = isMarketplaceOrAppRoute(location);

  const slug = captureProductIntentFromPath(location);
  const loginHref = resolveLoginHref(location);

  const outlineBtn = cn(
    "h-9 shrink-0 font-bold",
    terminal
      ? "rounded-md border-[color:var(--terminal-border)] bg-transparent text-[color:var(--terminal-fg)] hover:bg-[color:var(--terminal-surface-2)]"
      : "rounded-full",
  );

  const menuSurface = cn(
    "luxury-nav-dropdown luxury-nav-menu-compact z-[100] font-mono",
  );

  if (onOwnerrNetwork) {
    if (session) {
      return (
        <div className={cn("flex shrink-0 items-center gap-2", className)}>
          <Button
            asChild
            size="sm"
            className={cn(outlineBtn, "hidden sm:inline-flex")}
          >
            <Link
              href={marketingRoutes.ownerrNetworkDashboard}
              onClick={onNavigate}
            >
              Dashboard
            </Link>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className={outlineBtn}>
                <User className="mr-1.5 h-3.5 w-3.5" />
                Account
                <ChevronDown className="ml-1 h-3 w-3 opacity-70" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              sideOffset={10}
              className={menuSurface}
            >
              <div className="luxury-nav-dropdown-header">
                <p className="luxury-kicker">Account</p>
                <span className="luxury-rule mt-2 block" aria-hidden />
              </div>
              <div className="luxury-nav-dropdown-body">
                <DropdownMenuItem
                  asChild
                  className="p-0 focus:bg-transparent data-[highlighted]:bg-transparent"
                >
                  <Link
                    href={marketingRoutes.ownerrNetworkDashboard}
                    onClick={onNavigate}
                    className="luxury-nav-dropdown-item"
                  >
                    <LayoutDashboard className="h-4 w-4 shrink-0 text-brand-lime" />
                    <span className="text-[13px] font-bold">Dashboard</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  asChild
                  className="p-0 focus:bg-transparent data-[highlighted]:bg-transparent"
                >
                  <Link
                    href={marketingRoutes.ownerrNetworkOnboarding}
                    onClick={onNavigate}
                    className="luxury-nav-dropdown-item"
                  >
                    <User className="h-4 w-4 shrink-0 text-brand-orange" />
                    <span className="text-[13px] font-bold">Profile setup</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="my-1 bg-[color:var(--terminal-border)]/60" />
                <DropdownMenuItem
                  className="p-0 focus:bg-transparent data-[highlighted]:bg-transparent"
                  onClick={() => {
                    void logout();
                    onNavigate?.();
                  }}
                >
                  <span className="luxury-nav-dropdown-item w-full cursor-pointer">
                    <LogOut className="h-4 w-4 shrink-0 text-brand-red" />
                    <span className="text-[13px] font-bold">Log out</span>
                  </span>
                </DropdownMenuItem>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    }

    return (
      <div className={cn("flex shrink-0 items-center gap-2", className)}>
        <Button asChild size="sm" variant="outline" className={outlineBtn}>
          <Link
            href={authLoginHrefForApp("ownerr_network")}
            onClick={onNavigate}
          >
            Sign in
          </Link>
        </Button>
        <Button
          asChild
          size="sm"
          className={cn(
            outlineBtn,
            "btn-platform-gradient hidden sm:inline-flex",
          )}
        >
          <Link
            href={authRegisterHref({
              product: "ownerr-network",
              redirect: marketingRoutes.ownerrNetworkOnboarding,
            })}
            onClick={onNavigate}
          >
            Create account
          </Link>
        </Button>
      </div>
    );
  }

  if (currentUser && onMarketplace) {
    const desk = appDeskHrefForRole(currentUser.role);
    const profileHref =
      currentUser.role === "buyer"
        ? marketplaceAppRoutes.buyer
        : marketplaceAppRoutes.founderProfile;
    return (
      <div className={cn("flex shrink-0 items-center gap-2", className)}>
        <Button
          asChild
          size="sm"
          className={cn(outlineBtn, "hidden sm:inline-flex")}
        >
          <Link href={desk} onClick={onNavigate}>
            Workspace
          </Link>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline" className={outlineBtn}>
              Account
              <ChevronDown className="ml-1 h-3 w-3 opacity-70" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            sideOffset={10}
            className={menuSurface}
          >
            <div className="luxury-nav-dropdown-header">
              <p className="luxury-kicker">Account</p>
              <span className="luxury-rule mt-2 block" aria-hidden />
            </div>
            <div className="luxury-nav-dropdown-body">
              <DropdownMenuItem
                asChild
                className="p-0 focus:bg-transparent data-[highlighted]:bg-transparent"
              >
                <Link
                  href={desk}
                  onClick={onNavigate}
                  className="luxury-nav-dropdown-item"
                >
                  <span className="text-[13px] font-bold">Workspace</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                asChild
                className="p-0 focus:bg-transparent data-[highlighted]:bg-transparent"
              >
                <Link
                  href={profileHref}
                  onClick={onNavigate}
                  className="luxury-nav-dropdown-item"
                >
                  <span className="text-[13px] font-bold">Profile</span>
                </Link>
              </DropdownMenuItem>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  if (currentUser) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={cn(outlineBtn, className)}
        onClick={() => setLocation(appDeskHrefForRole(currentUser.role))}
      >
        Open workspace
      </Button>
    );
  }

  return (
    <div className={cn("flex shrink-0 items-center gap-2", className)}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={outlineBtn}
        onClick={() => {
          if (loginHref) setLocation(loginHref);
          else requestLogin({ app: slug ?? undefined });
        }}
      >
        Sign in
      </Button>
      <Button
        asChild
        size="sm"
        className={cn(
          outlineBtn,
          "btn-platform-gradient hidden sm:inline-flex",
        )}
      >
        <Link
          href={slug ? authRegisterHrefForApp(slug) : "/products"}
          onClick={onNavigate}
        >
          Create account
        </Link>
      </Button>
    </div>
  );
}
