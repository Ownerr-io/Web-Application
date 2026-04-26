import { useEffect, useMemo, useState, useCallback } from 'react';
import { useParams, Link } from 'wouter';
import { ChevronRight, Share2, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';
import { mockFounders, mockStartups, leaderboardMetricValue, type Startup } from '@/lib/mockData';
import {
  CLAIM_SPOTS_TOTAL,
  findClaimSpotEntryByHandle,
  type ClaimSpotEntry,
} from '@/lib/claimSpotsMockData';
import { getClaimSpotEntriesDB } from '@/lib/db';
import { StartupCard } from '@/components/StartupCard';
import { cn, formatCurrency, formatShortCurrency, founderAvatarUrl } from '@/lib/utils';
import { FounderLink } from '@/components/EntityLink';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

function xFollowersForHandle(handle: string): number {
  let h = 0;
  for (let i = 0; i < handle.length; i++) h = (h + handle.charCodeAt(i) * (i + 1)) % 1_000_000;
  return 5 + (h % 50_000);
}

/** All-time style total from a startup (mock-consistent) */
function estimatedAllTimeRevenue(s: Startup): number {
  const peak = s.peakMrr ?? s.revenue;
  return Math.round(peak * 10 + s.revenue * 6);
}

function formatClaimSpotDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function claimRoleLabel(role: ClaimSpotEntry['role']) {
  return role === 'founder' ? 'Founder' : 'Investor';
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 ring-1 ring-inset ring-black/5 dark:border-zinc-700/80 dark:bg-zinc-900/50 dark:ring-white/5">
      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-2 text-2xl font-bold tabular-nums text-foreground">{value}</div>
      <p className="mt-1.5 text-xs leading-snug text-muted-foreground">{hint}</p>
    </div>
  );
}

