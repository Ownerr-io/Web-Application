import { useState } from "react";
import { Link } from "wouter";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import { ArrowRight, BarChart3, Lock, Sparkles, Zap } from "lucide-react";
import { ValuationIntroLottie } from "./ValuationIntroLottie";
import { fadeUp } from "@/components/landing/saas/motion";
import { marketingRoutes } from "@/routes/marketingRoutes";
import { marketplacePath } from "@/lib/appPaths";
import { cn } from "@/lib/utils";

type Props = {
  onContinue: () => void;
};

const PANEL_STATS = [
  { k: "IMPLIED_ARR", v: "$4.2M", tone: "lime" as const },
  { k: "NET_REV_RET", v: "108%", tone: "orange" as const },
  { k: "RULE_OF_40", v: "41", tone: "orange" as const },
  { k: "CONFIDENCE", v: "High", tone: "lime" as const },
] as const;

const toneText = {
  lime: "text-brand-lime",
  orange: "text-brand-orange",
};

const FEATURES = [
  {
    icon: Lock,
    title: "Confidential inputs",
    body: "Your metrics stay on your session until you choose to share or list.",
  },
  {
    icon: BarChart3,
    title: "Market comparables",
    body: "Ranges anchored to M&A multiples and venture pricing signals.",
  },
  {
    icon: Zap,
    title: "Executive readout",
    body: "Strategic cards on efficiency, retention, and acquisition appetite.",
  },
] as const;

