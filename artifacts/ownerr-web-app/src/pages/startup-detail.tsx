import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { useParams, useSearch, Link } from 'wouter';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  ChevronRight,
  ExternalLink,
  Lightbulb,
  MessageCircle,
  Quote,
  Share2,
  Sparkles,
  Target,
  Users,
  DollarSign,
  Info,
  BadgeCheck,
  Globe,
  BarChart3,
} from 'lucide-react';

import { mockFounders, mockStartups, leaderboardMetricValue, type Startup } from '@/lib/mockData';
import { getStartupDetailModel } from '@/lib/startupDetailContent';
import { StartupScoresDetailGrid } from '@/components/StartupTripleScores';
import { formatCurrency, formatShortCurrency, founderAvatarUrl } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FounderLink, StartupLink } from '@/components/EntityLink';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { MarketplaceTrendChart } from '@/components/MarketplaceTrendChart';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  appendMarketplaceThreadMessage,
  fetchMarketplaceInterests,
  fetchMarketplaceListingBySlug,
  fetchMarketplaceListings,
  runMockDomainVerification,
  submitMarketplaceInterest,
  trustLabelFromScore,
  updateMarketplaceVerification,
  updateMarketplaceInterestStage,
  type MarketplaceInterestRecord,
  type MarketplaceListing,
} from '@/lib/mockMarketplaceService';
import { useMockSession } from '@/context/MockSessionContext';

