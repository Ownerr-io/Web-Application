import { Link } from "wouter";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, BarChart3, Building2, ShieldCheck } from "lucide-react";
import { MarketingLayout } from "@/components/MarketingLayout";
import { AcquisitionFlow } from "@/components/landing/AcquisitionFlow";
import { fadeUp } from "@/components/landing/saas/motion";
import { authRegisterHref } from "@/lib/auth/routes";
import { marketingRoutes } from "@/routes/marketingRoutes";
import { marketplacePath } from "@/lib/appPaths";

const ROLES = [
  {
    icon: Building2,
    title: "Founders & operators",
    points: [
      "Run scenario valuations with defensible ranges and confidence bands.",
      "Publish verified listings when you are ready — metrics stay aligned to the model.",
      "Track readiness scores buyers use in first-pass screens.",
    ],
  },
  {
    icon: BarChart3,
    title: "Investors & acquirers",
    points: [
      "Filter supply by retention, efficiency, and sector multiples in one desk view.",
      "Compare IOI timing and bid depth against rolling market intelligence.",
      "Move from indication to diligence without re-keying the same data room.",
    ],
  },
] as const;

const CHECKLIST = [
  "Revenue and growth inputs tied to valuation engine",
  "Strategic intelligence cards generated per scenario",
  "Verification stack before marketplace visibility",
  "Structured bid workflow with audit-friendly history",
] as const;

