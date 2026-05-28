import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { marketingRoutes } from "@/routes/marketingRoutes";
import { marketplacePath } from "@/lib/appPaths";
import { Reveal } from "@/components/landing/saas/Reveal";

export function LandingFinalCta() {
  return (
    <section className="saas-section-shell border-t border-[color:var(--terminal-border)]/60 pb-24 pt-16 md:pb-32 md:pt-20">
      <Reveal>
        <div className="platform-gradient-border rounded-[10px] p-px">
          <div className="luxury-panel relative overflow-hidden rounded-[9px] px-6 py-12 md:grid md:grid-cols-12 md:items-center md:gap-10 md:px-10 md:py-14 lg:px-14">
            <div
              className="pointer-events-none absolute inset-0 opacity-70"
              style={{ background: "var(--platform-gradient-soft)" }}
              aria-hidden
            />
            <div className="relative md:col-span-7">
              <p className="luxury-kicker">Private access</p>
              <span
                className="luxury-rule mt-4 block max-w-[200px]"
                aria-hidden
              />
              <h2 className="mt-6 text-balance text-3xl font-light tracking-tight sm:text-4xl">
                Open your <span className="platform-gradient-text">desk</span>
              </h2>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-[color:var(--terminal-muted)] sm:text-[15px]">
                Valuation workspace is free in beta. When you are ready,
                marketplace and intelligence sit on the same login — one
                customised Ownerr experience.
              </p>
            </div>
            <div className="relative mt-10 flex flex-col gap-3 md:col-span-5 md:mt-0">
              <Link
                href={marketingRoutes.valuation}
                className="btn-platform-gradient group inline-flex h-12 items-center justify-center gap-2 rounded-[10px] text-sm font-bold"
              >
                Start valuation
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href={marketingRoutes.products}
                className="inline-flex h-12 items-center justify-center rounded-[10px] border border-[color:var(--terminal-border)] text-sm font-bold text-[color:var(--terminal-fg)] transition-colors hover:border-[color:var(--brand-orange)]/45"
              >
                Products
              </Link>
              <p className="pt-2 text-center text-xs text-[color:var(--terminal-muted)] md:text-left">
                <Link
                  href={marketplacePath("/acquire")}
                  className="font-semibold text-brand-lime hover:underline"
                >
                  Acquisitions
                </Link>
                <span className="mx-2 text-[color:var(--terminal-border)]">
                  /
                </span>
                <Link
                  href={marketingRoutes.ownerrOs}
                  className="font-semibold text-brand-orange hover:underline"
                >
                  Founder OS
                </Link>
              </p>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
