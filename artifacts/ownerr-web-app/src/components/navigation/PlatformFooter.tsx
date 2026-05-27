import { Link } from 'wouter';
import { marketingRoutes } from '@/routes/marketingRoutes';
import { marketplaceRoutes } from '@/routes/marketplaceRoutes';
import { productsNavItems } from '@/routes/navConfig';
import { cn } from '@/lib/utils';
type Props = {
  terminal?: boolean;
};

const companyLinks = [
  { label: 'Contact', href: marketingRoutes.contact, external: false },
  { label: 'Privacy', href: '#privacy', external: true },
  { label: 'Terms', href: '#terms', external: true },
] as const;

export function PlatformFooter({ terminal = true }: Props) {
  const linkClass = terminal
    ? 'text-[color:var(--terminal-muted)] hover:text-[color:var(--terminal-fg)]'
    : 'text-muted-foreground hover:text-foreground';
  const headingClass = terminal
    ? 'text-[11px] font-black uppercase tracking-[0.2em] text-[color:var(--terminal-lime)]'
    : 'text-xs font-bold uppercase tracking-widest text-foreground';

  return (
    <footer
      className={cn(
        'mt-16 border-t sm:mt-20',
        terminal ? 'border-[color:var(--terminal-border)] bg-[color:var(--terminal-bg)]' : 'border-border bg-background',
      )}
      role="contentinfo"
      id="contact"
    >
      <div className="mx-auto grid max-w-[1200px] gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className={headingClass}>Platform</p>
          <ul className="mt-4 space-y-2 text-sm font-medium">
            <li>
              <Link href={marketplaceRoutes.root} className={linkClass}>
                Marketplace
              </Link>
            </li>
            <li>
              <Link href={marketingRoutes.pricing} className={linkClass}>
                Pricing
              </Link>
            </li>
            <li>
              <Link href={marketingRoutes.valuation} className={linkClass}>
                Valuation
              </Link>
            </li>
            <li>
              <Link href={marketingRoutes.howItWorks} className={linkClass}>
                How It Works
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className={headingClass}>Products</p>
          <ul className="mt-4 space-y-2 text-sm font-medium">
            {productsNavItems.map((item) => (
              <li key={item.id}>
                <Link href={item.href} className={linkClass}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className={headingClass}>Account</p>
          <ul className="mt-4 space-y-2 text-sm font-medium">
            <li>
              <Link href="/products" className={linkClass}>
                Sign In
              </Link>
            </li>
            <li>
              <Link href="/products" className={linkClass}>
                Get Started
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className={headingClass}>Company</p>
          <ul className="mt-4 space-y-2 text-sm font-medium">
            {companyLinks.map((item) => (
              <li key={item.label}>
                {item.external ? (
                  <a href={item.href} className={linkClass}>
                    {item.label}
                  </a>
                ) : (
                  <Link href={item.href} className={linkClass}>
                    {item.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div
        className={cn(
          'border-t px-4 py-6 text-center text-xs',
          terminal ? 'border-[color:var(--terminal-border)] text-[color:var(--terminal-muted)]' : 'border-border text-muted-foreground',
        )}
      >
        <p>
          Ownerr — AI-powered startup valuation intelligence with integrated acquisition marketplace. ©{' '}
          {new Date().getFullYear()}
        </p>
      </div>
    </footer>
  );
}
