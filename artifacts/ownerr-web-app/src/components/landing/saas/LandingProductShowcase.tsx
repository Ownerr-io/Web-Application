import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { productsNavItems } from "@/routes/navConfig";
import {
  Reveal,
  RevealItem,
  RevealStagger,
} from "@/components/landing/saas/Reveal";
import { SectionHeader } from "@/components/landing/saas/SectionHeader";
import { cn } from "@/lib/utils";

export function LandingProductShowcase() {
  return (
    <section className="luxury-section-gap saas-section-shell border-t border-[color:var(--terminal-border)]/60">
      <SectionHeader
        index="02"
        label="Products"
        title="Two products. One platform."
        description="OWNERR OS and Unemployed Network share one login. Valuation, market intelligence, and marketplace are separate platform pages on the same account."
      />

      <RevealStagger className="mt-14 divide-y divide-[color:var(--terminal-border)]/70 rounded-[10px] border border-[color:var(--terminal-border)]/70">
        {productsNavItems.map((item, i) => (
          <RevealItem key={item.id}>
            <Link
              href={item.href}
              className="group flex flex-col gap-4 bg-[color:var(--terminal-surface)]/30 px-6 py-7 transition-colors hover:bg-[color:var(--terminal-surface)]/55 sm:flex-row sm:items-center sm:justify-between sm:gap-8 sm:px-8"
            >
              <div className="flex min-w-0 gap-5 sm:gap-8">
                <span className="font-mono text-sm font-bold tabular-nums text-[color:var(--terminal-muted)]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0">
                  <h3 className="text-lg font-bold text-[color:var(--terminal-display)]">
                    {item.label}
                  </h3>
                  <p className="mt-2 max-w-xl text-sm leading-relaxed text-[color:var(--terminal-muted)]">
                    {item.description}
                  </p>
                </div>
              </div>
              <span
                className={cn(
                  "inline-flex shrink-0 items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-brand-orange",
                  "sm:opacity-70 sm:transition-opacity group-hover:sm:opacity-100",
                )}
              >
                Enter
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          </RevealItem>
        ))}
      </RevealStagger>
      <Reveal className="mt-8">
        <p className="text-xs leading-relaxed text-[color:var(--terminal-muted)]">
          Use the header{" "}
          <span className="text-[color:var(--terminal-fg)]">Products</span> menu
          anytime — same destinations, consistent hierarchy.
        </p>
      </Reveal>
    </section>
  );
}
