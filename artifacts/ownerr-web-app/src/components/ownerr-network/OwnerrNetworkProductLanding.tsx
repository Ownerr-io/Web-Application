import { Link, useLocation } from "wouter";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import { ArrowRight, Coins, Crown, Link2, Users } from "lucide-react";
import { fadeUp } from "@/components/landing/saas/motion";
import { OwnerrNetworkLandingCtas } from "@/components/ownerr-network/OwnerrNetworkLandingCtas";
import { useRequireAuth } from "@/lib/platform/requireAuth";
import { authRegisterHref } from "@/lib/auth/routes";
import { marketingRoutes } from "@/routes/marketingRoutes";
import { PRODUCT_ITEMS } from "@/routes/publicNavConfig";
import type { LeaderboardEntry } from "@/lib/ownerr-network/types";
import { publicAssetPath } from "@/lib/ownerrOsShareAssets";

const networkProduct = PRODUCT_ITEMS.find((p) => p.id === "ownerr-network")!;

const NETWORK_COMMUNITY_VIDEO = publicAssetPath(
  "Animated_mosaic_of_diverse_people_202605242205.mp4",
);

/** Full frame visible (no crop); letterbox bars use terminal bg. */
const COMMUNITY_VIDEO_CLASS =
  "h-full w-full bg-[color:var(--terminal-bg)] object-contain";

const FEATURES = [
  {
    icon: Users,
    title: "Every skill, every budget",
    body: "A discovery network — not a gig marketplace clone. List what you do and who you want to reach.",
  },
  {
    icon: Link2,
    title: "Referral loop",
    body: "Your link tracks signups. Earn points when your network joins and stays active.",
  },
  {
    icon: Coins,
    title: "Points → credits",
    body: "1 point = ₹1 in platform credits from signup, referrals, verification, and daily activity.",
  },
] as const;

const STEPS = [
  { n: "01", label: "Join", detail: "Create your profile in minutes" },
  { n: "02", label: "Refer", detail: "Share your personal link" },
  { n: "03", label: "Earn", detail: "Points, leaderboard, rewards" },
] as const;

const FAQ = [
  {
    q: "Is this Fiverr or Upwork?",
    a: "No. Ownerr Network is workforce discovery — every skill, budget, and industry.",
  },
  {
    q: "What does ₹1/month do?",
    a: "It filters real users and keeps the network high-signal. Core listing and referrals stay free.",
  },
  {
    q: "How do points work?",
    a: "1 point = ₹1 in platform credits. Earn via signup, referrals, survey, verification, and daily activity.",
  },
] as const;

type Props = {
  leaders: LeaderboardEntry[];
  liveCount: number;
  authLoading: boolean;
  loggedIn: boolean;
};

