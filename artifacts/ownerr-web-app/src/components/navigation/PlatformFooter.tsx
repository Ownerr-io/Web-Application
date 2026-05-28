import type { ReactNode } from "react";
import { Link } from "wouter";
import { marketingRoutes } from "@/routes/marketingRoutes";
import { marketplaceRoutes } from "@/routes/marketplaceRoutes";
import { productsNavItems } from "@/routes/navConfig";
import { cn } from "@/lib/utils";

type Props = {
  terminal?: boolean;
  /** Marketing pages: no extra space under the copyright line. */
  compactBottom?: boolean;
  className?: string;
};

const companyLinks = [
  { label: "Contact", href: marketingRoutes.contact, external: false },
  { label: "Privacy", href: "#privacy", external: true },
  { label: "Terms", href: "#terms", external: true },
] as const;

const productFooterLinks = productsNavItems.filter(
  (item) => item.id !== "marketplace",
);

function FooterColumn({
  title,
  children,
  headingClass,
}: {
  title: string;
  children: ReactNode;
  headingClass: string;
}) {
  return (
    <div className="min-w-0 text-left">
      <p className={headingClass}>{title}</p>
      <ul className="mt-3 space-y-2 text-sm font-medium">{children}</ul>
    </div>
  );
}

export function PlatformFooter({
  terminal = true,
  compactBottom = false,
  className,
}: Props) {
  const linkClass = terminal
    ? "inline-block text-[color:var(--terminal-muted)] transition-colors hover:text-[color:var(--terminal-ochre)]"
    : "inline-block text-muted-foreground transition-colors hover:text-foreground";
  const headingClass = terminal
    ? "text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--terminal-lime)]"
    : "text-xs font-bold uppercase tracking-widest text-foreground";

  return (
    <footer
      className={cn(
        "saas-platform-footer relative border-t",
        compactBottom && "saas-platform-footer--compact",
        terminal
          ? "border-[color:var(--terminal-border)]/70 bg-[color:var(--terminal-bg)] text-[color:var(--terminal-fg)]"
          : "border-border bg-background text-foreground",
        className,
      )}
      role="contentinfo"
      id="contact"
    >
      <div className="saas-platform-footer__glow" aria-hidden />

      <div className="saas-platform-footer__inner relative z-10 mx-auto w-full max-w-[72rem] px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:justify-between lg:gap-12 xl:gap-16">
          <div className="min-w-0 max-w-md shrink-0 lg:max-w-[22rem]">
            <Link
              href="/"
              className="inline-flex items-center gap-3 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-lime)]"
            >
              <img
                src="/Ownerr Logo.svg"
                alt=""
                className="h-10 w-10 shrink-0"
                width={40}
                height={50}
              />
              <span className="text-lg font-bold tracking-tight text-[color:var(--terminal-display)]">
                Ownerr
              </span>
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-[color:var(--terminal-muted)]">
              Valuation intelligence and acquisition infrastructure for serious
              operators.
            </p>
          </div>

          <nav
            className="grid min-w-0 flex-1 grid-cols-2 gap-x-6 gap-y-8 text-left sm:gap-x-10 md:grid-cols-4 lg:max-w-3xl lg:justify-items-start lg:gap-x-8"
            aria-label="Footer"
          >
            <FooterColumn title="Platform" headingClass={headingClass}>
              <li>
                <Link href={marketplaceRoutes.root} className={linkClass}>
                  Marketplace
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
            </FooterColumn>

            <FooterColumn title="Products" headingClass={headingClass}>
              {productFooterLinks.map((item) => (
                <li key={item.id}>
                  <Link href={item.href} className={linkClass}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </FooterColumn>

            <FooterColumn title="Account" headingClass={headingClass}>
              <li>
                <Link href="/products" className={linkClass}>
                  Sign in
                </Link>
              </li>
              <li>
                <Link href="/products" className={linkClass}>
                  Get started
                </Link>
              </li>
            </FooterColumn>

            <FooterColumn title="Company" headingClass={headingClass}>
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
            </FooterColumn>
          </nav>
        </div>

        <p
          className={cn(
            "mt-8 border-t pt-5 text-center text-[11px] leading-relaxed text-[color:var(--terminal-muted)] sm:mt-10 sm:text-xs",
            compactBottom
              ? "pb-[env(safe-area-inset-bottom,0px)]"
              : "pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]",
            terminal
              ? "border-[color:var(--terminal-border)]/50"
              : "border-border/50",
          )}
        >
          Ownerr — AI-powered startup valuation intelligence with integrated
          acquisition marketplace. © {new Date().getFullYear()}
        </p>
      </div>
    </footer>
  );
}
