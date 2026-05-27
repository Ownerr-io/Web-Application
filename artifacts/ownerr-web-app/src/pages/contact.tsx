import { Link } from 'wouter';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Clock, Mail, MessageSquare, Package } from 'lucide-react';
import { MarketingLayout } from '@/components/MarketingLayout';
import { fadeUp } from '@/components/landing/saas/motion';
import { marketingRoutes } from '@/routes/marketingRoutes';
import { marketplaceRoutes } from '@/routes/marketplaceRoutes';
import { authRegisterHref } from '@/lib/auth/routes';

const CHANNELS = [
  {
    icon: Mail,
    title: 'Email',
    description: 'Partnerships, support, and general inquiries.',
    href: 'mailto:hello@ownerr.com',
    action: 'hello@ownerr.com',
    external: true,
    accent: 'orange' as const,
  },
  {
    icon: MessageSquare,
    title: 'Product & demos',
    description: 'Questions about OWNERR OS, Unemployed Network, or getting started.',
    href: marketingRoutes.products,
    action: 'View products',
    external: false,
    accent: 'lime' as const,
  },
] as const;

const QUICK_LINKS = [
  { label: 'Valuation workspace', href: marketingRoutes.valuation },
  { label: 'Marketplace', href: marketplaceRoutes.root },
  { label: 'How it works', href: marketingRoutes.howItWorks },
] as const;

export default function ContactPage() {
  const reduce = useReducedMotion();

  return (
    <MarketingLayout hideProductContext>
      <div className="landing-terminal-palette relative overflow-x-clip">
        <section className="landing-saas-hero relative overflow-hidden border-b border-[color:var(--terminal-border)]/80">
          <div className="pointer-events-none absolute inset-0" aria-hidden>
            <div
              className="saas-hero-orb left-[-10%] top-0 h-[min(380px,50vw)] w-[min(380px,50vw)] opacity-40"
              style={{ background: 'color-mix(in srgb, var(--brand-lime) 18%, transparent)' }}
            />
            <div
              className="saas-hero-orb right-[-8%] bottom-0 h-[min(320px,42vw)] w-[min(320px,42vw)] opacity-30"
              style={{ background: 'color-mix(in srgb, var(--brand-orange) 14%, transparent)' }}
            />
          </div>

          <div className="saas-section-shell relative z-10 py-12 md:py-16 lg:py-20">
            <motion.div
              initial={reduce ? false : 'hidden'}
              animate="visible"
              variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
              className="max-w-2xl"
            >
              <motion.span variants={fadeUp} custom={0} className="luxury-hero-kicker">
                Contact
              </motion.span>
              <motion.h1 variants={fadeUp} custom={1} className="marketing-hero-title">
                <span className="text-[color:var(--terminal-display)]">Talk to the</span>
                <span className="mt-1 block platform-gradient-text">OWNERR team.</span>
              </motion.h1>
              <motion.p variants={fadeUp} custom={2} className="marketing-lead max-w-lg">
                Enterprise onboarding, partnerships, and product questions. We aim to respond within one business day.
              </motion.p>
              <motion.div
                variants={fadeUp}
                custom={3}
                className="mt-6 inline-flex items-center gap-2 text-xs font-medium text-[color:var(--terminal-muted)]"
              >
                <Clock className="h-3.5 w-3.5 text-brand-lime" aria-hidden />
                Typical reply: under 24 hours on business days
              </motion.div>
            </motion.div>
          </div>
        </section>

        <section className="saas-section-shell py-12 md:py-16">
          <p className="luxury-kicker">Get in touch</p>
          <h2 className="marketing-section-heading">Choose a channel</h2>

          <ul className="mt-8 grid gap-5 md:grid-cols-2">
            {CHANNELS.map((channel, i) => {
              const Icon = channel.icon;
              const cardClass =
                'saas-glass-card saas-glass-card-hover group flex h-full flex-col rounded-[14px] border border-[color:var(--terminal-border)]/80 p-6 sm:p-7 transition-colors';
              const inner = (
                <>
                  <div
                    className={
                      channel.accent === 'lime'
                        ? 'flex h-11 w-11 items-center justify-center rounded-[11px] border border-[color:var(--terminal-border)]/80 bg-[color:var(--terminal-surface)]/80 text-brand-lime'
                        : 'flex h-11 w-11 items-center justify-center rounded-[11px] border border-[color:var(--terminal-border)]/80 bg-[color:var(--terminal-surface)]/80 text-brand-orange'
                    }
                  >
                    <Icon className="h-5 w-5" aria-hidden />
                  </div>
                  <h3 className="mt-5 text-lg font-bold text-[color:var(--terminal-fg)]">{channel.title}</h3>
                  <p className="marketing-body-sm mt-2 flex-1">
                    {channel.description}
                  </p>
                  <span className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-[color:var(--terminal-ochre)]">
                    {channel.action}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </span>
                </>
              );

              return (
                <motion.li
                  key={channel.title}
                  initial={reduce ? false : { opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08, duration: 0.45 }}
                >
                  {channel.external ? (
                    <a href={channel.href} className={cardClass}>
                      {inner}
                    </a>
                  ) : (
                    <Link href={channel.href} className={cardClass}>
                      {inner}
                    </Link>
                  )}
                </motion.li>
              );
            })}
          </ul>
        </section>

        <section className="saas-section-shell border-t border-[color:var(--terminal-border)]/60 py-12 md:py-14">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="luxury-kicker">Self-serve</p>
              <h2 className="marketing-section-heading">Explore the platform</h2>
              <p className="marketing-body-sm mt-2 max-w-md">
                Many questions are answered in the product — valuation, marketplace, and product apps are available now.
              </p>
            </div>
            <ul className="flex w-full flex-col gap-2 sm:max-w-sm">
              {QUICK_LINKS.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="flex items-center justify-between rounded-[10px] border border-[color:var(--terminal-border)]/70 bg-[color:var(--terminal-surface)]/30 px-4 py-3 text-sm font-semibold text-[color:var(--terminal-fg)] transition-colors hover:border-[color:var(--brand-lime)]/35 hover:bg-[color:var(--terminal-surface)]/50"
                  >
                    {item.label}
                    <ArrowRight className="h-4 w-4 text-[color:var(--terminal-muted)]" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="saas-section-shell pb-14 pt-2 md:pb-20">
          <div className="saas-glass-card flex w-full flex-col gap-4 rounded-[14px] border border-[color:var(--terminal-border)]/80 p-6 sm:flex-row sm:items-center sm:justify-between sm:gap-8 sm:p-8">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <Package className="mt-0.5 h-5 w-5 shrink-0 text-brand-orange" aria-hidden />
              <div>
                <p className="text-sm font-bold text-[color:var(--terminal-fg)]">Ready to join OWNERR?</p>
                <p className="mt-1 text-sm text-[color:var(--terminal-muted)]">
                  Create one account for valuation, marketplace, and product apps.
                </p>
              </div>
            </div>
            <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row">
              <Link
                href={authRegisterHref()}
                className="btn-platform-gradient inline-flex h-11 w-full items-center justify-center gap-2 rounded-[10px] px-6 text-sm font-bold sm:w-auto"
              >
                Get Started
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link
                href={marketingRoutes.howItWorks}
                className="inline-flex h-11 w-full items-center justify-center rounded-[10px] border border-[color:var(--terminal-border)] px-6 text-sm font-semibold transition-colors hover:border-[color:var(--brand-orange)]/45 sm:w-auto"
              >
                How it works
              </Link>
            </div>
          </div>
        </section>
      </div>
    </MarketingLayout>
  );
}
