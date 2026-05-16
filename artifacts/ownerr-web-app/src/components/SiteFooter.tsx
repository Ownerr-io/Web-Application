import { Link, useLocation } from 'wouter';
import { MARKETPLACE_BASE, marketplacePath } from '@/lib/appPaths';

const FOOTER_LINKS = [
  { href: marketplacePath('/acquire'), label: 'Buy/sell' },
  { href: marketplacePath('/feed'), label: 'Feed' },
  { href: marketplacePath('/stats'), label: 'Stats' },
  { href: marketplacePath('/cofounders'), label: 'Co-founders' },
] as const;

export function SiteFooter() {
  const [location] = useLocation();
  const homeHref = marketplacePath('/');
  const isMarketplaceHome =
    location === MARKETPLACE_BASE || location === `${MARKETPLACE_BASE}/`;

  return (
    <footer
      className="mt-16 w-full min-w-0 border-t border-border pt-8 pb-2"
      role="contentinfo"
    >
      <nav className="mb-6 hidden flex-wrap items-center justify-center gap-x-1 gap-y-2 text-sm lg:flex lg:justify-start">
        <Link
          href={homeHref}
          className={
            isMarketplaceHome
              ? 'px-1 font-bold text-foreground'
              : 'px-1 text-muted-foreground hover:text-foreground'
          }
        >
          Marketplace home
        </Link>
        {FOOTER_LINKS.flatMap((l) => [
          <span key={`${l.href}-dot`} className="px-0.5 text-muted-foreground/40" aria-hidden>
            ·
          </span>,
          <Link
            key={l.href}
            href={l.href}
            className={
              l.href === location
                ? 'px-1 font-bold text-foreground'
                : 'px-1 text-muted-foreground hover:text-foreground'
            }
          >
            {l.label}
          </Link>,
        ])}
      </nav>
      <div className="flex flex-col items-stretch justify-between gap-4 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center">
        <p className="text-center sm:text-left">
          Built with care by indie founders. Not affiliated with Stripe. © {new Date().getFullYear()}{' '}
          Ownerr
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 sm:justify-end">
          <a href="#" className="hover:text-foreground">
            About
          </a>
          <a href="#" className="hover:text-foreground">
            Methodology
          </a>
          <a href="#" className="hover:text-foreground">
            Twitter
          </a>
          <a href="#" className="hover:text-foreground">
            RSS
          </a>
          <a href="#" className="hover:text-foreground">
            Privacy
          </a>
        </div>
      </div>
    </footer>
  );
}
