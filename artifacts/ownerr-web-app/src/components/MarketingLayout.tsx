import { ProductNav } from '@/components/ProductNav';
import { PlatformFooter } from '@/components/navigation/PlatformFooter';
import { cn } from '@/lib/utils';

export function MarketingLayout({
  children,
  terminalPalette = true,
  hideFooter = false,
  fullBleedMain = false,
  hideProductContext = false,
}: {
  children: React.ReactNode;
  /** Terminal funnel styling (default: all marketing pages). */
  terminalPalette?: boolean;
  hideFooter?: boolean;
  /** Edge-to-edge main (valuation immersive flow). */
  fullBleedMain?: boolean;
  /** Hide breadcrumb sub-nav under the main header (product landings). */
  hideProductContext?: boolean;
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
        <header className="sticky top-0 z-50 w-full border-b border-transparent bg-transparent pt-[env(safe-area-inset-top,0px)] text-[color:var(--terminal-fg)]">
          <ProductNav terminalChrome enableScrollChrome showProductContext={!hideProductContext} />
        </header>
      ) : (
        <div className="sticky top-0 z-50 px-3 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-4">
          <div className="mx-auto max-w-[1200px] rounded-full border border-border/80 bg-background/75 px-3 py-2 shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-background/65 dark:border-white/10">
            <ProductNav terminalChrome={false} enableScrollChrome showProductContext={!hideProductContext} />
          </div>
        </div>
      )}
      <main
        data-scroll-reset
        className={cn(
          'min-w-0 overflow-x-hidden pb-[env(safe-area-inset-bottom,0px)]',
          fullBleedMain ? 'pt-0' : terminalPalette ? 'pt-0' : 'pt-6',
          fullBleedMain && 'max-w-none',
        )}
      >
        {children}
      </main>
      {!hideFooter ? <PlatformFooter terminal={terminalPalette} /> : null}
    </div>
  );
}
