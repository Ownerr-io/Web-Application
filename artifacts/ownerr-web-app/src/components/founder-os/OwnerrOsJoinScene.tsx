import { Link } from "wouter";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import { Gift, Share2, Sparkles, UserPlus, Zap } from "lucide-react";
import { fadeUp } from "@/components/landing/saas/motion";
import { OWNERR_OS_SHARE_CARD_PATH } from "@/lib/ownerrOsShareAssets";
import { marketingRoutes } from "@/routes/marketingRoutes";
import { OwnerrOsJoinAuthSection } from "@/components/founder-os/OwnerrOsJoinAuthSection";

const PERKS = [
  {
    icon: Share2,
    title: "Share-ready in minutes",
    body: "Cards and captions sized for LinkedIn, X, WhatsApp, and Instagram.",
  },
  {
    icon: Zap,
    title: "Referral loop built in",
    body: "Your link attributes signups so growth compounds without spreadsheets.",
  },
  {
    icon: Gift,
    title: "Programs & visibility",
    body: "Chance to Win $250k — top founders get Founders Capital exposure.",
  },
] as const;

const STEPS = [
  { n: "01", label: "Draft", detail: "Share your idea — no account yet" },
  { n: "02", label: "List", detail: "Guided startup profile" },
  { n: "03", label: "Share", detail: "Send your link — grow the loop" },
] as const;

type Props = {
  referralCode?: string | null;
};