export default function FounderProfile() {
  const { handle = '' } = useParams();
  const [isMounted, setIsMounted] = useState(false);
  const { toast } = useToast();
  const founder = mockFounders.find((f) => f.handle === handle);
  const [claimSpot, setClaimSpot] = useState<ClaimSpotEntry | null>(null);
  const [claimSpotResolved, setClaimSpotResolved] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!handle) {
      setClaimSpot(null);
      setClaimSpotResolved(true);
      return;
    }
    if (mockFounders.some((f) => f.handle === handle)) {
      setClaimSpot(null);
      setClaimSpotResolved(true);
      return;
    }
    let cancelled = false;
    setClaimSpotResolved(false);
    setClaimSpot(null);
    (async () => {
      try {
        const idb = await getClaimSpotEntriesDB();
        if (cancelled) return;
        const found = findClaimSpotEntryByHandle(handle, idb);
        setClaimSpot(found ?? null);
      } finally {
        if (!cancelled) setClaimSpotResolved(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [handle]);

  const startups = useMemo(
    () =>
      founder
        ? (founder.startupSlugs
            .map((slug) => mockStartups.find((s) => s.slug === slug))
            .filter(Boolean) as Startup[])
        : [],
    [founder],
  );

  const stats = useMemo(() => {
    if (startups.length === 0) {
      return {
        allTime: 0,
        last30: 0,
        mrr: 0,
        count: 0,
        hasData: false,
      };
    }
    const mrr = startups.reduce(
      (a, s) => a + leaderboardMetricValue(s, 'mrr', 'current'),
      0,
    );
    const last30 = Math.round(
      startups.reduce(
        (a, s) => a + (s.monthlyRevenueSeries.at(-1)?.value ?? s.revenue),
        0,
      ) * 0.95,
    );
    const allTime = startups.reduce((a, s) => a + estimatedAllTimeRevenue(s), 0);
    return {
      allTime,
      last30,
      mrr,
      count: startups.length,
      hasData: true,
    };
  }, [startups]);

  const onShare = useCallback(async () => {
    const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
    const title =
      founder?.name ?? claimSpot?.name ?? 'Profile';
    try {
      if (navigator.share) {
        await navigator.share({ title: `${title} · ownerr.io`, url: shareUrl });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        toast({ title: 'Link copied' });
      }
    } catch {
      toast({ title: 'Could not share', variant: 'destructive' });
    }
  }, [founder?.name, claimSpot?.name, toast]);

  if (!isMounted) return <div className="min-h-[500px]" />;

  if (!founder) {
    if (!claimSpotResolved) {
      return (
        <div className="flex min-h-[320px] items-center justify-center rounded-xl border border-border bg-muted/20 text-sm text-muted-foreground dark:border-zinc-700/80 dark:bg-zinc-900/40">
          Loading profile…
        </div>
      );
    }
    if (claimSpot) {
      const xUrl = `https://twitter.com/${encodeURIComponent(claimSpot.handle)}`;
      return (
        <div className="flex flex-col gap-8 pb-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <nav
              className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground"
              aria-label="Breadcrumb"
            >
              <Link
                href="/"
                className="font-medium text-foreground/80 transition-colors hover:text-foreground"
              >
                ownerr.io
              </Link>
              <ChevronRight className="h-4 w-4 shrink-0 opacity-50" aria-hidden />
              <Link href="/claim" className="transition-colors hover:text-foreground">
                First {CLAIM_SPOTS_TOTAL} spots
              </Link>
              <ChevronRight className="h-4 w-4 shrink-0 opacity-50" aria-hidden />
              <span className="font-bold text-foreground">{claimSpot.name}</span>
            </nav>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <Button type="button" variant="outline" className="font-bold" onClick={() => void onShare()}>
                <Share2 className="h-4 w-4" />
                Share
              </Button>
              <Button
                type="button"
                className="font-bold text-primary-foreground hover:text-primary-foreground"
                asChild
              >
                <a href={xUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  Visit X
                </a>
              </Button>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card to-muted/40 p-6 shadow-sm ring-1 ring-inset ring-black/5 sm:p-8 md:p-10 dark:border-zinc-700/80 dark:from-zinc-900/80 dark:to-zinc-950/90 dark:ring-white/5">
            <div className="flex flex-col items-center gap-8 text-center md:flex-row md:items-start md:text-left">
              <div className="relative shrink-0">
                <img
                  src={founderAvatarUrl(claimSpot.handle)}
                  alt=""
                  className="relative z-10 h-32 w-32 rounded-full border-4 border-border bg-muted shadow-md dark:border-zinc-800 dark:bg-zinc-900"
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-center gap-2 md:justify-start">
                  <span
                    className={cn(
                      'rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide',
                      claimSpot.role === 'founder'
                        ? 'bg-emerald-500/15 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200'
                        : 'bg-sky-500/15 text-sky-900 dark:bg-sky-500/20 dark:text-sky-100',
                    )}
                  >
                    {claimRoleLabel(claimSpot.role)}
                  </span>
                  <span className="rounded-full border border-border bg-muted/60 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground dark:border-zinc-600 dark:bg-zinc-800/80">
                    Spot roster
                  </span>
                </div>
                <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                  {claimSpot.name}
                </h1>
                <a
                  href={xUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-block font-mono text-sm font-bold text-sky-600 hover:text-sky-700 hover:underline dark:text-sky-400 dark:hover:text-sky-300"
                >
                  @{claimSpot.handle}
                </a>
                <p className="mt-2 text-sm text-muted-foreground">
                  Claimed a free listing spot on {formatClaimSpotDate(claimSpot.claimedAt)}.
                </p>
                {claimSpot.tagline ? (
                  <p className="mt-4 max-w-2xl text-base leading-relaxed text-foreground/90">{claimSpot.tagline}</p>
                ) : null}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Program"
              value={`First ${CLAIM_SPOTS_TOTAL}`}
              hint="Founders & investors roster"
            />
            <StatCard label="Role" value={claimRoleLabel(claimSpot.role)} hint="On the claim list" />
            <StatCard label="Claimed" value={formatClaimSpotDate(claimSpot.claimedAt)} hint="Spot reserved" />
            <StatCard label="Startups" value="—" hint="Listing data is separate from this roster" />
          </div>

          <div className="rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center dark:border-zinc-600 dark:bg-zinc-900/40">
            <p className="text-sm text-muted-foreground">
              This person appears on the{' '}
              <Link href="/claim" className="font-bold text-foreground underline-offset-2 hover:underline">
                Who claimed a spot
              </Link>{' '}
              table. Full founder profiles with verified startups stay on the main leaderboard.
            </p>
            <Button className="mt-4 font-bold" variant="secondary" asChild>
              <Link href="/claim">Back to claim roster</Link>
            </Button>
          </div>
        </div>
      );
    }
    return (
      <div className="rounded-xl border border-border bg-muted/30 p-12 text-center ring-1 ring-inset ring-black/5 dark:border-zinc-700/80 dark:bg-zinc-900/40 dark:ring-white/5">
        <h2 className="text-2xl font-bold text-foreground">Profile not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">No founder or claim roster match for this link.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button asChild variant="outline">
            <Link href="/claim">Claim roster</Link>
          </Button>
          <Button asChild>
            <Link href="/cofounders">Browse founders</Link>
          </Button>
        </div>
      </div>
    );
  }

  const xUrl = `https://twitter.com/${founder.twitter.replace('@', '')}`;
  const xFollowers = xFollowersForHandle(founder.handle);
  const first = founder.name.split(' ')[0] ?? founder.name;

  return (
    <div className="flex flex-col gap-8 pb-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <nav
          className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground"
          aria-label="Breadcrumb"
        >
          <Link
            href="/"
            className="font-medium text-foreground/80 transition-colors hover:text-foreground"
          >
            ownerr.io
          </Link>
          <ChevronRight className="h-4 w-4 shrink-0 opacity-50" aria-hidden />
          <Link
            href="/cofounders"
            className="transition-colors hover:text-foreground"
          >
            Founder
          </Link>
          <ChevronRight className="h-4 w-4 shrink-0 opacity-50" aria-hidden />
          <FounderLink handle={handle} className="font-bold text-foreground">
            {founder.name}
          </FounderLink>
        </nav>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button type="button" variant="outline" className="font-bold" onClick={() => void onShare()}>
            <Share2 className="h-4 w-4" />
            Share
          </Button>
          <Button
            type="button"
            className="font-bold text-primary-foreground hover:text-primary-foreground"
            asChild
          >
            <a href={xUrl} target="_blank" rel="noreferrer">
              <ExternalLink className="h-4 w-4" />
              Visit X profile
            </a>
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card to-muted/40 p-6 shadow-sm ring-1 ring-inset ring-black/5 sm:p-8 md:p-10 dark:border-zinc-700/80 dark:from-zinc-900/80 dark:to-zinc-950/90 dark:ring-white/5">
        <div className="flex flex-col items-center gap-8 text-center md:flex-row md:items-start md:text-left">
          <div className="relative shrink-0">
            <img
              src={founderAvatarUrl(founder.avatarSeed)}
              alt=""
              className="relative z-10 h-32 w-32 rounded-full border-4 border-border bg-muted shadow-md dark:border-zinc-800 dark:bg-zinc-900"
            />
            {founder.lookingForCofounder && (
              <div className="absolute -bottom-0.5 -right-0.5 z-20 max-w-[9.5rem] rounded-full border border-emerald-800/60 bg-emerald-200 px-2 py-1 text-center text-[0.65rem] font-bold leading-tight text-zinc-900 shadow-sm sm:max-w-none sm:whitespace-nowrap sm:text-[10px]">
                Open to co-founding
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              <FounderLink handle={handle} className="text-foreground">
                {founder.name}
              </FounderLink>
            </h1>
            <a
              href={xUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-block font-mono text-sm font-bold text-sky-600 hover:text-sky-700 hover:underline dark:text-sky-400 dark:hover:text-sky-300"
            >
              {founder.twitter}
            </a>
            <p className="mt-2 text-sm text-muted-foreground">
              {startups.length} startup{startups.length === 1 ? '' : 's'} with verified revenue ·{' '}
              {xFollowers.toLocaleString('en-US')} X followers
            </p>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-foreground/90">{founder.bio}</p>
            <div className="mt-5 flex flex-wrap justify-center gap-2 md:justify-start">
              {founder.skills.map((skill) => (
                <span
                  key={skill}
                  className="rounded-full border border-border bg-muted/60 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-foreground dark:border-zinc-600/80 dark:bg-zinc-800/80 dark:text-zinc-100"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total revenue"
          value={stats.hasData ? formatCurrency(stats.allTime) : '—'}
          hint="Across all startups"
        />
        <StatCard
          label="Last 30 days"
          value={stats.hasData ? formatCurrency(stats.last30) : '—'}
          hint="Recent revenue"
        />
        <StatCard
          label="Total MRR (estimated)"
          value={stats.hasData && stats.mrr > 0 ? formatShortCurrency(stats.mrr) : '—'}
          hint="Across all startups"
        />
        <StatCard
          label="Startups"
          value={String(stats.count)}
          hint="Active startups"
        />
      </div>

      <div>
        <div className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="text-2xl font-bold text-foreground">Startups by {first}</h2>
          {stats.mrr > 0 ? (
            <div className="text-sm text-muted-foreground">
              <span className="font-bold text-foreground">Total MRR: </span>
              <span className="font-semibold tabular-nums text-foreground">
                {formatShortCurrency(stats.mrr)}
              </span>
            </div>
          ) : null}
        </div>

        {startups.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border bg-muted/20 p-8 text-center text-sm text-muted-foreground dark:border-zinc-600 dark:bg-zinc-900/40">
            No listed startups for this profile yet.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {startups.map((startup, index) => (
              <motion.div
                key={startup.slug}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04, duration: 0.2 }}
              >
                <StartupCard startup={startup} />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
