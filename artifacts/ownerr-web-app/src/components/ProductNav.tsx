import { useCallback, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { NAV_ITEMS } from '@/routes/publicNavConfig';
import { isNavLinkActive, isProductsDropdownActive } from '@/routes/navConfig';
import { ProductsNavMenu } from '@/components/navigation/ProductsNavMenu';
import { PublicNavCtas } from '@/components/navigation/PublicNavCtas';
import { PlatformMobileNavSections } from '@/components/navigation/PlatformMobileNavSections';
import { getPlatformProductContext } from '@/lib/platformNavContext';
import { ProductContextBar } from '@/components/navigation/ProductContextBar';
import { useNavScrolled } from '@/hooks/useNavScrolled';

const NAV_SHELL = 'mx-auto w-full max-w-[1200px] px-4';

type ProductNavProps = {
  terminalChrome?: boolean;
  onNavigate?: () => void;
  mobileSheetOpen?: boolean;
  onMobileSheetOpenChange?: (open: boolean) => void;
  showProductContext?: boolean;
  /** When true, applies solid/blur styles when page is scrolled (marketing header). */
  enableScrollChrome?: boolean;
};

export function ProductNav({
  terminalChrome = true,
  onNavigate,
  mobileSheetOpen,
  onMobileSheetOpenChange,
  showProductContext = true,
  enableScrollChrome = true,
}: ProductNavProps) {
  const [location] = useLocation();
  const terminal = terminalChrome;
  const productContext = getPlatformProductContext(location);
  const scrolled = useNavScrolled();

  const closeMobile = useCallback(
    () => onMobileSheetOpenChange?.(false),
    [onMobileSheetOpenChange],
  );

  useEffect(() => {
    closeMobile();
  }, [location, closeMobile]);

  const linkDesktopClass = (active: boolean) =>
    cn(
      'rounded-md px-3 py-2 text-xs font-bold transition-colors',
      active
        ? terminal
          ? 'text-[color:var(--terminal-ochre)]'
          : 'font-bold text-foreground'
        : terminal
          ? 'text-[color:var(--terminal-muted)] hover:bg-[color:var(--terminal-surface-2)] hover:text-[color:var(--terminal-fg)]'
          : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground',
    );

  const linkMobileClass = (active: boolean) =>
    cn(
      '-mx-1 rounded-lg px-3 py-3 text-sm font-bold transition-colors',
      terminal
        ? active
          ? 'text-[color:var(--terminal-ochre)]'
          : 'text-[color:var(--terminal-muted)] hover:text-[color:var(--terminal-fg)]'
        : active
          ? 'font-bold text-foreground'
          : 'text-muted-foreground hover:bg-muted/50',
    );

  const desk = (
    <div className="hidden min-w-0 flex-1 items-center justify-center gap-0.5 lg:flex" role="menubar" aria-label="Main">
      <ProductsNavMenu
        active={isProductsDropdownActive(location)}
        terminal={terminal}
        onNavigate={onNavigate}
      />
      {NAV_ITEMS.map((item) => (
        <Link
          key={item.id}
          href={item.href}
          onClick={onNavigate}
          className={linkDesktopClass(isNavLinkActive(location, item.href))}
          role="menuitem"
        >
          {item.label}
        </Link>
      ))}
    </div>
  );

  const sheetControlled =
    typeof mobileSheetOpen === 'boolean' && typeof onMobileSheetOpenChange === 'function';

  const logo = (
    <Link
      href="/"
      onClick={onNavigate}
      className={cn(
        'flex min-w-0 shrink-0 items-center gap-2 font-bold tracking-tight',
        terminal && 'text-[color:var(--terminal-fg)]',
      )}
      aria-label="OWNERR home"
    >
      <img src="/Ownerr%20Logo.svg" alt="" className="h-7 w-auto shrink-0 sm:h-8" width={28} height={35} />
      <span className="truncate text-base sm:text-lg">Ownerr</span>
    </Link>
  );

  return (
    <div
      className={cn(
        'w-full transition-[background,box-shadow,border-color] duration-300',
        enableScrollChrome &&
          scrolled &&
          terminal &&
          'border-b border-[color:var(--terminal-border)]/80 bg-[color:var(--terminal-surface)]/98 shadow-md backdrop-blur-lg',
        enableScrollChrome && scrolled && !terminal && 'border-b border-border/80 bg-background/95 shadow-sm backdrop-blur-lg',
      )}
    >
      <nav className={cn(NAV_SHELL, 'flex flex-nowrap items-center justify-between gap-3 py-2.5 sm:py-3')} aria-label="Primary">
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
          {logo}
          {desk}
        </div>
        <div className="hidden shrink-0 items-center gap-2 lg:flex">
          <PublicNavCtas terminal={terminal} onNavigate={onNavigate} />
        </div>
        <div className="shrink-0 lg:hidden">
          <Sheet
            {...(sheetControlled
              ? { open: mobileSheetOpen, onOpenChange: onMobileSheetOpenChange }
              : {})}
          >
            <SheetTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={cn(
                  'h-10 w-10 shrink-0 border-0 bg-transparent shadow-none',
                  terminal
                    ? 'text-[color:var(--brand-accent)] hover:text-[color:var(--brand-accent-hover)]'
                    : 'text-foreground',
                )}
                aria-label="Open menu"
                aria-expanded={sheetControlled ? mobileSheetOpen : undefined}
              >
                <Menu className="h-5 w-5" strokeWidth={2} />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className={cn(
                'flex w-[min(100vw-1rem,20rem)] flex-col gap-0 border-l font-mono sm:max-w-sm',
                terminal
                  ? 'border-[color:var(--terminal-border)] bg-[color:var(--terminal-surface)] text-[color:var(--terminal-fg)]'
                  : 'border-border bg-background text-foreground',
              )}
              onCloseAutoFocus={(e) => e.preventDefault()}
            >
              <SheetHeader className="space-y-1 border-b border-[color:var(--terminal-border)] pb-4 text-left">
                <SheetTitle className="text-base font-bold tracking-tight">Menu</SheetTitle>
              </SheetHeader>
              <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto py-4 pr-2" aria-label="Mobile">
                <PlatformMobileNavSections location={location} onNavigate={onNavigate} linkClass={linkMobileClass} />
              </nav>
              <div className="mt-auto space-y-3 border-t border-[color:var(--terminal-border)] pt-4">
                <PublicNavCtas terminal={terminal} onNavigate={onNavigate} stacked />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
      {showProductContext && productContext ? <ProductContextBar terminal={terminal} /> : null}
    </div>
  );
}