export default function HowItWorksPage() {
  const reduce = useReducedMotion();

  return (
    <MarketingLayout hideProductContext>
      <div className="landing-terminal-palette relative overflow-x-clip">
        <section className="landing-saas-hero relative overflow-hidden border-b border-[color:var(--terminal-border)]/80">
          <div className="pointer-events-none absolute inset-0" aria-hidden>
            <div
              className="saas-hero-orb left-[-10%] top-0 h-[min(380px,50vw)] w-[min(380px,50vw)] opacity-40"
              style={{
                background:
                  "color-mix(in srgb, var(--brand-lime) 18%, transparent)",
              }}
            />
            <div
              className="saas-hero-orb right-[-8%] bottom-0 h-[min(320px,42vw)] w-[min(320px,42vw)] opacity-30"
              style={{
                background:
                  "color-mix(in srgb, var(--brand-orange) 14%, transparent)",
              }}
            />
          </div>

          <div className="saas-section-shell relative z-10 py-12 md:py-16 lg:py-20">
            <motion.div
              initial={reduce ? false : "hidden"}
              animate="visible"
              variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
              className="max-w-2xl"
            >
              <motion.span
                variants={fadeUp}
                custom={0}
                className="luxury-hero-kicker"
              >
                How it works
              </motion.span>
              <motion.h1
                variants={fadeUp}
                custom={1}
                className="marketing-hero-title"
              >
                <span className="text-[color:var(--terminal-display)]">
                  From model
                </span>
                <span className="mt-1 block platform-gradient-text">
                  to mandate.
                </span>
              </motion.h1>
              <motion.p
                variants={fadeUp}
                custom={2}
                className="marketing-lead max-w-lg"
              >
                Valuation, intelligence, and marketplace execution share one
                spine — so you do not rebuild trust at every handoff.
              </motion.p>
              <motion.div
                variants={fadeUp}
                custom={3}
                className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center"
              >
                <Link
                  href={marketingRoutes.valuation}
                  className="btn-platform-gradient group inline-flex h-11 items-center justify-center gap-2 rounded-[10px] px-6 text-sm font-bold tracking-wide transition-transform hover:scale-[1.01] active:scale-[0.99]"
                >
                  Run valuation
                  <ArrowRight
                    className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </Link>
                <Link
                  href={marketplacePath("/acquire")}
                  className="inline-flex h-11 items-center justify-center rounded-[10px] border border-[color:var(--terminal-border)] bg-[color:var(--terminal-surface)]/30 px-6 text-sm font-semibold backdrop-blur-sm transition-colors hover:border-[color:var(--brand-orange)]/45"
                >
                  Browse acquisitions
                </Link>
              </motion.div>
            </motion.div>
          </div>
        </section>

        <section className="saas-section-shell border-b border-[color:var(--terminal-border)]/60 py-12 md:py-16">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="luxury-kicker">Workflow</p>
              <h2 className="marketing-section-heading">
                Four steps on one platform
              </h2>
            </div>
            <p className="marketing-body-sm max-w-sm">
              Each step feeds the next — intelligence informs listing, bids, and
              diligence.
            </p>
          </div>
          <div className="mt-8">
            <AcquisitionFlow />
          </div>
        </section>

        <section className="saas-section-shell py-12 md:py-16">
          <p className="luxury-kicker">Who it&apos;s for</p>
          <h2 className="marketing-section-heading">
            Built for both sides of the table
          </h2>
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {ROLES.map((role, i) => (
              <motion.article
                key={role.title}
                initial={reduce ? false : { opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ delay: i * 0.06, duration: 0.45 }}
                className="saas-glass-card saas-glass-card-hover rounded-[12px] border border-[color:var(--terminal-border)]/70 p-6"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-[color:var(--terminal-border)]/80 bg-[color:var(--terminal-surface)]/80 text-brand-lime">
                  <role.icon className="h-4 w-4" aria-hidden />
                </div>
                <h3 className="mt-4 text-base font-bold text-[color:var(--terminal-fg)]">
                  {role.title}
                </h3>
                <ul className="mt-4 space-y-3">
                  {role.points.map((point) => (
                    <li key={point} className="marketing-body-sm flex gap-2.5">
                      <span
                        className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[color:var(--brand-lime)]"
                        aria-hidden
                      />
                      {point}
                    </li>
                  ))}
                </ul>
              </motion.article>
            ))}
          </div>
        </section>

        <section className="saas-section-shell border-t border-[color:var(--terminal-border)]/60 py-12 md:py-14">
          <div className="saas-glass-card rounded-[14px] border border-[color:var(--terminal-border)]/80 p-6 sm:p-8">
            <div className="flex items-start gap-3">
              <ShieldCheck
                className="h-5 w-5 shrink-0 text-brand-orange"
                aria-hidden
              />
              <div>
                <h2 className="text-lg font-semibold text-[color:var(--terminal-display)]">
                  Acquisition readiness
                </h2>
                <p className="marketing-body-sm mt-2 max-w-2xl">
                  Verification and readiness scores align buyer expectations
                  before first contact. Sellers see the same progression
                  in-product — fewer broken processes late in cycle.
                </p>
              </div>
            </div>
            <ul className="mt-6 grid gap-2 sm:grid-cols-2">
              {CHECKLIST.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2 rounded-[8px] border border-[color:var(--terminal-border)]/70 bg-[color:var(--terminal-bg)]/50 px-3 py-2.5 text-xs font-medium leading-relaxed text-[color:var(--terminal-fg)]"
                >
                  <span
                    className="font-mono text-[color:var(--terminal-ochre)]"
                    aria-hidden
                  >
                    ✓
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="saas-section-shell pb-14 pt-4 md:pb-20">
          <div className="luxury-rule mb-8" aria-hidden />
          <div className="saas-glass-card flex flex-col items-start justify-between gap-6 rounded-[14px] border border-[color:var(--terminal-border)]/80 p-6 sm:flex-row sm:items-center sm:p-8">
            <div>
              <p className="text-sm font-bold text-[color:var(--terminal-fg)]">
                Ready to open your desk?
              </p>
              <p className="mt-1 max-w-md text-sm text-[color:var(--terminal-muted)]">
                Start with valuation, explore intelligence, or jump into the
                marketplace — one account.
              </p>
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <Link
                href={authRegisterHref()}
                className="btn-platform-gradient inline-flex h-11 items-center justify-center gap-2 rounded-[10px] px-6 text-sm font-bold"
              >
                Get Started
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link
                href={marketingRoutes.marketIntelligence}
                className="inline-flex h-11 items-center justify-center rounded-[10px] border border-[color:var(--terminal-border)] px-6 text-sm font-semibold transition-colors hover:border-[color:var(--brand-lime)]/40"
              >
                Intelligence
              </Link>
            </div>
          </div>
        </section>
      </div>
    </MarketingLayout>
  );
}