export function ValuationIntroScene({ onContinue }: Props) {
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  const orbY = useTransform(scrollY, [0, 400], [0, reduce ? 0 : 24]);
  const [hasStarted, setHasStarted] = useState(false);

  if (hasStarted) {
    return (
      <div className="flex min-h-[min(70vh,32rem)] w-full flex-1 items-center justify-center py-10">
        <ValuationIntroLottie onFinished={onContinue} />
      </div>
    );
  }

  return (
    <div className="relative overflow-x-clip">
      <section
        id="valuation-overview"
        className="landing-saas-hero relative overflow-hidden border-b border-[color:var(--terminal-border)]/80"
      >
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <motion.div
            className="saas-hero-orb left-[-12%] top-0 h-[min(400px,52vw)] w-[min(400px,52vw)] opacity-45"
            style={{
              y: orbY,
              background:
                "color-mix(in srgb, var(--brand-lime) 20%, transparent)",
            }}
          />
          <motion.div
            className="saas-hero-orb right-[-8%] bottom-[-8%] h-[min(340px,44vw)] w-[min(340px,44vw)] opacity-32"
            style={{
              background:
                "color-mix(in srgb, var(--brand-orange) 16%, transparent)",
            }}
          />
        </div>

        <div className="saas-section-shell relative z-10 grid items-center gap-10 py-12 md:grid-cols-12 md:gap-8 md:py-16 lg:py-20">
          <motion.div
            initial={reduce ? false : "hidden"}
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
            className="md:col-span-6 lg:col-span-7"
          >
            <motion.span
              variants={fadeUp}
              custom={0}
              className="luxury-hero-kicker"
            >
              Valuation
            </motion.span>

            <motion.h1
              variants={fadeUp}
              custom={1}
              className="marketing-hero-title max-w-[24ch]"
            >
              <span className="text-[color:var(--terminal-display)]">
                Model your startup.
              </span>
              <span className="mt-1.5 block platform-gradient-text">
                See defensible ranges.
              </span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              custom={2}
              className="marketing-lead max-w-lg"
            >
              Institutional-style valuation bands, growth efficiency metrics,
              and strategic readouts — in about three minutes, on the same desk
              as marketplace and intelligence.
            </motion.p>

            <motion.div
              variants={fadeUp}
              custom={3}
              className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center"
            >
              <button
                type="button"
                onClick={() => setHasStarted(true)}
                className="btn-platform-gradient group inline-flex h-11 items-center justify-center gap-2 rounded-[10px] px-6 text-sm font-bold tracking-wide transition-transform hover:scale-[1.01] active:scale-[0.99]"
              >
                Start valuation
                <ArrowRight
                  className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                  aria-hidden
                />
              </button>
              <Link
                href={marketplacePath("/acquire")}
                className="inline-flex h-11 items-center justify-center rounded-[10px] border border-[color:var(--terminal-border)] bg-[color:var(--terminal-surface)]/30 px-6 text-sm font-semibold backdrop-blur-sm transition-colors hover:border-[color:var(--brand-orange)]/45"
              >
                Browse acquisitions
              </Link>
            </motion.div>

            <motion.p
              variants={fadeUp}
              custom={4}
              className="mt-8 text-xs font-medium text-[color:var(--terminal-muted)]"
            >
              <span className="text-[color:var(--terminal-fg)]">
                Free in beta
              </span>
              <span className="mx-2 text-[color:var(--terminal-border)]">
                ·
              </span>
              Confidential
              <span className="mx-2 text-[color:var(--terminal-border)]">
                ·
              </span>
              <Link
                href={marketingRoutes.howItWorks}
                className="text-brand-orange hover:underline"
              >
                How it works
              </Link>
            </motion.p>
          </motion.div>

          <motion.div
            initial={reduce ? false : { opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="md:col-span-6 lg:col-span-5"
          >
            <div className="luxury-panel overflow-hidden rounded-[12px]">
              <div className="flex items-center justify-between border-b border-[color:var(--terminal-border)]/80 px-4 py-3 sm:px-5">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[color:var(--terminal-muted)]">
                  Scenario output
                </span>
                <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider">
                  <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--brand-lime)] shadow-[0_0_8px_var(--brand-lime)]" />
                  Live preview
                </span>
              </div>
              <div className="grid gap-px bg-[color:var(--terminal-border)]/50 p-px sm:grid-cols-2">
                {PANEL_STATS.map((m) => (
                  <div
                    key={m.k}
                    className="bg-[color:var(--terminal-bg)]/90 px-4 py-4 backdrop-blur-sm sm:px-5 sm:py-5"
                  >
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[color:var(--terminal-muted)]">
                      {m.k}
                    </p>
                    <p
                      className={cn(
                        "mt-1.5 font-mono text-lg font-bold tabular-nums sm:text-xl",
                        toneText[m.tone],
                      )}
                    >
                      {m.v}
                    </p>
                  </div>
                ))}
              </div>
              <div className="border-t border-[color:var(--terminal-border)]/80 px-4 py-3.5 sm:px-5">
                <p className="text-[11px] leading-snug text-[color:var(--terminal-muted)]">
                  Outputs refresh as you edit inputs in the guided flow.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="saas-section-shell py-12 md:pb-16">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="luxury-kicker">What you get</p>
            <h2 className="marketing-section-heading">
              Built for operator-grade decisions
            </h2>
          </div>
          <p className="marketing-body-sm max-w-sm">
            Same engine that powers listing readiness and acquisition screens on
            OWNERR.
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {FEATURES.map((f, i) => (
            <motion.article
              key={f.title}
              initial={reduce ? false : { opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ delay: i * 0.06, duration: 0.45 }}
              className="saas-glass-card saas-glass-card-hover rounded-[12px] border border-[color:var(--terminal-border)]/70 p-5"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-[color:var(--terminal-border)]/80 bg-[color:var(--terminal-surface)]/80 text-brand-lime">
                <f.icon className="h-4 w-4" aria-hidden />
              </div>
              <h3 className="mt-4 text-sm font-bold text-[color:var(--terminal-fg)]">
                {f.title}
              </h3>
              <p className="marketing-body-sm mt-2">{f.body}</p>
            </motion.article>
          ))}
        </div>

        <div className="saas-glass-card mt-10 flex w-full flex-col gap-4 rounded-[14px] border border-[color:var(--terminal-border)]/80 p-6 sm:flex-row sm:items-center sm:justify-between sm:gap-8 sm:p-8">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <Sparkles
              className="mt-0.5 h-5 w-5 shrink-0 text-brand-orange"
              aria-hidden
            />
            <p className="marketing-body-sm min-w-0">
              <span className="font-bold text-[color:var(--terminal-fg)]">
                Ready?
              </span>{" "}
              Launch the analysis engine — a short animation, then the guided
              questionnaire.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setHasStarted(true)}
            className="btn-platform-gradient inline-flex h-11 w-full shrink-0 items-center justify-center gap-2 rounded-[10px] px-6 text-sm font-bold sm:w-auto"
          >
            Begin now
            <ArrowRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </section>
    </div>
  );
}