function DiscoverCard({ s }: { s: Startup }) {
  const mrr = leaderboardMetricValue(s, 'mrr', 'current');
  const rev30 = mrr;
  const total = Math.round((s.peakMrr ?? s.revenue) * 16);

  return (
    <Link href={`/startup/${s.slug}`} className="group block h-full min-w-0">
      <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-foreground/25 hover:bg-muted/15">
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border text-xs font-bold"
              style={{ backgroundColor: s.logoColor }}
            >
              <img
                src={`https://api.dicebear.com/7.x/shapes/svg?seed=${s.name}`}
                alt=""
                className="h-8 w-8"
              />
            </div>
            <div className="min-w-0">
              <div className="font-bold leading-tight group-hover:underline line-clamp-2">{s.name}</div>
            </div>
          </div>
          <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{s.description}</p>
        </div>
        <div className="mt-auto border-t border-dotted border-border bg-muted/10 px-3 py-3">
          <div className="grid grid-cols-3 gap-1 text-center">
            <div>
              <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                Rev (30D)
              </div>
              <div className="text-xs font-bold tabular-nums">{formatShortCurrency(rev30)}</div>
            </div>
            <div>
              <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">MRR</div>
              <div className="text-xs font-bold tabular-nums">{formatShortCurrency(mrr)}</div>
            </div>
            <div>
              <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Total</div>
              <div className="text-xs font-bold tabular-nums">{formatShortCurrency(total)}</div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function StartupDetail() {
  const { slug } = useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentUser, isBuyer, isAuthenticated, openAuthDialog } = useMockSession();
  const [mounted, setMounted] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);

  const listingsQuery = useQuery({
    queryKey: ['marketplace-listings'],
    queryFn: () => fetchMarketplaceListings(mockStartups),
  });

  const listingQuery = useQuery({
    queryKey: ['marketplace-listing', slug],
    queryFn: () => fetchMarketplaceListingBySlug(mockStartups, slug ?? ''),
    enabled: !!slug,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const startup = listingQuery.data;
  const founder = startup ? mockFounders.find((f) => f.handle === startup.founderHandle) : undefined;
  const isOwner = !!startup && !!currentUser && startup.ownerUserId === currentUser.id;

  const interestsQuery = useQuery({
    queryKey: ['marketplace-interests', startup?.slug],
    queryFn: () => fetchMarketplaceInterests(startup!.slug),
    enabled: !!startup,
  });

  const leaderboardRank = useMemo(() => {
    if (!startup) return 1;
    const sorted = [...(listingsQuery.data ?? [])].sort((a, b) => b.revenue - a.revenue);
    const i = sorted.findIndex((s) => s.slug === startup.slug);
    return i >= 0 ? i + 1 : 999;
  }, [listingsQuery.data, startup]);

  const detail = useMemo(() => {
    if (!startup) return null;
    return getStartupDetailModel(startup, founder, leaderboardRank);
  }, [startup, founder, leaderboardRank]);

  const search = useSearch();
  const isLeaderboardView = useMemo(() => {
    const q = search.startsWith('?') ? search.slice(1) : search;
    return new URLSearchParams(q).get('from') === 'leaderboard';
  }, [search]);

  const discoverStartups = useMemo(() => {
    if (!startup) return [] as Startup[];
    return (listingsQuery.data ?? [])
      .filter((s) => s.slug !== startup.slug)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 6);
  }, [listingsQuery.data, startup]);

  if (!mounted) return <div className="min-h-[500px]" />;

  if (listingQuery.isLoading) {
    return <div className="min-h-[500px]" />;
  }

  if (!startup || !detail) {
    return (
      <div className="startup-card p-12 text-center">
        <h2 className="text-2xl font-bold">Startup not found</h2>
      </div>
    );
  }

  const mrrShown = detail.mrrDisplay;
  const foundedLabel = detail.foundedLabel;
  const visitUrl = detail.visitUrl;

  const shareTitle = startup.name;

  async function onShare() {
    const shareUrl =
      typeof window !== 'undefined'
        ? isLeaderboardView
          ? window.location.href
          : `${window.location.origin}${window.location.pathname}`
        : '';
    try {
      if (navigator.share) {
        await navigator.share({ title: shareTitle, url: shareUrl });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        toast({ title: 'Link copied' });
      }
    } catch {
      toast({ title: 'Could not share', variant: 'destructive' });
    }
  }

  if (isLeaderboardView) {
    return (
      <div className="flex flex-col gap-6 pb-10">
        <nav className="flex flex-wrap items-center gap-1 font-mono text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground">
            Ownerr
          </Link>
          <ChevronRight className="h-4 w-4 opacity-50" />
          <span className="hover:text-foreground">
            <Link href="/#leaderboard">Startup</Link>
          </span>
          <ChevronRight className="h-4 w-4 opacity-50" />
          <StartupLink slug={startup.slug} className="font-bold text-foreground">
            {startup.name}
          </StartupLink>
        </nav>

        <section className="rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div className="flex min-w-0 flex-1 flex-col gap-5 sm:flex-row sm:items-start">
              <div
                className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl border border-black/5 text-4xl font-bold shadow-md dark:border-white/10"
                style={{ backgroundColor: startup.logoColor }}
              >
                <img
                  src={`https://api.dicebear.com/7.x/shapes/svg?seed=${startup.name}`}
                  alt={`${startup.name} avatar`}
                  className="h-16 w-16"
                />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                  <StartupLink slug={startup.slug} className="text-foreground">
                    {startup.name}
                  </StartupLink>
                </h1>
                <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
                  {startup.description}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 gap-2 self-start md:self-center">
              <Button
                type="button"
                variant="outline"
                className="font-bold"
                onClick={() => void onShare()}
              >
                <Share2 className="h-4 w-4" />
                Share
              </Button>
              {isOwner ? (
                <Button type="button" variant="outline" className="font-bold" disabled>
                  <MessageCircle className="h-4 w-4" />
                  Founder controls below
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="font-bold"
                  onClick={() => {
                    if (!isAuthenticated) {
                      openAuthDialog();
                      return;
                    }
                    setContactOpen(true);
                  }}
                >
                  <MessageCircle className="h-4 w-4" />
                  {isAuthenticated ? (isBuyer ? 'Express Interest' : 'Buyer mode required') : 'Login to continue'}
                </Button>
              )}
              <Button type="button" variant="secondary" className="font-bold bg-primary text-primary-foreground" asChild>
                <a href={visitUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  Visit
                </a>
              </Button>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-border bg-card p-5 text-center">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              All-time revenue
            </div>
            <div className="mt-2 text-2xl font-bold tabular-nums">{formatCurrency(detail.allTimeRevenue)}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Ranked #{detail.leaderboardRank} on Ownerr
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5 text-center">
            <div className="flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              MRR (estimated)
              <Info className="h-3.5 w-3.5 shrink-0 text-muted-foreground/80" aria-hidden />
            </div>
            <div className="mt-2 text-2xl font-bold tabular-nums">{formatCurrency(mrrShown)}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              {detail.activeSubscriptions} active subscriptions
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5 text-center">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Founder
            </div>
            <div className="mt-3 flex min-w-0 flex-col items-center gap-2">
              {founder ? (
                <FounderLink
                  handle={founder.handle}
                  className="flex min-w-0 flex-col items-center gap-2 font-bold text-foreground sm:flex-row"
                >
                  <img
                    src={founderAvatarUrl(founder.avatarSeed)}
                    alt=""
                    className="h-11 w-11 shrink-0 rounded-full border border-border bg-muted"
                  />
                  <span className="max-w-full truncate text-center sm:text-left">{founder.name}</span>
                </FounderLink>
              ) : (
                <FounderLink handle={startup.founderHandle} className="block max-w-full truncate font-bold text-foreground">
                  {startup.founderDisplayName ?? startup.founderHandle}
                </FounderLink>
              )}
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-5 text-center">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Founded
            </div>
            <div className="mt-2 text-2xl font-bold tabular-nums">{foundedLabel}</div>
            <div className="mt-2 flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
              <span aria-hidden>🇺🇸</span>
              <span>United States</span>
            </div>
          </div>
        </div>

        <StartupScoresDetailGrid startup={startup} />

        <VerificationSection listing={startup} />
        {isOwner ? (
          <FounderControlsSection
            listing={startup}
            interestRecords={interestsQuery.data ?? []}
            onVerificationUpdated={async (kind, status, provider) => {
              await updateMarketplaceVerification(startup, kind, status, provider);
              await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['marketplace-listing', startup.slug] }),
                queryClient.invalidateQueries({ queryKey: ['marketplace-listings'] }),
              ]);
            }}
            onDomainVerify={async () => {
              await runMockDomainVerification(startup);
              await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['marketplace-listing', startup.slug] }),
                queryClient.invalidateQueries({ queryKey: ['marketplace-listings'] }),
              ]);
            }}
            onInterestStageUpdated={async (record, stage) => {
              await updateMarketplaceInterestStage(record, stage);
              await queryClient.invalidateQueries({ queryKey: ['marketplace-interests', startup.slug] });
            }}
            onSendFounderReply={async (record) => {
              await appendMarketplaceThreadMessage({
                threadId: record.id,
                senderUserId: startup.ownerUserId,
                senderName: founder?.name ?? startup.founderDisplayName ?? startup.name,
                senderRole: 'founder',
                body: 'Thanks for reaching out. Happy to share more context and next steps for this deal.',
              });
              await queryClient.invalidateQueries({ queryKey: ['marketplace-interests', startup.slug] });
            }}
          />
        ) : null}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <MarketplaceTrendChart
            title="Revenue history"
            subtitle={`${startup.growthPct >= 0 ? '+' : ''}${startup.growthPct}% vs previous month`}
            points={startup.revenueHistory}
          />
          <MarketplaceTrendChart
            title="Traffic history"
            subtitle={`${(startup.trafficMonthlyVisitors ?? 0).toLocaleString('en-US')} visitors/mo · ${startup.verification.traffic.status}`}
            points={startup.trafficHistory}
            mode="number"
          />
        </div>

        <section className="rounded-xl border border-border bg-card p-6 sm:p-8">
          <h2 className="text-lg font-bold">Startup insights</h2>
          <div className="mt-4 border-t border-border pt-4">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-border bg-muted/30 px-3 py-1 text-xs font-medium text-foreground">
                {startup.category}
              </span>
              {detail.insights.tags.map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="min-w-0">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
            <h2 className="text-lg font-bold">Discover more startups</h2>
            <Link
              href="/#leaderboard"
              className="inline-flex items-center gap-0.5 text-sm font-bold text-muted-foreground hover:text-foreground"
            >
              Advanced Search
              <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {discoverStartups.map((s) => (
              <DiscoverCard key={s.slug} s={s} />
            ))}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 pb-8 sm:gap-6 sm:pb-10">
      <nav className="flex min-w-0 flex-wrap items-center gap-1 text-xs text-muted-foreground sm:text-sm">
        <Link href="/" className="hover:text-foreground">
          Ownerr
        </Link>
        <ChevronRight className="h-4 w-4 opacity-50" />
        <span className="hover:text-foreground">
          <Link href="/acquire">Startup</Link>
        </span>
        <ChevronRight className="h-4 w-4 opacity-50" />
        <StartupLink slug={startup.slug} className="font-bold text-foreground">
          {startup.name}
        </StartupLink>
      </nav>



      <section className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-8">
        <div className="flex flex-col gap-4 sm:gap-6 md:flex-row md:items-start md:justify-between">
          <div className="flex min-w-0 flex-1 flex-col gap-4 sm:gap-5 sm:flex-row sm:items-start">
            <div
              className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-black/5 text-4xl font-bold shadow-md sm:h-24 sm:w-24 dark:border-white/10"
              style={{ backgroundColor: startup.logoColor }}
            >
              <img
                src={`https://api.dicebear.com/7.x/shapes/svg?seed=${startup.name}`}
                alt={`${startup.name} avatar`}
                className="h-14 w-14 sm:h-16 sm:w-16"
              />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold tracking-tight sm:text-4xl">
                <StartupLink slug={startup.slug} className="text-foreground">
                  {startup.name}
                </StartupLink>
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:mt-3 sm:text-base">
                {startup.description}
              </p>
            </div>
          </div>
          <div className="flex w-full shrink-0 gap-2 self-start md:w-auto md:self-center">
            <Button
              type="button"
              variant="outline"
              className="h-10 flex-1 font-bold md:h-11 md:flex-none"
              onClick={() => void onShare()}
            >
              <Share2 className="h-4 w-4" />
              Share
            </Button>
            {isOwner ? (
              <Button type="button" variant="outline" className="h-10 flex-1 font-bold md:h-11 md:flex-none" disabled>
                <MessageCircle className="h-4 w-4" />
                Founder controls below
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="h-10 flex-1 font-bold md:h-11 md:flex-none"
                onClick={() => {
                  if (!isAuthenticated) {
                    openAuthDialog();
                    return;
                  }
                  setContactOpen(true);
                }}
              >
                <MessageCircle className="h-4 w-4" />
                {isAuthenticated ? (isBuyer ? 'Express Interest' : 'Buyer mode required') : 'Login to continue'}
              </Button>
            )}
            <Button type="button" variant="outline" className="h-10 flex-1 font-bold md:h-11 md:flex-none" asChild>
              <a href={visitUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4" />
                Visit
              </a>
            </Button>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
        <div className="rounded-xl border border-border bg-card p-4 text-center sm:p-5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            All-time revenue
          </div>
          <div className="mt-2 text-2xl font-bold tabular-nums">{formatCurrency(detail.allTimeRevenue)}</div>
          <p className="mt-1 text-xs text-muted-foreground">
            Ranked #{detail.leaderboardRank} on Ownerr
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center sm:p-5">
          <div className="flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            MRR (estimated)
            <Info className="h-3.5 w-3.5 shrink-0 text-muted-foreground/80" aria-hidden />
          </div>
          <div className="mt-2 text-2xl font-bold tabular-nums">{formatCurrency(mrrShown)}</div>
          <p className="mt-1 text-xs text-muted-foreground">
            {detail.activeSubscriptions} active subscriptions
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center sm:p-5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Founder
          </div>
          <div className="mt-3 flex min-w-0 flex-col items-center gap-2">
            {founder ? (
              <FounderLink
                handle={founder.handle}
                className="flex min-w-0 flex-col items-center gap-2 font-bold text-foreground sm:flex-row"
              >
                <img
                  src={founderAvatarUrl(founder.avatarSeed)}
                  alt=""
                  className="h-11 w-11 shrink-0 rounded-full border border-border bg-muted"
                />
                <span className="max-w-full truncate text-center sm:text-left">{founder.name}</span>
              </FounderLink>
            ) : (
              <FounderLink handle={startup.founderHandle} className="block max-w-full truncate font-bold text-foreground">
                {startup.founderDisplayName ?? startup.founderHandle}
              </FounderLink>
            )}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center sm:p-5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Founded
          </div>
          <div className="mt-2 text-2xl font-bold tabular-nums">{foundedLabel}</div>
        </div>
      </div>

      <StartupScoresDetailGrid startup={startup} />

      <VerificationSection listing={startup} />
      {isOwner ? (
        <FounderControlsSection
          listing={startup}
          interestRecords={interestsQuery.data ?? []}
          onVerificationUpdated={async (kind, status, provider) => {
            await updateMarketplaceVerification(startup, kind, status, provider);
            await Promise.all([
              queryClient.invalidateQueries({ queryKey: ['marketplace-listing', startup.slug] }),
              queryClient.invalidateQueries({ queryKey: ['marketplace-listings'] }),
            ]);
          }}
          onDomainVerify={async () => {
            await runMockDomainVerification(startup);
            await Promise.all([
              queryClient.invalidateQueries({ queryKey: ['marketplace-listing', startup.slug] }),
              queryClient.invalidateQueries({ queryKey: ['marketplace-listings'] }),
            ]);
          }}
          onInterestStageUpdated={async (record, stage) => {
            await updateMarketplaceInterestStage(record, stage);
            await queryClient.invalidateQueries({ queryKey: ['marketplace-interests', startup.slug] });
          }}
          onSendFounderReply={async (record) => {
            await appendMarketplaceThreadMessage({
              threadId: record.id,
              senderUserId: startup.ownerUserId,
              senderName: founder?.name ?? startup.founderDisplayName ?? startup.name,
              senderRole: 'founder',
              body: 'Thanks for reaching out. Happy to share more context and next steps for this deal.',
            });
            await queryClient.invalidateQueries({ queryKey: ['marketplace-interests', startup.slug] });
          }}
        />
      ) : null}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <MarketplaceTrendChart
          title="Revenue history"
          subtitle={`${startup.growthPct >= 0 ? '+' : ''}${startup.growthPct}% vs previous month`}
          points={startup.revenueHistory}
        />
        <MarketplaceTrendChart
          title="Traffic history"
          subtitle={`${(startup.trafficMonthlyVisitors ?? 0).toLocaleString('en-US')} visitors/mo · ${startup.verification.traffic.status}`}
          points={startup.trafficHistory}
          mode="number"
        />
      </div>

      <section className="rounded-xl border border-border bg-card p-4 sm:p-8">
        <h2 className="mb-4 text-lg font-bold sm:mb-6">Startup insights</h2>
        <div className="grid gap-5 sm:gap-8 lg:grid-cols-2">
          <div className="space-y-5 sm:space-y-6">
            <InsightBlock
              icon={<Lightbulb className="h-4 w-4" />}
              label="Value proposition"
              body={detail.insights.valueProposition}
            />
            <InsightBlock
              icon={<Target className="h-4 w-4" />}
              label="Problem solved"
              body={detail.insights.problemSolved}
            />
            <InsightBlock
              icon={<DollarSign className="h-4 w-4" />}
              label="Pricing"
              body={detail.insights.pricing}
            />
          </div>
          <div className="space-y-5 sm:space-y-6">
            <InsightBlock
              icon={<Users className="h-4 w-4" />}
              label="Target audience"
              body={detail.insights.targetAudience}
            />
            <div>
              <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <Building2 className="h-4 w-4" />
                Business details
              </div>
              <div className="flex flex-wrap gap-2">
                {detail.insights.businessPills.map((p) => (
                  <span
                    key={p}
                    className="rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-bold"
                  >
                    {p}
                  </span>
                ))}
                <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-bold">
                  <Users className="h-3.5 w-3.5" />
                  {detail.insights.userCountLabel}
                </span>
              </div>
            </div>
            <InsightBlock
              icon={<Sparkles className="h-4 w-4" />}
              label="Additional info"
              body={detail.insights.additionalInfo}
            />
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-2 border-t border-border pt-5 sm:mt-8 sm:pt-6">
          {detail.insights.tags.map((t) => (
            <span
              key={t}
              className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground"
            >
              {t}
            </span>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-4 sm:p-8">
        <h2 className="mb-4 text-lg font-bold sm:mb-6">Tech stack</h2>
        <div className="space-y-4 sm:space-y-5">
          <div>
            <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Frontend
            </div>
            <div className="flex flex-wrap gap-2">
              {detail.techStack.frontend.map((t) => (
                <TechPill key={t} tech={t} />
              ))}
            </div>
          </div>
          <div>
            <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Backend
            </div>
            <div className="flex flex-wrap gap-2">
              {detail.techStack.backend.map((t) => (
                <TechPill key={t} tech={t} />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card px-4 py-7 text-center sm:px-10 sm:py-10">
        <Quote className="mx-auto mb-4 h-8 w-8 text-muted-foreground/40" />
        <blockquote className="mx-auto max-w-2xl text-base font-medium leading-relaxed sm:text-lg">
          {detail.founderQuote}
        </blockquote>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
          {founder ? (
            <>
              <FounderLink
                handle={founder.handle}
                className="inline-flex items-center gap-3 text-foreground"
              >
                <img
                  src={founderAvatarUrl(founder.avatarSeed)}
                  alt=""
                  className="h-10 w-10 shrink-0 rounded-full border border-border bg-muted"
                />
                <span className="text-left font-bold">{founder.name}</span>
              </FounderLink>
              <div className="max-w-full text-center text-sm text-muted-foreground sm:text-left">
                Founder of{' '}
                <StartupLink slug={startup.slug} className="text-muted-foreground hover:text-foreground">
                  {startup.name}
                </StartupLink>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3 text-left">
              <img
                src={founderAvatarUrl(startup.founderHandle)}
                alt=""
                className="h-10 w-10 rounded-full border border-border bg-muted"
              />
              <div>
                <FounderLink handle={startup.founderHandle} className="block font-bold text-foreground">
                  {startup.founderDisplayName ?? startup.founderHandle}
                </FounderLink>
                <div className="text-sm text-muted-foreground">
                  Founder of{' '}
                  <StartupLink slug={startup.slug} className="text-muted-foreground">
                    {startup.name}
                  </StartupLink>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      <Dialog open={contactOpen} onOpenChange={setContactOpen}>
        <DialogContent className="max-w-md border-border bg-card sm:rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-left text-xl font-bold">
              Express Interest in {startup.name}
            </DialogTitle>
            <DialogDescription className="text-left text-sm text-muted-foreground">
              Non-binding expression of interest. Your message helps the founder understand your profile. No
              transaction is handled on the platform.
            </DialogDescription>
          </DialogHeader>
          <ContactSellerForm
            listing={startup}
            startupName={startup.name}
            onSent={async () => {
              await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['marketplace-interests', startup.slug] }),
                queryClient.invalidateQueries({ queryKey: ['marketplace-listing', startup.slug] }),
              ]);
              setContactOpen(false);
              toast({ title: 'Interest expressed', description: 'The founder will be notified.' });
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TechPill({ tech }: { tech: string }) {
  const domain = tech.toLowerCase().replace(/ /g, '').replace(/\./g, '') + '.com';
  const logoUrl = `https://icon.horse/icon/${domain}`;

  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-bold">
      <img src={logoUrl} alt={`${tech} logo`} className="h-4 w-4" />
      {tech}
    </span>
  );
}

function VerificationSection({ listing }: { listing: MarketplaceListing }) {
  return (
    <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Trust & verification</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Ownerr does not handle payments. Deals happen off-platform after introductions.
          </p>
        </div>
        <div className="min-w-[180px] rounded-xl border border-border bg-muted/20 p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Trust score</span>
            <span className="text-sm font-bold">{listing.trustScore}/100</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-sky-500"
              style={{ width: `${listing.trustScore}%` }}
            />
          </div>
          <div className="mt-2 text-sm font-bold text-foreground">{trustLabelFromScore(listing.trustScore)}</div>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/20 p-3 dark:border-[#2f3336]">
          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${listing.verification.revenue.status === 'verified' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-muted text-muted-foreground'}`}>
            <BadgeCheck className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold">Revenue {listing.verification.revenue.status}</div>
            <div className="text-[10px] text-muted-foreground">
              {listing.verification.revenue.provider ?? 'No provider connected'} · {listing.revenueHistory.length} months
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/20 p-3 dark:border-[#2f3336]">
          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${listing.verification.domain.status === 'verified' ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400' : 'bg-muted text-muted-foreground'}`}>
            <Globe className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold">Domain {listing.verification.domain.status}</div>
            <div className="text-[10px] text-muted-foreground">
              {listing.verification.domain.note}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/20 p-3 dark:border-[#2f3336]">
          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${listing.verification.traffic.status === 'verified' ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400' : 'bg-muted text-muted-foreground'}`}>
            <BarChart3 className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold">Traffic {listing.verification.traffic.status}</div>
            <div className="text-[10px] text-muted-foreground">
              {listing.trafficMonthlyVisitors != null
                ? `${listing.trafficMonthlyVisitors.toLocaleString()} visitors/mo · ${listing.trafficTrend}`
                : 'No data'}
            </div>
            <div className="mt-1 text-[10px] text-muted-foreground">
              {listing.verification.traffic.sourceLabel ?? 'Manual upload'}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FounderControlsSection({
  listing,
  interestRecords,
  onVerificationUpdated,
  onDomainVerify,
  onInterestStageUpdated,
  onSendFounderReply,
}: {
  listing: MarketplaceListing;
  interestRecords: MarketplaceInterestRecord[];
  onVerificationUpdated: (
    kind: keyof MarketplaceListing['verification'],
    status: MarketplaceListing['verification'][keyof MarketplaceListing['verification']]['status'],
    provider?: string | null,
  ) => Promise<void>;
  onDomainVerify: () => Promise<void>;
  onInterestStageUpdated: (record: MarketplaceInterestRecord, stage: MarketplaceInterestRecord['stage']) => Promise<void>;
  onSendFounderReply: (record: MarketplaceInterestRecord) => Promise<void>;
}) {
  const checklistItems = [
    listing.revenueVerified,
    listing.domainVerified,
    listing.trafficVerified,
  ];
  const completed = checklistItems.filter(Boolean).length;
  const checklistPct = Math.round((completed / checklistItems.length) * 100);
  return (
    <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-bold">Founder controls</h2>
          <p className="text-sm text-muted-foreground">
            Mock-only verification and inbox tools for the listing owner.
          </p>
        </div>
        <div className="text-sm text-muted-foreground">
          Inbox: <span className="font-bold text-foreground">{interestRecords.length}</span>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
        <FounderVerificationCard
          title="Revenue verification"
          description={`${listing.verification.revenue.note} Provider: ${listing.verification.revenue.provider ?? 'none'}`}
          actions={[
            { label: 'Mark pending', onClick: () => onVerificationUpdated('revenue', 'pending', listing.revenueProvider ?? 'Stripe') },
            { label: 'Verify', onClick: () => onVerificationUpdated('revenue', 'verified', listing.revenueProvider ?? 'Stripe') },
          ]}
        />
        <FounderVerificationCard
          title="Domain verification"
          description={`Add this TXT record: ${listing.verification.domain.expectedValue ?? 'n/a'}`}
          actions={[
            { label: 'Verify TXT record', onClick: onDomainVerify },
          ]}
          helper="Why it matters: buyers trust that the founder actually controls the domain before moving off-platform."
        />
        <FounderVerificationCard
          title="Traffic connection"
          description={`${listing.verification.traffic.note} Source: ${listing.verification.traffic.sourceLabel ?? 'Manual upload'}`}
          actions={[
            { label: 'Manual upload', onClick: () => onVerificationUpdated('traffic', 'verified', 'Manual upload') },
            { label: 'Connect GA', onClick: () => onVerificationUpdated('traffic', 'verified', 'Google Analytics') },
          ]}
        />
      </div>
      <div className="mt-5 rounded-lg border border-border bg-muted/20 p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Founder checklist</div>
            <div className="text-sm font-bold text-foreground">{checklistPct}% complete</div>
          </div>
          <div className="text-xs text-muted-foreground">{completed}/3 completed</div>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-sky-500" style={{ width: `${checklistPct}%` }} />
        </div>
        <div className="mt-3 space-y-2 text-sm">
          <FounderChecklistRow done={listing.revenueVerified} label="Verify revenue" />
          <FounderChecklistRow done={listing.domainVerified} label="Verify domain" />
          <FounderChecklistRow done={listing.trafficVerified} label="Add traffic" />
        </div>
      </div>
      <div className="mt-5 rounded-lg border border-border bg-muted/20 p-4">
        <div className="mb-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Inbox</div>
        {interestRecords.length === 0 ? (
          <p className="text-sm text-muted-foreground">No buyer messages yet.</p>
        ) : (
          <div className="space-y-3">
            {interestRecords
              .slice()
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .map((record) => (
                <div key={record.id} className="rounded-lg border border-border bg-card p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-bold">{record.buyerName}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(record.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {record.email} · {record.buyerRole}
                    {record.offerAmount ? ` · ${formatCurrency(record.offerAmount)}` : ''}
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-bold">
                      {record.stage}
                    </span>
                    <div className="flex items-center gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => void onSendFounderReply(record)}>
                        Reply
                      </Button>
                      <Select value={record.stage} onValueChange={(value) => void onInterestStageUpdated(record, value as MarketplaceInterestRecord['stage'])}>
                      <SelectTrigger className="h-8 w-[150px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="interested">Interested</SelectItem>
                        <SelectItem value="contacted">Contacted</SelectItem>
                        <SelectItem value="negotiating">Negotiating</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="mt-3 space-y-2">
                    {record.messages.map((message) => (
                      <div key={message.id} className="rounded-md border border-border bg-muted/20 px-3 py-2">
                        <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                          {message.senderName} · {message.senderRole}
                        </div>
                        <p className="mt-1 text-sm text-foreground">{message.body}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </section>
  );
}

function FounderVerificationCard({
  title,
  description,
  actions,
  helper,
}: {
  title: string;
  description: string;
  actions: { label: string; onClick: () => void | Promise<void> }[];
  helper?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/20 p-4">
      <div className="text-sm font-bold">{title}</div>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      {helper ? <p className="mt-2 text-xs text-muted-foreground">{helper}</p> : null}
      <div className="mt-3 flex flex-wrap gap-2">
        {actions.map((action) => (
          <Button key={action.label} type="button" variant="outline" size="sm" onClick={() => void action.onClick()}>
            {action.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

function FounderChecklistRow({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-foreground">{label}</span>
      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${done ? 'bg-emerald-500/15 text-emerald-600' : 'bg-muted text-muted-foreground'}`}>
        {done ? 'Done' : 'Pending'}
      </span>
    </div>
  );
}

function InsightBlock({
  icon,
  label,
  body,
}: {
  icon: ReactNode;
  label: string;
  body: string;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="text-sm leading-relaxed text-foreground">{body}</p>
    </div>
  );
}

function ContactSellerForm({
  listing,
  startupName,
  onSent,
}: {
  listing: MarketplaceListing;
  startupName: string;
  onSent: () => void | Promise<void>;
}) {
  const { currentUser } = useMockSession();
  const { toast } = useToast();
  const [name, setName] = useState('John Doe');
  const [email, setEmail] = useState('john@example.com');
  const [message, setMessage] = useState('Can you share more about your growth and churn?');
  const [offer, setOffer] = useState('10000');

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!currentUser) return;
    if (message.trim().length < 20) return;
    try {
      await submitMarketplaceInterest({
        listingId: listing.slug,
        buyerUserId: currentUser.id,
        buyerName: name.trim() || currentUser.name,
        buyerRole: currentUser.role,
        email: email.trim(),
        message: message.trim(),
        offerAmount: offer.trim() ? Number(offer.replace(/[^0-9.]/g, '')) : null,
      });
      await onSent();
    } catch (error) {
      toast({
        title: 'Could not send interest',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="cs-name" className="font-bold">
          Your Name *
        </Label>
        <Input
          id="cs-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border-border bg-background"
          autoComplete="name"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="cs-email" className="font-bold">
          Your Email *
        </Label>
        <Input
          id="cs-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border-border bg-background"
          autoComplete="email"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="cs-msg" className="font-bold">
          Message (minimum 20 characters) *
        </Label>
        <Textarea
          id="cs-msg"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          className="resize-y border-border bg-background"
          placeholder={`Tell us about your interest in ${startupName}…`}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="cs-offer" className="font-bold">
          Offer Amount (USD) (optional)
        </Label>
        <Input
          id="cs-offer"
          inputMode="numeric"
          value={offer}
          onChange={(e) => setOffer(e.target.value)}
          className="border-border bg-background"
        />
      </div>
      <Button type="submit" className="w-full bg-zinc-200 font-bold text-black hover:bg-white">
        Send message
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Ownerr does not handle payments. Deals happen off-platform.
      </p>
    </form>
  );
}