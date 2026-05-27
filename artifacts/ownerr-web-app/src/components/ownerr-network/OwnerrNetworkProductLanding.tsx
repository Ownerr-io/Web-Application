import { Link, useLocation } from "wouter";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import {
  ArrowRight,
  Coins,
  Crown,
  Link2,
  Users,
} from "lucide-react";
import { fadeUp } from "@/components/landing/saas/motion";
import { OwnerrNetworkLandingCtas } from "@/components/ownerr-network/OwnerrNetworkLandingCtas";
import { useRequireAuth } from "@/lib/platform/requireAuth";
import { authRegisterHref } from "@/lib/auth/routes";
import { marketingRoutes } from "@/routes/marketingRoutes";
import { PRODUCT_ITEMS } from "@/routes/publicNavConfig";
import type { LeaderboardEntry } from "@/lib/ownerr-network/types";
const networkProduct = PRODUCT_ITEMS.find((p) => p.id === "ownerr-network")!;

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

export function OwnerrNetworkProductLanding({ leaders, liveCount, authLoading, loggedIn }: Props) {
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
        className="landing-saas-hero relative overflow-hidden border-b border-[color:var(--terminal-border)]/80"
      >
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <motion.div
            className="saas-hero-orb left-[-12%] top-0 h-[min(400px,52vw)] w-[min(400px,52vw)] opacity-45"
            style={{
              y: orbY,
              background: "color-mix(in srgb, var(--brand-lime) 22%, transparent)",
            }}
          />
          <motion.div
            className="saas-hero-orb right-[-8%] bottom-[-8%] h-[min(340px,44vw)] w-[min(340px,44vw)] opacity-32"
            style={{
              background: "color-mix(in srgb, var(--brand-orange) 15%, transparent)",
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
              Ownerr Network
            </motion.span>

            <motion.h1 variants={fadeUp} custom={1} className="marketing-hero-title max-w-[28ch]">
              <span className="text-[color:var(--terminal-display)]">NOT EVERYONE HAS A JOB.</span>
              <span className="mt-1.5 block platform-gradient-text">EVERYONE HAS VALUE.</span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              custom={2}
              className="marketing-lead max-w-lg"
            >
              Build your profile. Grow your network. Unlock opportunities — discovery and reputation first, referrals as
              a growth loop. Platform credits, not cash promises.
            </motion.p>

            <motion.div variants={fadeUp} custom={3} className="mt-8 min-h-[2.75rem]">
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
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
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

            <motion.p variants={fadeUp} custom={4} className="mt-8 text-xs font-medium text-[color:var(--terminal-muted)]">
              <span className="text-[color:var(--terminal-fg)]">{liveCount.toLocaleString()} members active</span>
              <span className="mx-2 text-[color:var(--terminal-border)]">·</span>
              <Link href={marketingRoutes.ownerrNetworkLeaderboard} className="text-brand-lime hover:underline">
                Leaderboard
              </Link>
              <span className="mx-2 text-[color:var(--terminal-border)]">·</span>
              <a href="#faq" className="text-brand-orange hover:underline">
                FAQ
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
                        className="flex items-center justify-between rounded-[8px] px-3 py-2.5 hover:bg-[color:var(--terminal-surface)]/50"
                      >
                        <span className="flex items-center gap-2 text-sm font-semibold">
                          {i === 0 ? (
                            <Crown className="h-4 w-4 text-brand-orange" aria-hidden />
                          ) : (
                            <span className="w-4 text-center font-mono text-[10px] text-[color:var(--terminal-muted)]">
                              {i + 1}
                            </span>
                          )}
                          @{u.username}
                        </span>
                        <span className="font-mono text-xs font-bold text-brand-lime">{u.points} pts</span>
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

      <section id="features" className="saas-section-shell border-b border-[color:var(--terminal-border)]/60 py-12 md:py-16">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="luxury-kicker">Capabilities</p>
            <h2 className="marketing-section-heading">Built for discovery and rewards</h2>
          </div>
          <p className="marketing-body-sm max-w-sm">
            Profile, referrals, and credits in one product — sign in once with your OWNERR account.
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
              <h3 className="mt-4 text-sm font-bold text-[color:var(--terminal-fg)]">{f.title}</h3>
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
                  <span className="font-mono text-xs font-bold tabular-nums text-[color:var(--terminal-ochre)]">{s.n}</span>
                  <span>
                    <span className="block text-sm font-bold">{s.label}</span>
                    <span className="text-sm text-[color:var(--terminal-muted)]">{s.detail}</span>
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-8 flex items-start gap-3 rounded-[10px] border border-[color:var(--terminal-border)]/70 bg-[color:var(--terminal-surface)]/30 p-4">
              <Link2 className="h-5 w-5 shrink-0 text-brand-lime" aria-hidden />
              <div>
                <p className="text-sm font-bold text-[color:var(--terminal-fg)]">Refer & earn</p>
                <p className="marketing-body-sm mt-1">
                  Share your link. When friends join, you earn points — that&apos;s it.
                </p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7">
            <p className="luxury-kicker">FAQ</p>
            <ul id="faq" className="mt-4 space-y-3 scroll-mt-28">
              {FAQ.map((item) => (
                <li
                  key={item.q}
                  className="saas-glass-card rounded-[12px] border border-[color:var(--terminal-border)]/70 p-4 sm:p-5"
                >
                  <p className="text-sm font-bold text-[color:var(--terminal-fg)]">{item.q}</p>
                  <p className="marketing-body-sm mt-2">{item.a}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="saas-section-shell border-t border-[color:var(--terminal-border)]/60 py-12 md:py-14">
        <div className="saas-glass-card flex flex-col items-center rounded-[14px] border border-[color:var(--terminal-border)]/80 p-8 text-center sm:p-10">
          <p className="text-lg font-semibold text-[color:var(--terminal-display)]">Everyone can earn. Everyone can connect.</p>
          <p className="mt-2 text-sm text-[color:var(--terminal-muted)]">Start with a free profile — upgrade only when you&apos;re ready.</p>
          <div className="mt-8 w-full max-w-md">
            <OwnerrNetworkLandingCtas variant="footer" />
          </div>
        </div>
      </section>
    </div>
  );
}
