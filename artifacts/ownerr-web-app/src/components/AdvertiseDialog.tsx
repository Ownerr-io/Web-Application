import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { founderAvatarUrl } from '@/lib/utils';
import { ExternalLink, Eye, Megaphone, Users, Zap } from 'lucide-react';

const TESTIMONIALS = [
  {
    name: 'Romàn',
    company: 'GojiberryAI',
    seed: 'roman-goji',
    quote:
      'ownerr.io brought me $3,200 in new MRR, 27 new clients, 81 trials, 20+ demo calls. Absolutely insane results, worth every penny.',
  },
  {
    name: 'Yahia Bakour',
    company: 'Brand.dev',
    seed: 'yahia-brand',
    quote:
      "Sponsoring ownerr.io turned out to be one of the best marketing decisions I've made in a while. Getting some really interesting customers out of it.",
  },
  {
    name: 'Ryan Vogel',
    company: 'Inbound Email',
    seed: 'ryan-inbound',
    quote:
      'The ROI has been outstanding — tons of new signups, new trials booked. Over 60% of my traffic this week came from ownerr.io. Money well spent.',
  },
  {
    name: 'Alexander Belogubov',
    company: 'Replymer',
    seed: 'alex-replymer',
    quote: "I've already recouped the advertising costs in just 2 days 🔥",
  },
] as const;

export function AdvertiseDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(90dvh,880px)] max-w-xl overflow-y-auto border-border bg-card p-6 text-card-foreground shadow-2xl sm:max-w-lg">
        <DialogHeader className="space-y-2 text-left">
          <DialogTitle className="text-xl font-bold text-foreground">Advertise on ownerr.io</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Reach 120K+ entrepreneurs and founders every month
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <div className="rounded-[10px] border border-border bg-muted/50 p-3 text-center">
            <Users className="mx-auto mb-2 h-5 w-5 text-muted-foreground" />
            <div className="text-lg font-bold text-foreground">120K+</div>
            <div className="text-[11px] text-muted-foreground">Monthly visitors</div>
          </div>
          <div className="rounded-[10px] border border-border bg-muted/50 p-3 text-center">
            <Eye className="mx-auto mb-2 h-5 w-5 text-muted-foreground" />
            <div className="text-lg font-bold text-foreground">High-intent</div>
            <div className="text-[11px] text-muted-foreground">Buyers, not browsers</div>
          </div>
          <div className="rounded-[10px] border border-red-500/40 bg-red-950/20 p-3 text-center sm:col-span-1">
            <Zap className="mx-auto mb-2 h-5 w-5 text-red-400" />
            <div className="text-lg font-bold text-red-300">1/20</div>
            <div className="text-[11px] text-red-400/90">Spots left</div>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-bold text-foreground">How it works</h3>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Your startup appears in rotating sponsor slots on desktop sidebars and mobile banners across
            all ownerr.io pages. Sponsors rotate every 10 seconds to ensure fair visibility among all
            advertisers.
          </p>
        </div>

        <div className="rounded-[12px] border border-border bg-muted/40 p-4">
          <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Pricing</div>
          <p className="mt-2 text-sm font-semibold text-foreground">Monthly rate: $1,499/month</p>
          <p className="mt-1 text-sm text-muted-foreground">
            <span className="font-bold text-foreground">1 spot</span> available now. Cancel anytime.
          </p>
        </div>

        <Button
          asChild
          className="h-11 w-full rounded-[10px] font-bold"
        >
          <a
            href="mailto:advertise@ownerr.io?subject=ownerr.io%20sponsorship&body=Hi%2C%20I%27d%20like%20to%20advertise%20on%20ownerr.io."
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2"
          >
            Get started ($1,499/mo)
            <ExternalLink className="h-4 w-4" />
          </a>
        </Button>

        <div className="space-y-4 border-t border-border pt-4">
          <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
            <Megaphone className="h-4 w-4 text-muted-foreground" />
            What sponsors say
          </h3>
          <ul className="space-y-4">
            {TESTIMONIALS.map((t) => (
              <li key={t.seed} className="flex gap-3 text-sm">
                <img
                  src={founderAvatarUrl(t.seed)}
                  alt=""
                  className="h-10 w-10 shrink-0 rounded-full bg-muted"
                />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-bold text-foreground">{t.name}</span>
                    <span className="text-muted-foreground">·</span>
                    <span className="text-muted-foreground">{t.company}</span>
                    <span className="text-amber-500 dark:text-amber-400" aria-hidden>
                      ★★★★★
                    </span>
                  </div>
                  <blockquote className="mt-1 text-muted-foreground leading-snug">&ldquo;{t.quote}&rdquo;</blockquote>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}