export function OwnerrNetworkProductLanding({
  leaders,
  liveCount,
  authLoading,
  loggedIn,
}: Props) {
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  const orbY = useTransform(scrollY, [0, 400], [0, reduce ? 0 : 24]);
  const [, setLocation] = useLocation();
  const { requireSession } = useRequireAuth();

  const openApp = () => {
    requireSession(() => setLocation(networkProduct.appHref), {
      productPath: networkProduct.appHref,
    });
  };

  const registerHref = authRegisterHref({
    product: "ownerr-network",
    redirect: marketingRoutes.ownerrNetworkOnboarding,
  });

  return (
    <div className="landing-terminal-palette relative overflow-x-clip pb-12 text-[color:var(--terminal-fg)] md:pb-16">
      <section
        id="product-overview"
        className="landing-saas-hero relative overflow-hidden border-b border-[color:var(--terminal-border)]/80 md:min-h-[min(92svh,900px)]"
      >
        <div className="pointer-events-none absolute inset-0 z-0" aria-hidden>
          <video
            className={COMMUNITY_VIDEO_CLASS}
            src={NETWORK_COMMUNITY_VIDEO}
            autoPlay={!reduce}
            muted
            loop
            playsInline
            preload="auto"
            tabIndex={-1}
            aria-hidden
          />
          <div className="absolute inset-0 bg-[color:var(--terminal-bg)]/55" />
          <div className="absolute inset-0 bg-gradient-to-b from-[color:var(--terminal-bg)]/96 via-[color:var(--terminal-bg)]/88 to-[color:var(--terminal-bg)]/72 md:hidden" />
          <div className="absolute inset-0 hidden bg-gradient-to-r from-[color:var(--terminal-bg)] via-[color:var(--terminal-bg)]/88 to-[color:var(--terminal-bg)]/45 md:block" />
          <div className="absolute inset-0 bg-gradient-to-t from-[color:var(--terminal-bg)] via-[color:var(--terminal-bg)]/25 to-[color:var(--terminal-bg)]/35" />
          <motion.div
            className="saas-hero-orb left-[-12%] top-0 h-[min(400px,52vw)] w-[min(400px,52vw)] opacity-25 mix-blend-screen"
            style={{
              y: orbY,
              background:
                "color-mix(in srgb, var(--brand-lime) 22%, transparent)",
            }}
          />
          <motion.div
            className="saas-hero-orb right-[-8%] bottom-[-8%] h-[min(340px,44vw)] w-[min(340px,44vw)] opacity-20 mix-blend-screen"
            style={{
              background:
                "color-mix(in srgb, var(--brand-orange) 15%, transparent)",
            }}
          />
        </div>

        <div className="saas-section-shell relative z-10 grid items-start gap-8 py-10 sm:gap-9 sm:py-12 md:min-h-[min(92svh,900px)] md:grid-cols-12 md:items-center md:gap-8 md:py-16 lg:py-20">
          <motion.div
            initial={reduce ? false : "hidden"}
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
            className="min-w-0 md:col-span-6 lg:col-span-7 [&_.marketing-hero-title]:drop-shadow-[0_2px_24px_rgba(0,0,0,0.85)] [&_.marketing-lead]:drop-shadow-[0_1px_12px_rgba(0,0,0,0.75)]"
          >
            <motion.span
              variants={fadeUp}
              custom={0}
              className="luxury-hero-kicker"
            >
              Ownerr Network
            </motion.span>

            <motion.h1
              variants={fadeUp}
              custom={1}
              className="marketing-hero-title max-w-[22ch] text-balance sm:max-w-[28ch]"
            >
              <span className="text-[color:var(--terminal-display)]">
                NOT EVERYONE HAS A JOB.
              </span>
              <span className="mt-1.5 block platform-gradient-text">
                EVERYONE HAS VALUE.
              </span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              custom={2}
              className="marketing-lead max-w-lg"
            >
              Build your profile. Grow your network. Unlock opportunities —
              discovery and reputation first, referrals as a growth loop.
              Platform credits, not cash promises.
            </motion.p>

            <motion.div
              variants={fadeUp}
              custom={3}
              className="mt-8 min-h-[2.75rem]"
            >
              {authLoading ? (
                <div className="h-11 w-full max-w-sm animate-pulse rounded-[10px] bg-[color:var(--terminal-surface)]" />
              ) : loggedIn ? (
                <OwnerrNetworkLandingCtas variant="hero" />
              ) : (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Link
                    href={registerHref}
                    className="btn-platform-gradient group inline-flex h-11 items-center justify-center gap-2 rounded-[10px] px-6 text-sm font-bold tracking-wide transition-transform hover:scale-[1.01] active:scale-[0.99]"
                  >
                    Create account
                    <ArrowRight
                      className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                      aria-hidden
                    />
                  </Link>
                  <button
                    type="button"
                    onClick={openApp}
                    className="inline-flex h-11 items-center justify-center rounded-[10px] border border-[color:var(--terminal-border)] bg-[color:var(--terminal-surface)]/30 px-6 text-sm font-semibold backdrop-blur-sm transition-colors hover:border-[color:var(--brand-lime)]/40 hover:bg-[color:var(--terminal-surface)]/50"
                  >
                    Join Ownerr Network
                  </button>
                </div>
              )}
            </motion.div>

            <motion.p
              variants={fadeUp}
              custom={4}
              className="mt-6 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium text-[color:var(--terminal-muted)] sm:mt-8"
            >
              <span className="text-[color:var(--terminal-fg)]">
                {liveCount.toLocaleString()} members active
              </span>
              <span
                className="hidden text-[color:var(--terminal-border)] sm:inline"
                aria-hidden
              >
                ·
              </span>
              <Link
                href={marketingRoutes.ownerrNetworkLeaderboard}
                className="text-brand-lime hover:underline"
              >
                Leaderboard
              </Link>
              <span
                className="hidden text-[color:var(--terminal-border)] sm:inline"
                aria-hidden
              >
                ·
              </span>
              <a href="#faq" className="text-brand-orange hover:underline">
                FAQ
              </a>
            </motion.p>
          </motion.div>

          <motion.div
            initial={reduce ? false : { opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="min-w-0 md:col-span-6 lg:col-span-5"
          >
            <div className="luxury-panel overflow-hidden rounded-[12px] border border-[color:var(--terminal-border)]/80 bg-[color:var(--terminal-surface)]/40 shadow-[0_24px_80px_-32px_rgba(0,0,0,0.65)] backdrop-blur-md">
              <div className="border-b border-[color:var(--terminal-border)]/80 bg-gradient-to-br from-[color:var(--brand-lime)]/10 via-transparent to-[color:var(--brand-orange)]/10 px-4 py-4 sm:px-5 sm:py-5">
                <p className="text-xs font-semibold leading-snug text-[color:var(--terminal-display)]">
                  Real people. Every skill. One network.
                </p>
                <p className="mt-1 hidden text-[10px] leading-snug text-[color:var(--terminal-muted)] sm:block">
                  Same community mosaic in the section below — use player
                  controls there for sound.
                </p>
              </div>
              <div className="flex items-center justify-between border-b border-[color:var(--terminal-border)]/80 px-4 py-3 sm:px-5">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[color:var(--terminal-muted)]">
                  Network pulse
                </span>
                <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider">
                  <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--brand-lime)] shadow-[0_0_8px_var(--brand-lime)]" />
                  Live
                </span>
              </div>
              <div className="border-b border-[color:var(--terminal-border)]/60 px-4 py-4 sm:px-5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[color:var(--terminal-muted)]">
                  Active members
                </p>
                <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-brand-lime">
                  {liveCount.toLocaleString()}
                </p>
              </div>
              <div className="px-2 py-2">
                <p className="px-2 pb-2 text-[10px] font-bold uppercase tracking-wider text-[color:var(--terminal-muted)]">
                  Top earners
                </p>
                <ul className="space-y-1">
                  {leaders.length === 0 ? (
                    <li className="rounded-[8px] border border-dashed border-[color:var(--terminal-border)] px-3 py-4 text-center text-[11px] text-[color:var(--terminal-muted)]">
                      Live rankings appear when Supabase is connected.
                    </li>
                  ) : (
                    leaders.slice(0, 4).map((u, i) => (
                      <li
                        key={u.id}
                        className="flex min-w-0 items-center justify-between gap-2 rounded-[8px] px-3 py-2.5 hover:bg-[color:var(--terminal-surface)]/50"
                      >
                        <span className="flex min-w-0 items-center gap-2 text-sm font-semibold">
                          {i === 0 ? (
                            <Crown
                              className="h-4 w-4 shrink-0 text-brand-orange"
                              aria-hidden
                            />
                          ) : (
                            <span className="w-4 shrink-0 text-center font-mono text-[10px] text-[color:var(--terminal-muted)]">
                              {i + 1}
                            </span>
                          )}
                          <span className="truncate">@{u.username}</span>
                        </span>
                        <span className="shrink-0 font-mono text-xs font-bold tabular-nums text-brand-lime">
                          {u.points} pts
                        </span>
                      </li>
                    ))
                  )}
                </ul>
                <Link
                  href={marketingRoutes.ownerrNetworkLeaderboard}
                  className="mt-2 block px-3 py-2 text-xs font-bold text-[color:var(--terminal-ochre)] hover:underline"
                >
                  View full leaderboard →
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section
        aria-label="Community preview"
        className="relative overflow-hidden border-b border-[color:var(--terminal-border)]/60 bg-[color:var(--terminal-surface)]/20"
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          aria-hidden
        >
          <div className="saas-hero-orb left-1/2 top-1/2 h-[min(520px,70vw)] w-[min(520px,70vw)] -translate-x-1/2 -translate-y-1/2 bg-[color:var(--brand-lime)]/10" />
        </div>
        <div className="saas-section-shell relative z-10 grid items-start gap-8 py-10 sm:py-12 md:grid-cols-12 md:items-center md:gap-10 md:py-16">
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5 }}
            className="min-w-0 md:col-span-5"
          >
            <p className="luxury-kicker">The network</p>
            <h2 className="marketing-section-heading mt-2">
              Built for people, not profiles in a void
            </h2>
            <p className="marketing-body-sm mt-4 max-w-md">
              Ownerr Network is a living community of founders, freelancers,
              students, and operators — discoverable, referable, and rewarded on
              one platform.
            </p>
          </motion.div>
          <motion.div
            initial={reduce ? false : { opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.55, delay: 0.05 }}
            className="min-w-0 md:col-span-7"
          >
            <div className="saas-glass-card overflow-hidden rounded-[12px] border border-[color:var(--terminal-border)]/80 shadow-[0_24px_80px_-24px_rgba(0,0,0,0.55)]">
              <div className="flex min-w-0 items-center gap-2 border-b border-[color:var(--terminal-border)]/70 px-3 py-2.5 sm:px-4">
                <span className="h-2 w-2 shrink-0 rounded-full bg-[color:var(--brand-orange)]/80" />
                <span className="h-2 w-2 shrink-0 rounded-full bg-[color:var(--terminal-muted)]/50" />
                <span className="h-2 w-2 shrink-0 rounded-full bg-[color:var(--terminal-muted)]/50" />
                <span className="ml-auto truncate text-[10px] font-mono text-[color:var(--terminal-muted)]">
                  ownerr.network
                </span>
              </div>
              <div className="relative aspect-video max-h-[min(52vw,280px)] w-full overflow-hidden bg-[color:var(--terminal-bg)] sm:max-h-none">
                <video
                  className={COMMUNITY_VIDEO_CLASS}
                  src={NETWORK_COMMUNITY_VIDEO}
                  autoPlay={!reduce}
                  muted
                  loop
                  playsInline
                  controls
                  preload="auto"
                  aria-label="Ownerr Network community mosaic — use controls for sound"
                />
                <div
                  className="pointer-events-none absolute inset-x-0 bottom-0 hidden bg-gradient-to-t from-[color:var(--terminal-bg)]/90 to-transparent px-4 py-2 sm:block"
                  aria-hidden
                >
                  <p className="text-center text-xs font-semibold text-[color:var(--terminal-display)]">
                    Discovery · Referrals · Platform credits
                  </p>
                  <p className="mt-0.5 text-center text-[10px] text-[color:var(--terminal-muted)]">
                    Unmute in the player for audio (hero video stays silent)
                  </p>
                </div>
              </div>
              <p className="border-t border-[color:var(--terminal-border)]/60 px-3 py-2.5 text-center text-[10px] text-[color:var(--terminal-muted)] sm:hidden">
                Discovery · Referrals · Platform credits — unmute in the player
                for audio
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      <section
        id="features"
        className="saas-section-shell border-b border-[color:var(--terminal-border)]/60 py-10 sm:py-12 md:py-16"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="luxury-kicker">Capabilities</p>
            <h2 className="marketing-section-heading">
              Built for discovery and rewards
            </h2>
          </div>
          <p className="marketing-body-sm max-w-sm">
            Profile, referrals, and credits in one product — sign in once with
            your OWNERR account.
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
      </section>

      <section className="saas-section-shell py-12 md:py-14">
        <div className="luxury-rule mb-8" aria-hidden />
        <div className="grid gap-10 lg:grid-cols-12 lg:items-start">
          <div className="lg:col-span-5">
            <p className="luxury-kicker">How it works</p>
            <h2 className="marketing-section-heading">Three steps to earn</h2>
            <ul className="mt-6 space-y-4">
              {STEPS.map((s) => (
                <li key={s.n} className="flex gap-4">
                  <span className="font-mono text-xs font-bold tabular-nums text-[color:var(--terminal-ochre)]">
                    {s.n}
                  </span>
                  <span>
                    <span className="block text-sm font-bold">{s.label}</span>
                    <span className="text-sm text-[color:var(--terminal-muted)]">
                      {s.detail}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-8 flex items-start gap-3 rounded-[10px] border border-[color:var(--terminal-border)]/70 bg-[color:var(--terminal-surface)]/30 p-4">
              <Link2 className="h-5 w-5 shrink-0 text-brand-lime" aria-hidden />
              <div>
                <p className="text-sm font-bold text-[color:var(--terminal-fg)]">
                  Refer & earn
                </p>
                <p className="marketing-body-sm mt-1">
                  Share your link. When friends join, you earn points —
                  that&apos;s it.
                </p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7">
            <p className="luxury-kicker">FAQ</p>
            <ul
              id="faq"
              className="mt-4 space-y-3 scroll-mt-[calc(5.5rem+env(safe-area-inset-top,0px))] md:scroll-mt-28"
            >
              {FAQ.map((item) => (
                <li
                  key={item.q}
                  className="saas-glass-card rounded-[12px] border border-[color:var(--terminal-border)]/70 p-4 sm:p-5"
                >
                  <p className="text-sm font-bold text-[color:var(--terminal-fg)]">
                    {item.q}
                  </p>
                  <p className="marketing-body-sm mt-2">{item.a}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="saas-section-shell border-t border-[color:var(--terminal-border)]/60 py-12 md:py-14">
        <div className="saas-glass-card flex flex-col items-center rounded-[14px] border border-[color:var(--terminal-border)]/80 p-8 text-center sm:p-10">
          <p className="text-lg font-semibold text-[color:var(--terminal-display)]">
            Everyone can earn. Everyone can connect.
          </p>
          <p className="mt-2 text-sm text-[color:var(--terminal-muted)]">
            Start with a free profile — upgrade only when you&apos;re ready.
          </p>
          <div className="mt-8 w-full max-w-md">
            <OwnerrNetworkLandingCtas variant="footer" />
          </div>
        </div>
      </section>
    </div>
  );
}
