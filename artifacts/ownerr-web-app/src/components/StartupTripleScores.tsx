import type { Startup } from '@/lib/mockData';
import { ensureStartupScores } from '@/lib/startupScores';
import { cn } from '@/lib/utils';

type Props = {
  startup: Startup;
  className?: string;
  /** Tight single row for listing cards. */
  compact?: boolean;
  /** `inline`: one horizontal strip (acquire cards). `grid`: three columns (default). */
  layout?: 'grid' | 'inline';
  /** Grid only: spell out score names (e.g. acquire listing cards). */
  fullScoreLabels?: boolean;
};

/** Business, Lend, and Acquisition power (0–100) — compact row for cards. */
export function StartupTripleScores({
  startup,
  className,
  compact = true,
  layout = 'grid',
  fullScoreLabels = false,
}: Props) {
  const s = ensureStartupScores(startup);

  if (layout === 'inline') {
    return (
      <div
        className={cn(
          'flex items-center justify-between gap-1 rounded-lg border border-border/70 bg-muted/25 px-2 py-1.5 font-mono text-[10px] dark:border-[#2f3336] dark:bg-zinc-900/50',
          className,
        )}
      >
        <span className="min-w-0 shrink truncate">
          <span className="font-bold uppercase tracking-wide text-muted-foreground dark:text-[#71767b]">Biz</span>{' '}
          <span className="font-bold tabular-nums text-foreground dark:text-white">{s.businessScore}</span>
        </span>
        <span className="shrink-0 text-muted-foreground/40" aria-hidden>
          ·
        </span>
        <span className="min-w-0 shrink truncate text-center">
          <span className="font-bold uppercase tracking-wide text-muted-foreground dark:text-[#71767b]">Lend</span>{' '}
          <span className="font-bold tabular-nums text-foreground dark:text-white">{s.lendScore}</span>
        </span>
        <span className="shrink-0 text-muted-foreground/40" aria-hidden>
          ·
        </span>
        <span className="min-w-0 shrink truncate text-right">
          <span className="font-bold uppercase tracking-wide text-muted-foreground dark:text-[#71767b]">Acq</span>{' '}
          <span className="font-bold tabular-nums text-foreground dark:text-white">{s.acquisitionPower}</span>
        </span>
      </div>
    );
  }

  const gridLabelClass = cn(
    'font-bold text-muted-foreground dark:text-zinc-500',
    fullScoreLabels
      ? 'mx-auto max-w-[22ch] text-[9px] leading-snug tracking-normal sm:text-[10px]'
      : cn(
          'uppercase tracking-wider',
          compact ? 'text-[8px] leading-tight sm:text-[9px]' : 'text-[9px] sm:text-[10px]',
        ),
  );

  return (
    <div
      className={cn(
        'grid grid-cols-3 gap-2',
        compact ? 'text-center' : '',
        className,
      )}
    >
      <div className="min-w-0">
        <div className={gridLabelClass}>{fullScoreLabels ? 'Business score' : 'Business'}</div>
        <div
          className={cn(
            'font-mono font-bold tabular-nums text-foreground dark:text-zinc-50',
            compact ? 'mt-0.5 text-sm' : 'mt-1 text-base',
          )}
        >
          {s.businessScore}
        </div>
      </div>
      <div className="min-w-0">
        <div className={gridLabelClass}>{fullScoreLabels ? 'Lend score' : 'Lend'}</div>
        <div
          className={cn(
            'font-mono font-bold tabular-nums text-foreground dark:text-zinc-50',
            compact ? 'mt-0.5 text-sm' : 'mt-1 text-base',
          )}
        >
          {s.lendScore}
        </div>
      </div>
      <div className="min-w-0">
        <div className={gridLabelClass}>{fullScoreLabels ? 'Acquisition power' : 'Acq. power'}</div>
        <div
          className={cn(
            'font-mono font-bold tabular-nums text-foreground dark:text-zinc-50',
            compact ? 'mt-0.5 text-sm' : 'mt-1 text-base',
          )}
        >
          {s.acquisitionPower}
        </div>
      </div>
    </div>
  );
}

/** Three stat cards for startup detail (matches other metric cards). */
export function StartupScoresDetailGrid({ startup }: { startup: Startup }) {
  const s = ensureStartupScores(startup);
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div className="rounded-xl border border-border bg-card p-5 text-center">
        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Business score</div>
        <div className="mt-2 text-2xl font-bold tabular-nums">{s.businessScore}</div>
        <p className="mt-1 text-xs text-muted-foreground">Revenue quality and momentum (0–100).</p>
      </div>
      <div className="rounded-xl border border-border bg-card p-5 text-center">
        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Lend score</div>
        <div className="mt-2 text-2xl font-bold tabular-nums">{s.lendScore}</div>
        <p className="mt-1 text-xs text-muted-foreground">Lending / repayment capacity proxy (0–100).</p>
      </div>
      <div className="rounded-xl border border-border bg-card p-5 text-center">
        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Acquisition power</div>
        <div className="mt-2 text-2xl font-bold tabular-nums">{s.acquisitionPower}</div>
        <p className="mt-1 text-xs text-muted-foreground">M&amp;A and buyer attractiveness (0–100).</p>
      </div>
    </div>
  );
}
