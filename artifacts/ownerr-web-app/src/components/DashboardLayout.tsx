import type { ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { Bell, ChevronDown, LogOut, Settings } from 'lucide-react';
import type { AppSlug } from '@workspace/api-zod';
import { OwnerrProvider } from '@/context/ownerr/OwnerrProvider';
import { MarketplaceProvider } from '@/context/marketplace/MarketplaceProvider';
import { OwnerrNetworkProvider } from '@/context/ownerr-network/OwnerrNetworkProvider';
import { DashboardMobileNav, DashboardSidebar } from '@/components/Sidebar';
import { ProductAppReady } from '@/components/product/ProductAppReady';
import { RouteGuard } from '@/components/routing/RouteGuard';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/context/AuthContext';
import { cn, founderAvatarUrl } from '@/lib/utils';
import { getAuthenticatedWorkspaceLabel } from '@/routing/navigationRegistry';
import { productSettingsPath } from '@/lib/platform/productSettingsPaths';
import { resolveAuthenticatedWorkspace } from '@/routing/productResolver';
import type { AuthenticatedWorkspace } from '@/routing/routeRegistry';
import { DemoAccountBadge, DemoAccountBanner } from '@/components/marketplace/DemoAccountBanner';
import { isMarketplaceOrAppRoute } from '@/lib/platformNavContext';
import { OWNERR_OS_APP_MAIN_PADDING_CLASS } from '@/lib/ownerrOsAppLayout';

type DashboardLayoutProps = {
  children: React.ReactNode;
  fullBleedMain?: boolean;
};

type AuthenticatedShellRouteProps = {
  pathname: string;
  product: AppSlug;
  children: ReactNode;
  fullBleedMain?: boolean;
};

function ProductProvider({ product, children }: { product: AppSlug; children: ReactNode }) {
  if (product === 'ownerr_os') return <OwnerrProvider>{children}</OwnerrProvider>;
  if (product === 'marketplace') return <MarketplaceProvider>{children}</MarketplaceProvider>;
  return <OwnerrNetworkProvider>{children}</OwnerrNetworkProvider>;
}

export function AuthenticatedShellRoute({
  pathname,
  product,
  children,
  fullBleedMain,
}: AuthenticatedShellRouteProps) {
  return (
    <ProductProvider product={product}>
      <ProductAppReady product={product}>
        <DashboardLayout fullBleedMain={fullBleedMain}>
          <RouteGuard pathname={pathname}>{children}</RouteGuard>
        </DashboardLayout>
      </ProductAppReady>
    </ProductProvider>
  );
}

function AppWorkspaceHeader({ workspace }: { workspace: AuthenticatedWorkspace | null }) {
  const label = workspace ? getAuthenticatedWorkspaceLabel(workspace) : 'Workspace';

  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="truncate text-sm font-bold text-foreground">{label}</span>
    </div>
  );
}

function AuthenticatedAccountMenu({
  onNavigate,
  workspace,
}: {
  onNavigate?: () => void;
  workspace: AuthenticatedWorkspace | null;
}) {
  const { session, logout } = useAuth();
  const settingsHref = workspace ? productSettingsPath(workspace) : '/products';
  const displayName = session?.user.email?.split('@')[0] ?? 'Account';
  const email = session?.user.email ?? '';
  const avatarSeed = session?.user.id ?? 'user';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="sm" className="h-9 gap-2 px-2 font-bold">
          <img
            src={founderAvatarUrl(avatarSeed)}
            alt=""
            className="h-7 w-7 rounded-full border border-border object-cover"
          />
          <span className="hidden max-w-[8rem] truncate sm:inline">{displayName}</span>
          <ChevronDown className="h-3.5 w-3.5 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="z-50 w-56">
        <div className="border-b border-border px-3 py-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-bold">{displayName}</p>
            <DemoAccountBadge email={email} />
          </div>
          {email ? <p className="truncate text-xs text-muted-foreground">{email}</p> : null}
        </div>
        <DropdownMenuItem asChild>
          <Link href={settingsHref} onClick={onNavigate} className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="flex cursor-pointer items-center gap-2 font-medium text-destructive focus:text-destructive"
          onClick={() => {
            onNavigate?.();
            void logout();
          }}
        >
          <LogOut className="h-4 w-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function AuthenticatedAppHeader({ className }: { className?: string }) {
  const [location] = useLocation();
  const workspace = resolveAuthenticatedWorkspace(location);

  return (
    <header
      className={cn(
        'flex min-h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-background px-4',
        className,
      )}
    >
      <AppWorkspaceHeader workspace={workspace} />
      <div className="flex items-center gap-1 sm:gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-muted-foreground"
          aria-label="Notifications"
          disabled
        >
          <Bell className="h-4 w-4" />
        </Button>
        <AuthenticatedAccountMenu workspace={workspace} />
      </div>
    </header>
  );
}

export function DashboardLayout({ children, fullBleedMain = false }: DashboardLayoutProps) {
  const [location] = useLocation();
  const workspace = resolveAuthenticatedWorkspace(location);
  const isOwnerrApp = workspace === 'ownerr-os';
  const showDemoBanner = workspace === 'marketplace' || isMarketplaceOrAppRoute(location);
  const mainPaddingClass = fullBleedMain
    ? ''
    : isOwnerrApp
      ? OWNERR_OS_APP_MAIN_PADDING_CLASS
      : 'px-3 py-4 sm:p-6';
  return (
    <div className="desk-app-shell flex min-h-screen w-full flex-col pb-[env(safe-area-inset-bottom,0px)]">
      {showDemoBanner ? <DemoAccountBanner /> : null}
      <header className="sticky top-0 z-40 flex min-h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-background px-4 pt-[env(safe-area-inset-top,0px)] lg:hidden">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <img src="/Ownerr Logo.svg" alt="" className="h-7 w-7 shrink-0" width={28} height={35} />
          <div className="min-w-0 flex-1">
            <AppWorkspaceHeader workspace={workspace} />
          </div>
        </div>
        <DashboardMobileNav />
      </header>
      <div className="grid min-h-0 w-full flex-1 lg:grid-cols-[240px_1fr]">
        <aside className="hidden border-r border-border bg-background lg:sticky lg:top-0 lg:block lg:h-[100dvh] lg:max-h-[100dvh] lg:self-start">
          <DashboardSidebar />
        </aside>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <AuthenticatedAppHeader className="hidden lg:flex" />
          <main data-scroll-reset className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden">
            <div className={cn('flex-1', mainPaddingClass)}>{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
