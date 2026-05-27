import { useLocation } from "wouter";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, Link2, Share2, Sparkles, TrendingUp, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fadeUp } from "@/components/landing/saas/motion";
import { useRequireAuth } from "@/lib/platform/requireAuth";
import { PRODUCT_ITEMS } from "@/routes/publicNavConfig";
import { cn } from "@/lib/utils";

type Props = {
  onContinue: () => void;
  secondaryCtaHref?: string;
  secondaryCtaLabel?: string;
};

const ownerrOsProduct = PRODUCT_ITEMS.find((p) => p.id === "ownerr-os")!;

const PANEL_STATS = [
  { k: "REFERRAL_CLICKS", v: "1.2k", tone: "lime" as const },
  { k: "SHARE_VIEWS", v: "8.4k", tone: "orange" as const },
  { k: "CONVERSION", v: "12.4%", tone: "orange" as const },
  { k: "LISTING", v: "Live", tone: "lime" as const },
] as const;

const toneText = {
  lime: "text-brand-lime",
  orange: "text-brand-orange",
};

const FEATURES = [
  {
    icon: Share2,
    title: "Share-ready cards",
    body: "Export founder and startup cards sized for LinkedIn, X, WhatsApp, and Instagram.",
  },
  {
    icon: Link2,
    title: "Referral loop",
    body: "Track signups from your link and attribute growth without spreadsheets.",
  },
  {
    icon: TrendingUp,
    title: "Capital path",
    body: "Structured listing flow surfaces programs for qualifying founders.",
  },
] as const;

const STEPS = [
  { n: "01", label: "List", detail: "Guided startup profile" },
  { n: "02", label: "Share", detail: "Social + referral assets" },
  { n: "03", label: "Grow", detail: "Track reach and referrals" },
] as const;

