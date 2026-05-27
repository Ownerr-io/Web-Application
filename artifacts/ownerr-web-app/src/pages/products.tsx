import { Link } from "wouter";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Network, Sparkles } from "lucide-react";
import { MarketingLayout } from "@/components/MarketingLayout";
import { fadeUp } from "@/components/landing/saas/motion";
import { authRegisterHref } from "@/lib/auth/routes";
import { PRODUCT_ITEMS } from "@/routes/publicNavConfig";
import { cn } from "@/lib/utils";

const PRODUCT_CARD_META: Record<
  string,
  { icon: typeof Sparkles; tags: string[]; accent: "lime" | "orange" }
> = {
  "ownerr-os": {
    icon: Sparkles,
    tags: ["Founder listing", "Referral loop", "Share-ready cards"],
    accent: "orange",
  },
  "ownerr-network": {
    icon: Network,
    tags: ["Profile & discovery", "Reputation", "Referrals & credits"],
    accent: "lime",
  },
};

export default function ProductsPage() {
  const reduce = useReducedMotion();

  return (
    <MarketingLayout hideProductContext>
      <div className="landing-terminal-palette relative overflow-x-clip">
        <section className="landing-saas-hero relative overflow-hidden border-b border-[color:var(--terminal-border)]/80">
          <div className="pointer-events-none absolute inset-0" aria-hidden>
            <div
              className="saas-hero-orb left-[-10%] top-0 h-[min(380px,50vw)] w-[min(380px,50vw)] opacity-40"
              style={{ background: "color-mix(in srgb, var(--brand-lime) 18%, transparent)" }}
            />
            <div
              className="saas-hero-orb right-[-8%] bottom-0 h-[min(320px,42vw)] w-[min(320px,42vw)] opacity-30"
              style={{ background: "color-mix(in srgb, var(--brand-orange) 16%, transparent)" }}
            />
          </div>

          <div className="saas-section-shell relative z-10 py-12 md:py-16 lg:py-20">
            <motion.div
              initial={reduce ? false : "hidden"}
              animate="visible"
              variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
              className="max-w-2xl"
            >
              <motion.span variants={fadeUp} custom={0} className="luxury-hero-kicker">
                Products
              </motion.span>
              <motion.h1 variants={fadeUp} custom={1} className="marketing-hero-title">
                <span className="text-[color:var(--terminal-display)]">Two products.</span>
                <span className="mt-1 block platform-gradient-text">One OWNERR account.</span>
              </motion.h1>
              <motion.p variants={fadeUp} custom={2} className="marketing-lead max-w-lg">
                Sign in once to access founder growth and workforce network products. Each product has its own landing
                page and guided onboarding.
              </motion.p>
            </motion.div>
          </div>
        </section>

        <section className="saas-section-shell py-12 md:py-16">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="luxury-kicker">Products</p>
              <h2 className="marketing-section-heading">
                Choose where to start
              </h2>
            </div>
            <p className="marketing-body-sm max-w-xs">
              Open a product overview, then sign in when you&apos;re ready for the full experience.
            </p>
          </div>

          <ul className="mt-8 grid gap-5 md:grid-cols-2">
            {PRODUCT_ITEMS.map((product, i) => {
              const meta = PRODUCT_CARD_META[product.id];
              const Icon = meta?.icon ?? Sparkles;
              return (
                <motion.li
                  key={product.id}
                  initial={reduce ? false : { opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08, duration: 0.5 }}
                >
                  <Link
                    href={product.href}
                    className="saas-glass-card saas-glass-card-hover group flex h-full flex-col rounded-[14px] border border-[color:var(--terminal-border)]/80 p-6 sm:p-7"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div
                        className={cn(
                          "flex h-11 w-11 items-center justify-center rounded-[11px] border border-[color:var(--terminal-border)]/80 bg-[color:var(--terminal-surface)]/80",
                          meta?.accent === "lime" ? "text-brand-lime" : "text-brand-orange",
                        )}
                      >
                        <Icon className="h-5 w-5" aria-hidden />
                      </div>
                      <span className="font-mono text-[10px] font-bold tabular-nums text-[color:var(--terminal-muted)]">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                    </div>

                    <h3 className="mt-5 text-lg font-bold text-[color:var(--terminal-fg)]">{product.label}</h3>
                    <p className="marketing-body-sm mt-2 flex-1">
                      {product.description}
                    </p>

                    {meta?.tags ? (
                      <ul className="mt-4 flex flex-wrap gap-1.5">
                        {meta.tags.map((tag) => (
                          <li
                            key={tag}
                            className="rounded-md border border-[color:var(--terminal-border)]/70 bg-[color:var(--terminal-bg)]/50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--terminal-muted)]"
                          >
                            {tag}
                          </li>
                        ))}
                      </ul>
                    ) : null}

                    <span className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-[color:var(--terminal-ochre)]">
                      View product
                      <ArrowRight
                        className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                        aria-hidden
                      />
                    </span>
                  </Link>
                </motion.li>
              );
            })}
          </ul>
        </section>

        <section className="saas-section-shell border-t border-[color:var(--terminal-border)]/60 py-12 md:py-14">
          <div className="saas-glass-card flex flex-col items-start justify-between gap-6 rounded-[14px] border border-[color:var(--terminal-border)]/80 p-6 sm:flex-row sm:items-center sm:p-8">
            <div>
              <p className="text-sm font-bold text-[color:var(--terminal-fg)]">New to OWNERR?</p>
              <p className="mt-1 max-w-md text-sm text-[color:var(--terminal-muted)]">
                Create one account to access every product app. You can add more products as we ship them.
              </p>
            </div>
            <Link
              href={authRegisterHref()}
              className="btn-platform-gradient inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-[10px] px-6 text-sm font-bold"
            >
              Get Started
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </section>
      </div>
    </MarketingLayout>
  );
}