export function OwnerrOsJoinScene({ referralCode }: Props) {
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  const orbY = useTransform(scrollY, [0, 400], [0, reduce ? 0 : 24]);

  return (
    <div className="relative overflow-x-clip">
      <section className="landing-saas-hero relative overflow-hidden border-b border-[color:var(--terminal-border)]/80">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <motion.div
            className="saas-hero-orb left-[-12%] top-0 h-[min(420px,55vw)] w-[min(420px,55vw)] opacity-45"
            style={{
              y: orbY,
              background:
                "color-mix(in srgb, var(--brand-lime) 20%, transparent)",
            }}
          />
          <motion.div
            className="saas-hero-orb right-[-8%] bottom-[-10%] h-[min(360px,45vw)] w-[min(360px,45vw)] opacity-35"
            style={{
              background:
                "color-mix(in srgb, var(--brand-orange) 18%, transparent)",
            }}
          />
        </div>

        <div className="ownerr-os-join-shell relative z-10 flex flex-col gap-8 py-10 md:gap-10 md:py-14 lg:py-16">
          <motion.div
            initial={reduce ? false : "hidden"}
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
            className="w-full max-w-4xl space-y-4"
          >
            <motion.span
              variants={fadeUp}
              custom={0}
              className="luxury-kicker block"
            >
              OWNERR OS · Referral invite
            </motion.span>

            <motion.h1
              variants={fadeUp}
              custom={1}
              className="marketing-hero-title max-w-3xl"
            >
              <span className="text-[color:var(--terminal-display)]">
                A founder invited you.
              </span>
              <span className="mt-1.5 block platform-gradient-text">
                Your turn to get seen.
              </span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              custom={2}
              className="marketing-lead max-w-2xl"
            >
              List your startup, unlock share assets and a personal referral
              link, and grow reach across channels — built for operators who
              ship, not slide decks.
            </motion.p>

            {referralCode ? (
              <motion.div
                variants={fadeUp}
                custom={2.5}
                className="inline-flex items-center gap-2 rounded-[10px] border border-[color:var(--brand-orange)]/35 bg-[color:var(--brand-orange)]/10 px-3 py-2"
              >
                <UserPlus
                  className="h-4 w-4 text-[color:var(--brand-orange)]"
                  aria-hidden
                />
                <span className="text-xs font-bold text-[color:var(--terminal-fg)]">
                  Referred by{" "}
                  <span className="font-mono text-[color:var(--brand-orange)]">
                    {referralCode}
                  </span>
                </span>
              </motion.div>
            ) : null}
          </motion.div>

          <div className="grid w-full items-start gap-8 lg:grid-cols-2 lg:gap-10 xl:gap-12">
            <motion.div
              initial={reduce ? false : "hidden"}
              animate="visible"
              variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
              className="flex min-w-0 w-full flex-col gap-5"
            >
              <motion.div variants={fadeUp} custom={0} className="w-full">
                <OwnerrOsJoinAuthSection referralCode={referralCode} />
              </motion.div>
            </motion.div>

            <motion.div
              initial={reduce ? false : { opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="min-w-0 w-full lg:sticky lg:top-[5.5rem] lg:self-start"
            >
              <div className="luxury-panel flex h-full w-full flex-col overflow-hidden rounded-[12px]">
                <div className="flex items-center justify-between border-b border-[color:var(--terminal-border)]/80 px-4 py-3 sm:px-5">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[color:var(--terminal-muted)]">
                    Founder share card
                  </span>
                  <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[color:var(--terminal-fg)]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--brand-lime)] shadow-[0_0_8px_var(--brand-lime)]" />
                    Viral ready
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-3 sm:p-4">
                  <div className="overflow-hidden rounded-[10px] border border-[color:var(--terminal-border)] ring-1 ring-[color:var(--brand-orange)]/15">
                    <img
                      src={OWNERR_OS_SHARE_CARD_PATH}
                      alt="OWNERR OS — Chance to win up to $250k"
                      className="aspect-[1200/630] w-full object-cover"
                      width={1200}
                      height={630}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section
        id="join-perks"
        className="ownerr-os-join-shell border-b border-[color:var(--terminal-border)]/60 py-12 md:py-16"
      >
        <div className="flex flex-col items-start gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-2">
            <p className="luxury-kicker">Why join now</p>
            <h2 className="marketing-section-heading">
              Everything you need to launch reach
            </h2>
          </div>
          <p className="marketing-body-sm max-w-md lg:text-right">
            You were invited into the loop — finish signup and publish your
            listing in one sitting.
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {PERKS.map((f, i) => (
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
              <h3 className="mt-4 text-sm font-bold text-[color:var(--terminal-fg)]">
                {f.title}
              </h3>
              <p className="marketing-body-sm mt-2">{f.body}</p>
            </motion.article>
          ))}
        </div>
      </section>

      <section className="ownerr-os-join-shell py-12 md:py-14">
        <div className="luxury-rule mb-8" aria-hidden />
        <div className="grid gap-8 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-5">
            <p className="luxury-kicker">How it works</p>
            <h2 className="marketing-section-heading">
              Three steps after you sign up
            </h2>
            <ul className="mt-6 space-y-4">
              {STEPS.map((s) => (
                <li key={s.n} className="flex gap-4">
                  <span className="font-mono text-xs font-bold tabular-nums text-[color:var(--terminal-ochre)]">
                    {s.n}
                  </span>
                  <span>
                    <span className="block text-sm font-bold text-[color:var(--terminal-fg)]">
                      {s.label}
                    </span>
                    <span className="text-sm text-[color:var(--terminal-muted)]">
                      {s.detail}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-7">
            <div className="saas-glass-card flex flex-col items-start justify-between gap-6 rounded-[14px] border border-[color:var(--terminal-border)]/80 p-6 sm:flex-row sm:items-center sm:p-8">
              <div className="flex gap-3">
                <Sparkles
                  className="mt-0.5 h-5 w-5 shrink-0 text-[color:var(--brand-lime)]"
                  aria-hidden
                />
                <div>
                  <p className="text-sm font-bold text-[color:var(--terminal-fg)]">
                    Ready to claim your spot?
                  </p>
                  <p className="mt-1 max-w-md text-sm text-[color:var(--terminal-muted)]">
                    Your referral is saved — sign up once and we&apos;ll
                    attribute your invite through the full flow.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <p className="mt-10 text-center text-sm text-[color:var(--terminal-muted)]">
          <Link
            href={marketingRoutes.home}
            className="font-bold text-brand-orange hover:underline"
          >
            Explore the full Ownerr platform
          </Link>
        </p>
      </section>
    </div>
  );
}