export function FounderOsIntroScene({
  onContinue,
  secondaryCtaHref,
  secondaryCtaLabel,
}: Props) {
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  const orbY = useTransform(scrollY, [0, 400], [0, reduce ? 0 : 24]);
  const [, setLocation] = useLocation();
  const { requireSession } = useRequireAuth();

  const openApp = () => {
    if (secondaryCtaHref) {
      setLocation(secondaryCtaHref);
      return;
    }
    requireSession(() => setLocation(ownerrOsProduct.appHref), { productPath: ownerrOsProduct.appHref });
  };

  return (
    <div className="relative overflow-x-clip">
      <section
        id="product-overview"
        className="landing-saas-hero relative overflow-hidden border-b border-[color:var(--terminal-border)]/80"
      >
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <motion.div
            className="saas-hero-orb left-[-12%] top-0 h-[min(420px,55vw)] w-[min(420px,55vw)] opacity-45"
            style={{
              y: orbY,
              background: "color-mix(in srgb, var(--brand-lime) 20%, transparent)",
            }}
          />
          <motion.div
            className="saas-hero-orb right-[-8%] bottom-[-10%] h-[min(360px,45vw)] w-[min(360px,45vw)] opacity-35"
            style={{
              background: "color-mix(in srgb, var(--brand-orange) 18%, transparent)",
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
            <motion.span variants={fadeUp} custom={0} className="luxury-hero-kicker">
              OWNERR OS
            </motion.span>

            <motion.h1 variants={fadeUp} custom={1} className="marketing-hero-title max-w-[24ch]">
              <span className="text-[color:var(--terminal-display)]">List your startup.</span>
              <span className="mt-1.5 block platform-gradient-text">Grow with referrals.</span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              custom={2}
              className="marketing-lead max-w-lg"
            >
              Founder listing, share cards, and referral attribution in one flow — built for operators who ship, not
              slide decks.
            </motion.p>

            <motion.div variants={fadeUp} custom={3} className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button
                type="button"
                onClick={openApp}
                className="btn-platform-gradient h-11 rounded-[10px] px-6 text-sm font-bold"
              >
                {secondaryCtaLabel ?? ownerrOsProduct.openLabel}
              </Button>
            </motion.div>

            <motion.p variants={fadeUp} custom={4} className="mt-8 text-xs font-medium text-[color:var(--terminal-muted)]">
              <span className="text-[color:var(--terminal-fg)]">~3 min setup</span>
              <span className="mx-2 text-[color:var(--terminal-border)]">·</span>
              Sample data included
              <span className="mx-2 text-[color:var(--terminal-border)]">·</span>
              <a href="#features" className="text-brand-orange hover:underline">
                See capabilities
              </a>
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
                  Founder desk
                </span>
                <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[color:var(--terminal-fg)]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--brand-lime)] shadow-[0_0_8px_var(--brand-lime)]" />
                  Live
                </span>
              </div>
              <div className="grid gap-px bg-[color:var(--terminal-border)]/50 p-px sm:grid-cols-2">
                {PANEL_STATS.map((m) => (
                  <div key={m.k} className="bg-[color:var(--terminal-bg)]/90 px-4 py-4 backdrop-blur-sm sm:px-5 sm:py-5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[color:var(--terminal-muted)]">
                      {m.k}
                    </p>
                    <p className={cn("mt-1.5 font-mono text-lg font-bold tabular-nums sm:text-xl", toneText[m.tone])}>
                      {m.v}
                    </p>
                  </div>
                ))}
              </div>
              <div className="border-t border-[color:var(--terminal-border)]/80 px-4 py-3.5 sm:px-5">
                <div className="flex items-start gap-3 rounded-[8px] border border-[color:var(--terminal-border)]/60 bg-[color:var(--terminal-surface)]/40 p-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] bg-[color:var(--terminal-ochre)]/15 text-[color:var(--terminal-ochre)]">
                    <Users className="h-4 w-4" aria-hidden />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-[color:var(--terminal-fg)]">Acme Labs · Seed</p>
                    <p className="mt-0.5 text-[11px] leading-snug text-[color:var(--terminal-muted)]">
                      Referral link active · 24h share window
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section id="features" className="saas-section-shell border-b border-[color:var(--terminal-border)]/60 py-12 md:py-16">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="luxury-kicker">Capabilities</p>
            <h2 className="marketing-section-heading">Everything in the listing flow</h2>
          </div>
          <p className="marketing-body-sm max-w-sm">
            One product surface for founders — no separate tools for cards, links, and tracking.
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
              <div className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-[color:var(--terminal-border)]/80 bg-[color:var(--terminal-surface)]/80 text-[color:var(--brand-orange)]">
                <f.icon className="h-4 w-4" aria-hidden />
              </div>
              <h3 className="mt-4 text-sm font-bold text-[color:var(--terminal-fg)]">{f.title}</h3>
              <p className="marketing-body-sm mt-2">{f.body}</p>
            </motion.article>
          ))}
        </div>
      </section>

      <section className="saas-section-shell py-12 md:py-14">
        <div className="luxury-rule mb-8" aria-hidden />
        <div className="grid gap-8 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-5">
            <p className="luxury-kicker">How it works</p>
            <h2 className="marketing-section-heading">Three steps to go live</h2>
            <ul className="mt-6 space-y-4">
              {STEPS.map((s) => (
                <li key={s.n} className="flex gap-4">
                  <span className="font-mono text-xs font-bold tabular-nums text-[color:var(--terminal-ochre)]">{s.n}</span>
                  <span>
                    <span className="block text-sm font-bold text-[color:var(--terminal-fg)]">{s.label}</span>
                    <span className="text-sm text-[color:var(--terminal-muted)]">{s.detail}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-7">
            <div className="saas-glass-card flex flex-col items-start justify-between gap-6 rounded-[14px] border border-[color:var(--terminal-border)]/80 p-6 sm:flex-row sm:items-center sm:p-8">
              <div className="flex gap-3">
                <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-[color:var(--brand-lime)]" aria-hidden />
                <div>
                  <p className="text-sm font-bold text-[color:var(--terminal-fg)]">Ready to publish your listing?</p>
                  <p className="mt-1 max-w-md text-sm text-[color:var(--terminal-muted)]">
                    The guided form pre-fills a sample startup so you can see the full experience in minutes.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
