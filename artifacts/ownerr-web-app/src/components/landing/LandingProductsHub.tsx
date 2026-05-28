import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { productsNavItems } from "@/routes/navConfig";
import { cn } from "@/lib/utils";

const PRODUCT_COPY: Record<string, { body: string }> = {
  marketplace: {
    body: "Browse verified startups, run structured acquisition workflows, and move from interest to diligence with audit-friendly bid history.",
  },
  valuation: {
    body: "Stress revenue, retention, and efficiency in a live scenario engine — outputs refresh as you iterate like an institutional desk.",
  },
  intelligence: {
    body: "Sector multiples, M&A velocity, and bid-depth signals in one terminal view so you price against the market, not a spreadsheet guess.",
  },
  "ownerr-os": {
    body: "Founder viral loop: share cards, referral links, and social distribution built for operators who want reach without agency overhead.",
  },
  "ownerr-network": {
    body: "Profile-first opportunity network — discover people, grow reputation, and use referrals and platform credits as a secondary growth loop.",
  },
};

export function LandingProductsHub() {
  return (
    <section className="platform-section-panel relative overflow-hidden rounded-[12px] p-6 sm:p-8">
      <div
        className="pointer-events-none absolute inset-0 opacity-90"
        style={{ background: "var(--platform-gradient-soft)" }}
        aria-hidden
      />
      <div className="relative space-y-3">
        <p className="terminal-eyebrow text-brand-lime">One platform</p>
        <h2 className="text-balance text-2xl sm:text-3xl">
          Everything on <span className="platform-gradient-text">OWNERR</span>,
          explained
        </h2>
        <p className="max-w-2xl text-sm leading-relaxed text-[color:var(--terminal-muted)]">
          You do not need five disconnected tools. Valuation, intelligence,
          marketplace execution, founder growth, and workforce network share the
          same dark terminal — and the same lime · orange · red brand system
          from our mark.
        </p>
      </div>
      <ul className="relative mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {productsNavItems.map((item, i) => (
          <li key={item.id}>
            <Link
              href={item.href}
              className={cn(
                "group flex h-full flex-col rounded-[10px] border border-[color:var(--terminal-border)] bg-[color:var(--terminal-bg)]/80 p-5 backdrop-blur-sm transition-transform hover:-translate-y-0.5",
                i === 0 && "platform-gradient-border",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-base font-bold text-[color:var(--terminal-display)]">
                  {item.label}
                </h3>
                <ArrowRight className="h-4 w-4 shrink-0 text-brand-orange opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-[color:var(--terminal-muted)]">
                {PRODUCT_COPY[item.id]?.body ?? item.description}
              </p>
              <span className="mt-4 text-[10px] font-bold uppercase tracking-widest text-brand-orange">
                Open product
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
