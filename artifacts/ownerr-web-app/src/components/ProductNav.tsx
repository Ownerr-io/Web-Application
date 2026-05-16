import { Link, useLocation } from 'wouter';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useMockSession } from '@/context/MockSessionContext';
import { cn } from '@/lib/utils';
import {
  appDeskHrefForRole,
  isPrimaryNavActive,
  primaryNavItems,
  runValuationHref,
} from '@/routes/navConfig';

const NAV_SHELL = 'mx-auto w-full max-w-[1200px] px-4';

type ProductNavProps = {
  /** Terminal palette for marketing / marketplace chrome (non-terminal layout sets false). */
  terminalChrome?: boolean;
  /** After any in-sheet navigation (close controlled sheet from parent). */
  onNavigate?: () => void;
  /** Controlled mobile menu (e.g. marketplace header). */
  mobileSheetOpen?: boolean;
  onMobileSheetOpenChange?: (open: boolean) => void;
};

export function ProductNav({
  terminalChrome = true,
  onNavigate,
  mobileSheetOpen,
  onMobileSheetOpenChange,
}: ProductNavProps) {
  const [location, setLocation] = useLocation();
  const { openAuthDialog, currentUser } = useMockSession();
  const terminal = terminalChrome;

  function goLogin() {
    if (currentUser) {
      setLocation(appDeskHrefForRole(currentUser.role));
      return;
    }
    openAuthDialog();
  }

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
          ? 'text-[color:var(--brand-accent)]'
          : 'text-[color:var(--terminal-muted)] hover:text-[color:var(--terminal-fg)]'
        : active
          ? 'font-bold text-foreground'
          : 'text-muted-foreground hover:bg-muted/50',
    );

  const desk = (
    <div className="hidden min-w-0 flex-1 items-center justify-center gap-0.5 lg:flex">
      {primaryNavItems.map((l) => (
        <Link
          key={l.id}
          href={l.href}
          onClick={onNavigate}
          className={linkDesktopClass(isPrimaryNavActive(location, l.href))}
        >
          {l.label}
        </Link>
      ))}
    </div>
  );

  /** Desktop only — mobile uses sheet for Login + Run Valuation */
  const rightDesktop = (
    <div className="hidden shrink-0 items-center gap-2 lg:flex">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={cn(
          'h-9 shrink-0 font-bold',
          terminal
            ? 'rounded-md border-[color:var(--terminal-border)] bg-transparent text-[color:var(--terminal-fg)] hover:bg-[color:var(--terminal-surface-2)]'
            : 'rounded-full',
        )}
        onClick={goLogin}
      >
        Login
      </Button>
      <Button
        asChild
        size="sm"
        className={cn(
          'h-9 font-bold',
          terminal
            ? 'rounded-md border-0 bg-[color:var(--terminal-ochre)] text-[#0b0b0c] hover:bg-[color:var(--terminal-ochre-hover)]'
            : 'rounded-full',
        )}
      >
        <Link href={runValuationHref} onClick={onNavigate}>
          Run Valuation
        </Link>
      </Button>
    </div>
  );

  const sheetControlled =
    typeof mobileSheetOpen === 'boolean' && typeof onMobileSheetOpenChange === 'function';

  const loginLabel = currentUser ? 'Open desk' : 'Log in';

  const mobileSheet = (
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
              'h-10 w-10 shrink-0 border-0 bg-transparent shadow-none hover:bg-transparent',
              terminal
                ? 'text-[color:var(--brand-accent)] hover:text-[color:var(--brand-accent-hover)]'
                : 'text-foreground hover:text-foreground',
            )}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" strokeWidth={2} />
          </Button>
        </SheetTrigger>
        <SheetContent
          side="right"
          className={cn(
            'flex w-[min(100vw-1rem,20rem)] flex-col gap-0 border-l font-mono sm:max-w-sm',
            terminal
              ? 'border-[color:var(--terminal-border)] bg-[color:var(--terminal-surface)] text-[color:var(--terminal-fg)] [--terminal-ochre:var(--brand-accent)][--terminal-ochre-hover:var(--brand-accent-hover)]'
              : 'border-border bg-background text-foreground',
          )}
        >
          <SheetHeader
            className={cn(
              'space-y-1 border-b pb-4 text-left',
              terminal ? 'border-[color:var(--terminal-border)]' : 'border-border',
            )}
          >
            <SheetTitle
              className={cn(
                'text-base font-bold tracking-tight',
                terminal ? 'text-[color:var(--terminal-fg)]' : 'text-foreground',
              )}
            >
              Menu
            </SheetTitle>
            <p
              className={cn(
                'text-xs font-normal leading-snug',
                terminal ? 'text-[color:var(--terminal-muted)]' : 'text-muted-foreground',
              )}
            >
              Navigate Ownerr or open tools — same links as desktop.
            </p>
          </SheetHeader>
          <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto py-4 pr-2" aria-label="Primary">
            {primaryNavItems.map((l) => (
              <SheetClose key={l.id} asChild>
                <Link
                  href={l.href}
                  className={linkMobileClass(isPrimaryNavActive(location, l.href))}
                  onClick={onNavigate}
                >
                  {l.label}
                </Link>
              </SheetClose>
            ))}
          </nav>
          <div
            className={cn(
              'mt-auto space-y-3 border-t pt-4',
              terminal ? 'border-[color:var(--terminal-border)]' : 'border-border',
            )}
          >
            <SheetClose asChild>
              <Button
                asChild
                variant={terminal ? 'ghost' : 'outline'}
                className={cn(
                  'h-11 w-full font-bold shadow-none',
                  terminal &&
                    'rounded-[10px] border border-[color:var(--brand-accent)]/40 bg-transparent text-[color:var(--brand-accent)] hover:bg-transparent hover:text-[color:var(--brand-accent-hover)]',
                )}
              >
                <Link href={runValuationHref} onClick={onNavigate}>
                  Run Valuation
                </Link>
              </Button>
            </SheetClose>
            <SheetClose asChild>
              <Button
                type="button"
                variant={terminal ? 'ghost' : 'default'}
                className={cn(
                  'h-11 w-full font-bold shadow-none',
                  terminal
                    ? 'rounded-[10px] border-0 bg-[color:var(--brand-accent)] text-[color:var(--brand-accent-ink)] hover:bg-[color:var(--brand-accent-hover)]'
                    : '',
                )}
                onClick={() => {
                  goLogin();
                  onNavigate?.();
                }}
              >
                {loginLabel}
              </Button>
            </SheetClose>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );

  const logo = (
    <Link
      href="/"
      onClick={onNavigate}
      className={cn(
        'flex min-w-0 shrink-0 items-center gap-2 font-bold tracking-tight',
        terminal && 'text-[color:var(--terminal-fg)]',
      )}
    >
      <img src="/Ownerr%20Logo.svg" alt="" className="h-7 w-auto shrink-0 sm:h-8" width={28} height={35} />
      <span className="truncate text-base sm:text-lg">Ownerr</span>
    </Link>
  );

  return (
    <nav
      className={cn(NAV_SHELL, 'flex flex-nowrap items-center justify-between gap-3 py-2.5 sm:py-3')}
      aria-label="Primary"
    >
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
        {logo}
        {desk}
      </div>
      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        {rightDesktop}
        {mobileSheet}
      </div>
    </nav>
  );
}
