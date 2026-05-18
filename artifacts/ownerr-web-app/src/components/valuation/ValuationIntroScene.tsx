import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ValuationIntroLottie } from './ValuationIntroLottie';
import { Button } from '@/components/ui/button';

type Props = {
  onContinue: () => void;
};

const easePremium = [0.22, 1, 0.36, 1] as const;

export function ValuationIntroScene({ onContinue }: Props) {
  const reduce = useReducedMotion();
  const [hasStarted, setHasStarted] = useState(false);

  if (hasStarted) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center py-10">
        <ValuationIntroLottie onFinished={onContinue} />
      </div>
    );
  }

  return (
    <motion.div className="mx-auto flex min-h-0 w-full max-w-[1200px] flex-1 items-center justify-center px-4 py-12">
      <motion.div
        className="relative w-full max-w-2xl border-0 bg-transparent p-0 shadow-none flex flex-col items-center"
        initial={reduce ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: easePremium }}
      >
        {/* Massive Ambient Luxury Glow Backdrop */}
        <div
          className="absolute -top-32 left-1/2 h-[350px] w-[500px] -translate-x-1/2 rounded-full opacity-30 blur-[120px] pointer-events-none"
          style={{
            background:
              'radial-gradient(circle, var(--terminal-glow) 0%, rgba(212,167,71,0.06) 50%, transparent 100%)',
          }}
        />

        <div className="flex flex-col items-center text-center w-full z-10">
          <h2 className="mt-8 text-balance text-4xl font-light tracking-tight text-[#EBFBBC] sm:text-6xl leading-[1.12]">
            Discover Your Startup's <br />
            <span className="font-extrabold bg-gradient-to-r from-[color:var(--terminal-ochre)] via-white to-[color:var(--terminal-lime)] bg-clip-text text-transparent">
              True Enterprise Worth
            </span>
          </h2>

          <p className="mt-6 text-base sm:text-lg text-[color:var(--terminal-muted)] max-w-xl leading-relaxed font-medium">
            Calculate institutional-grade pricing bands, growth efficiency metrics, and corporate acquisition appetites in less than 3 minutes.
          </p>

          {/* Borderless Luxury Benefit Lines */}
          <div className="mt-12 w-full max-w-lg space-y-7 text-left border-y border-white/10 py-10">
            {[
              {
                title: 'PRIVATE VENTURE SAFEGUARD',
                desc: 'Your financials are fully isolated, encrypted, and kept strictly confidential.',
                icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
              },
              {
                title: 'MARKET COMPARATIVE INDEX',
                desc: 'Indexed in real-time against strategic M&A multiples and venture pricing data.',
                icon: 'M7 12l3-3 3 3 4-4M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z',
              },
              {
                title: 'EXECUTIVE INTELLIGENCE CARD',
                desc: 'Receive tactical strategic readouts tailored to capital efficiency and NRR dynamics.',
                icon: 'M13 10V3L4 14h7v7l9-11h-7z',
              },
            ].map((item, idx) => (
              <motion.div
                key={item.title}
                initial={reduce ? false : { opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25 + idx * 0.1, duration: 0.4 }}
                className="flex items-start gap-4"
              >
                <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/[0.04] border border-white/10 text-[color:var(--terminal-lime)] shadow-[0_0_12px_rgba(217,246,157,0.06)]">
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d={item.icon} />
                  </svg>
                </div>
                <div>
                  <h4 className="text-sm font-black tracking-widest text-[#EBFBBC] uppercase">
                    {item.title}
                  </h4>
                  <p className="text-sm text-[color:var(--terminal-muted)] mt-2.5 font-medium leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Luxury Pulse Start Trigger */}
          <motion.div
            initial={reduce ? false : { opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.55, duration: 0.4 }}
            className="mt-10 w-full max-w-md flex flex-col items-center"
          >
            <Button
              type="button"
              onClick={() => setHasStarted(true)}
              className="h-14 w-full rounded-[10px] border-0 bg-[color:var(--terminal-ochre)] px-10 text-sm font-black uppercase tracking-widest text-[#0b0b0c] shadow-[0_8px_32px_rgba(212,167,71,0.28)] hover:bg-[color:var(--terminal-ochre-hover)] transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
            >
              Start Analysis Engine
            </Button>
            <div className="mt-4 flex items-center gap-2.5 text-xs font-black uppercase tracking-wider text-[color:var(--terminal-muted)]">
              <span>Zero Cost</span>
              <span className="h-1 w-1 rounded-full bg-white/20" />
              <span>Fully Confidential</span>
              <span className="h-1 w-1 rounded-full bg-white/20" />
              <span>3 Min Synthesis</span>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}
