import { Link } from 'wouter';
import { ProductNav } from '@/components/ProductNav';
import { marketplacePath } from '@/lib/appPaths';
import { cn } from '@/lib/utils';

export function MarketingLayout({
  children,
  terminalPalette = true,
}: {
  children: React.ReactNode;
  /** Terminal funnel styling (default: all marketing pages). */
  terminalPalette?: boolean;
}) {
  return (
    <div
      className={cn(
        /* Do not set overflow-x here — it breaks `sticky` on the header. Clip horizontally on <main> instead. */
        'min-h-screen',
        terminalPalette
          ? 'landing-terminal-palette selection:bg-[color:var(--terminal-ochre)] selection:text-[#0b0b0c]'
          : 'bg-background text-foreground selection:bg-foreground selection:text-background',
      )}
    >
      {terminalPalette ? (
        <header className="sticky top-0 z-50 w-full border-b border-[color:var(--terminal-border)] bg-[color:var(--terminal-surface)]/95 pt-[env(safe-area-inset-top,0px)] text-[color:var(--terminal-fg)] shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-[color:var(--terminal-surface)]/90">
          <ProductNav terminalChrome />
        </header>
      ) : (
        <div className="sticky top-0 z-50 px-3 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-4">
          <div className="mx-auto max-w-[1200px] rounded-full border border-border/80 bg-background/75 px-3 py-2 shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-background/65 dark:border-white/10">
            <ProductNav terminalChrome={false} />
          </div>
        </div>
      )}
      <main
        className={
          terminalPalette
            ? 'min-w-0 overflow-x-hidden pb-[env(safe-area-inset-bottom,0px)] pt-0'
            : 'min-w-0 overflow-x-hidden pb-[env(safe-area-inset-bottom,0px)] pt-6'
        }
      >
        {children}
      </main>
      <footer
        className={cn(
          'mx-auto mt-12 max-w-[1200px] min-w-0 overflow-x-hidden border-t px-4 py-8 text-center text-xs sm:mt-20 sm:py-10',
          terminalPalette
            ? 'border-[color:var(--terminal-border)] text-[color:var(--terminal-muted)]'
            : 'border-border text-muted-foreground',
        )}
      >
        <p>
          Ownerr — AI-powered startup valuation intelligence with integrated acquisition marketplace. ©{' '}
          {new Date().getFullYear()}
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
          <Link
            href="/"
            className={cn(terminalPalette ? 'hover:text-[color:var(--terminal-fg)]' : 'hover:text-foreground')}
          >
            Home
          </Link>
          <span
            aria-hidden
            className={
              terminalPalette ? 'text-[color:var(--terminal-muted)]/50' : 'text-muted-foreground/40'
            }
          >
            ·
          </span>
          <Link
            href={marketplacePath('/')}
            className={cn(terminalPalette ? 'hover:text-[color:var(--terminal-fg)]' : 'hover:text-foreground')}
          >
            Marketplace
          </Link>
        </div>
      </footer>
    </div>
  );
}
