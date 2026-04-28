import { useMemo, useState } from 'react';
import type { Startup } from '@/lib/mockData';
import { useMockBidding } from '@/context/MockBiddingContext';
import { bidderDisplayName, getMockBidders, listingBasePrice } from '@/lib/mockBiddingBidders';
import {
  DEAL_CLOSING_FLOW,
  DEAL_STAGE_LABEL,
  closingProgress,
  dealBlocksNewBids,
  nextApprovalButtonLabel,
} from '@/lib/mockBiddingPipeline';
import { cn, formatShortCurrency, founderAvatarUrl } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Bid, DealStage } from '@/lib/mockBiddingTypes';
import { useToast } from '@/hooks/use-toast';
import { useMockSession } from '@/context/MockSessionContext';
import { submitMarketplaceInterest } from '@/lib/mockMarketplaceService';
import {
  Check,
  ChevronRight,
  CircleDollarSign,
  FileSignature,
  Handshake,
  Landmark,
  Package,
  Search,
  MessageCircle,
} from 'lucide-react';

function maxActiveBid(bids: Bid[]): number | null {
  const act = bids.filter((b) => b.status === 'ACTIVE');
  if (act.length === 0) return null;
  return Math.max(...act.map((b) => b.amount));
}

/** Accepted bid’s buyer (mock) — startup `founderHandle` is never mutated. */
function winningBidderLabel(record: { deal: { acceptedBidId: string | null } | null; bids: Bid[] }): string | null {
  const id = record.deal?.acceptedBidId;
  if (!id) return null;
  const b = record.bids.find((x) => x.id === id);
  return b ? bidderDisplayName(b.userId) : null;
}

function winningBidderHandle(record: { deal: { acceptedBidId: string | null } | null; bids: Bid[] }): string | null {
  const id = record.deal?.acceptedBidId;
  if (!id) return null;
  return record.bids.find((x) => x.id === id)?.userId ?? null;
}

const PIPELINE_ICONS = [Handshake, Landmark, Search, FileSignature, Package, CircleDollarSign] as const;

function OwnershipTransferVisual({
  startup,
  sellerLabel,
  buyerHandle,
  buyerLabel,
  progressFrac,
  mode,
  compact,
}: {
  startup: Startup;
  sellerLabel: string;
  buyerHandle: string | null;
  buyerLabel: string | null;
  /** 0–1 during closing; 1 when payment released */
  progressFrac: number;
  mode: 'collecting' | 'closing' | 'done';
  /** Shorter layout for acquire grid cards */
  compact?: boolean;
}) {
  const pct = Math.round(Math.min(1, Math.max(0, progressFrac)) * 100);
  const av = compact ? 32 : 48;
  const avatarClass = compact
    ? 'h-8 w-8 border-[1.5px]'
    : 'h-12 w-12 border-2 shadow-md';
  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border border-border bg-gradient-to-br from-muted/80 via-card to-sky-500/5 shadow-sm ring-1 ring-black/5 dark:border-[#2f3336] dark:from-zinc-900/90 dark:via-[#16181c] dark:to-sky-500/10 dark:ring-white/5',
        compact ? 'mt-2 rounded-lg ring-0' : 'mt-3',
      )}
    >
      <div
        className={cn(
          'grid grid-cols-[1fr_auto_1fr] items-center',
          compact ? 'gap-1.5 px-2 py-2' : 'gap-2 px-3 py-3 sm:gap-3 sm:px-4',
        )}
      >
        <div className="flex min-w-0 flex-col items-center gap-0.5 text-center">
          <div className="relative">
            <img
              src={founderAvatarUrl(startup.founderHandle)}
              alt=""
              width={av}
              height={av}
              className={cn(
                'rounded-full border-amber-500/60 object-cover dark:border-amber-400/50',
                avatarClass,
              )}
            />
            <span
              className={cn(
                'absolute -bottom-0.5 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-amber-600 font-black uppercase tracking-wide text-white dark:bg-amber-500',
                compact ? 'px-1 py-px text-[6px]' : 'px-1.5 py-px text-[8px]',
              )}
            >
              Seller
            </span>
          </div>
          <p
            className={cn(
              'line-clamp-2 font-bold leading-tight text-foreground dark:text-white',
              compact ? 'mt-1 max-w-full text-[10px]' : 'mt-2 text-[11px]',
            )}
          >
            {sellerLabel}
          </p>
          {!compact ? (
            <p className="text-[9px] font-medium text-muted-foreground dark:text-[#71767b]">On listing (unchanged)</p>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-col items-center px-0.5">
          <ChevronRight
            className={cn(
              compact ? 'h-5 w-5' : 'h-7 w-7 sm:h-8 sm:w-8',
              mode === 'collecting' && 'text-muted-foreground/60',
              mode === 'closing' && 'text-sky-600 dark:text-sky-400',
              mode === 'done' && 'text-emerald-600 dark:text-emerald-400',
            )}
            aria-hidden
            strokeWidth={2.5}
          />
          {!compact ? (
            <span className="hidden text-center text-[8px] font-bold uppercase tracking-wide text-muted-foreground sm:block">
              Mock flow
            </span>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-col items-center gap-0.5 text-center">
          {buyerHandle && buyerLabel ? (
            <>
              <div className="relative">
                <img
                  src={founderAvatarUrl(buyerHandle)}
                  alt=""
                  width={av}
                  height={av}
                  className={cn(
                    'rounded-full border-2 object-cover',
                    compact ? 'h-8 w-8' : 'h-12 w-12 shadow-md',
                    mode === 'done'
                      ? 'border-emerald-500/70 ring-2 ring-emerald-500/25 dark:border-emerald-400/60'
                      : 'border-sky-500/60 dark:border-sky-400/50',
                  )}
                />
                <span
                  className={cn(
                    'absolute -bottom-0.5 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full font-black uppercase tracking-wide text-white',
                    compact ? 'px-1 py-px text-[6px]' : 'px-1.5 py-px text-[8px]',
                    mode === 'done' ? 'bg-emerald-600 dark:bg-emerald-500' : 'bg-sky-600 dark:bg-sky-500',
                  )}
                >
                  {mode === 'done' ? 'Done' : 'Buyer'}
                </span>
              </div>
              <p
                className={cn(
                  'line-clamp-2 font-bold leading-tight text-foreground dark:text-white',
                  compact ? 'mt-1 max-w-full text-[10px]' : 'mt-2 text-[11px]',
                )}
              >
                {buyerLabel}
              </p>
              {!compact ? (
                <p className="text-[9px] font-medium text-muted-foreground dark:text-[#71767b]">
                  {mode === 'done' ? 'Mock transfer complete' : 'Tracked in IndexedDB only'}
                </p>
              ) : (
                <p className="text-[8px] text-muted-foreground dark:text-[#71767b]">
                  {mode === 'done' ? 'Complete' : 'Mock only'}
                </p>
              )}
            </>
          ) : (
            <>
              <div
                className={cn(
                  'flex items-center justify-center rounded-full border-2 border-dashed border-muted-foreground/40 bg-muted/50 font-bold text-muted-foreground dark:border-[#536471] dark:bg-zinc-800/80',
                  compact ? 'h-8 w-8 text-[9px]' : 'h-12 w-12 text-[10px]',
                )}
              >
                ?
              </div>
              <p
                className={cn(
                  'font-bold text-muted-foreground dark:text-[#71767b]',
                  compact ? 'mt-1 text-[10px]' : 'mt-2 text-[11px]',
                )}
              >
                Bidder
              </p>
              {!compact ? (
                <p className="text-[9px] text-muted-foreground dark:text-[#71767b]">Accept a bid to show here</p>
              ) : (
                <p className="text-[8px] text-muted-foreground dark:text-[#71767b]">After accept</p>
              )}
            </>
          )}
        </div>
      </div>

      <div
        className={cn(
          'border-t border-border/80 bg-muted/30 dark:border-[#2f3336] dark:bg-black/20',
          compact ? 'px-2 py-1.5' : 'px-3 py-2.5',
        )}
      >
        <div className="mb-0.5 flex items-center justify-between text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
          <span>{compact ? 'Closing' : 'Closing pipeline'}</span>
          <span className="tabular-nums text-foreground dark:text-white">{pct}%</span>
        </div>
        <div className={cn('w-full overflow-hidden rounded-full bg-muted dark:bg-zinc-800', compact ? 'h-1.5' : 'h-2')}>
          <div
            className={cn(
              'h-full rounded-full bg-gradient-to-r transition-[width] duration-500 ease-out',
              mode === 'done' ? 'from-emerald-500 to-teal-400' : 'from-sky-600 to-emerald-500',
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
        {!compact ? (
          <p className="mt-1.5 text-[9px] leading-snug text-muted-foreground dark:text-[#71767b]">
            Listing data stays on the seller; buyer appears here for mock escrow steps only.
          </p>
        ) : (
          <p className="sr-only">
            Seller stays on the listing record; the buyer slot reflects the accepted mock bid only.
          </p>
        )}
      </div>
    </div>
  );
}

function DealPipelineStepper({ stage }: { stage: DealStage }) {
  const curIdx = DEAL_CLOSING_FLOW.indexOf(stage);
  if (curIdx < 0) return null;
  const allComplete = stage === 'PAYMENT_RELEASED';
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3 dark:border-[#2f3336] dark:bg-zinc-900/40">
      <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
        Mock closing — each approval is logged
      </p>
      <ol className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-stretch">
        {DEAL_CLOSING_FLOW.map((step, idx) => {
          const Icon = PIPELINE_ICONS[idx] ?? Handshake;
          const done = allComplete || curIdx > idx;
          const active = !allComplete && curIdx === idx;
          const pending = !done && !active;
          return (
            <li
              key={step}
              className={cn(
                'flex min-w-0 flex-1 items-center gap-2 rounded-md border px-2 py-2 text-[10px] font-bold sm:min-w-[104px] sm:flex-initial',
                done && 'border-emerald-500/40 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100',
                active &&
                  'border-sky-500/50 bg-sky-500/10 text-sky-950 ring-1 ring-sky-500/30 dark:text-sky-100',
                pending && 'border-border text-muted-foreground opacity-70 dark:border-[#2f3336]',
              )}
            >
              <span
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
                  done && 'bg-emerald-600 text-white',
                  active && 'bg-sky-600 text-white',
                  pending && 'bg-muted text-muted-foreground',
                )}
              >
                {done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : <Icon className="h-3.5 w-3.5" strokeWidth={2.5} />}
              </span>
              <span className="min-w-0 leading-tight">{DEAL_STAGE_LABEL[step]}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function MockAcquireBidPanel({ startup, compact }: { startup: Startup; compact?: boolean }) {
  const { toast } = useToast();
  const { currentUser, isBuyer, isAuthenticated, openAuthDialog } = useMockSession();
  const bidding = useMockBidding();
  const basePrice = listingBasePrice(startup);
  const record = bidding.getRecord(startup.slug);
  const sellerLabel = startup.founderDisplayName ?? bidderDisplayName(startup.founderHandle);
  const isOwner = !!currentUser && (startup.founderHandle === currentUser.id || ('ownerUserId' in startup && startup.ownerUserId === currentUser.id));

  const high = maxActiveBid(record.bids);
  const [placeOpen, setPlaceOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [amountStr, setAmountStr] = useState('');
  const [placeError, setPlaceError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pipelineBusy, setPipelineBusy] = useState(false);

  const minNext = bidding.minNextBid(startup.slug, basePrice);
  const deal = record.deal;
  const inClosingPipeline = deal && dealBlocksNewBids(deal.stage) && deal.stage !== 'RESET';
  const progress = deal ? closingProgress(deal.stage) : null;
  const winnerLabel = winningBidderLabel(record);
  const buyerHandle = winningBidderHandle(record);
  const visualMode =
    deal?.stage === 'PAYMENT_RELEASED' ? 'done' : inClosingPipeline ? 'closing' : 'collecting';
  const progressFrac =
    visualMode === 'done'
      ? 1
      : visualMode === 'closing' && progress
        ? progress.done / progress.total
        : high != null
          ? 0.05
          : 0;

  async function submitBid() {
    setPlaceError(null);
    if (!isAuthenticated || !currentUser) {
      setPlaceOpen(false);
      openAuthDialog();
      return;
    }
    const amount = Number(amountStr.replace(/[^0-9.]/g, ''));
    if (!Number.isFinite(amount) || amount <= 0) {
      setPlaceError('Enter a valid bid amount.');
      return;
    }
    setBusy(true);
    const res = await bidding.placeBid(startup.slug, currentUser.id, amount, basePrice);
    setBusy(false);
    if (!res.ok) {
      setPlaceError(res.error);
      return;
    }
    setAmountStr('');
    setPlaceOpen(false);
    toast({
      title: 'Bid saved',
      description: 'Ownerr does not handle payments. If the founder responds, the deal continues off-platform.',
    });
  }

  async function onAcceptBid(bidId: string) {
    const res = await bidding.acceptBid(startup.slug, bidId, { sellerLabel });
    if (!res.ok) toast({ title: 'Cannot accept', description: res.error, variant: 'destructive' });
  }

  async function onApproveNext() {
    setPipelineBusy(true);
    const res = await bidding.approveDealStep(startup.slug, { sellerLabel });
    setPipelineBusy(false);
    if (!res.ok) toast({ title: 'Cannot advance', description: res.error, variant: 'destructive' });
  }

  const bidActions = (
    <>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        className={cn('font-bold', compact ? 'h-9 w-full' : 'h-8')}
        disabled={!!(deal && dealBlocksNewBids(deal.stage)) || (isAuthenticated && (!isBuyer || isOwner))}
        onClick={() => {
          if (!isAuthenticated) {
            openAuthDialog();
            return;
          }
          setPlaceError(null);
          setPlaceOpen(true);
        }}
      >
        {!isAuthenticated ? 'Login to bid' : isOwner ? 'Owner view' : isBuyer ? 'Place bid' : 'Buyer mode'}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className={cn('font-bold', compact ? 'h-9 w-full' : 'h-8')}
        onClick={() => setViewOpen(true)}
      >
        View bids
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className={cn('font-bold', compact ? 'h-9 w-full' : 'h-8')}
        disabled={isAuthenticated && (!isBuyer || isOwner)}
        onClick={() =>
          !isAuthenticated || !currentUser
            ? openAuthDialog()
            : void submitMarketplaceInterest({
                listingId: startup.slug,
                buyerUserId: currentUser.id,
                buyerName: currentUser.name,
                buyerRole: currentUser.role,
                email: currentUser.email,
                message: `Interested in ${startup.name}. Can you share more about revenue quality and the current growth trend?`,
                offerAmount: null,
              })
                .then(() =>
                  toast({
                    title: 'Interest expressed',
                    description: 'Ownerr does not handle payments. The founder can reply, but the deal moves off-platform.',
                  }),
                )
                .catch((error) =>
                  toast({
                    title: 'Could not send interest',
                    description: error instanceof Error ? error.message : 'Please try again.',
                    variant: 'destructive',
                  }),
                )
        }
      >
        <MessageCircle className="h-3.5 w-3.5 mr-1" />
        {!isAuthenticated ? 'Login to contact' : isOwner ? 'Owner view' : isBuyer ? 'Express Interest' : 'Buyer mode'}
      </Button>
    </>
  );

  const doneBanner =
    deal?.stage === 'PAYMENT_RELEASED' ? (
      <div
        className={cn(
          'flex items-center gap-2 rounded-md border border-emerald-500/40 bg-emerald-500/10 font-bold text-emerald-900 dark:text-emerald-100',
          compact ? 'px-2 py-1 text-[9px]' : 'mt-2 px-2 py-1.5 text-[10px]',
        )}
      >
        <Check className={cn('shrink-0', compact ? 'h-3 w-3' : 'h-3.5 w-3.5')} strokeWidth={3} aria-hidden />
        {compact ? 'Pipeline done — details in View bids.' : 'All approvals saved — open View bids for the full timeline.'}
      </div>
    ) : null;

  return (
    <>
      {compact ? (
        <div className="flex flex-col gap-2.5 font-mono text-[11px]">
          <div className="min-w-0">
            <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground dark:text-[#71767b]">
              Non-binding bids
            </div>
            <div className="mt-0.5 truncate text-sm font-bold tabular-nums text-foreground dark:text-white">
              {high != null ? (
                <>
                  High{' '}
                  <span className="text-emerald-600 dark:text-emerald-400">{formatShortCurrency(high)}</span>
                </>
              ) : (
                <span className="text-muted-foreground dark:text-[#71767b]">No bids yet</span>
              )}
            </div>
            <p className="truncate text-[10px] text-muted-foreground dark:text-[#71767b]">
              Floor {formatShortCurrency(basePrice)} · max 3 · local demo
            </p>
          </div>
          <OwnershipTransferVisual
            startup={startup}
            sellerLabel={sellerLabel}
            buyerHandle={buyerHandle}
            buyerLabel={winnerLabel}
            progressFrac={progressFrac}
            mode={visualMode}
            compact
          />
          {doneBanner}
          <div className="grid grid-cols-2 gap-2">{bidActions}</div>
        </div>
      ) : (
        <div className="flex flex-col gap-2 font-mono text-[11px]">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div className="min-w-0">
              <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground dark:text-[#71767b]">
                Non-binding bids
              </div>
              <div className="mt-0.5 text-sm font-bold tabular-nums text-foreground dark:text-white">
                {high != null ? (
                  <>
                    High:{' '}
                    <span className="text-emerald-600 dark:text-emerald-400">{formatShortCurrency(high)}</span>
                  </>
                ) : (
                  <span className="text-muted-foreground dark:text-[#71767b]">No bids yet</span>
                )}
              </div>
              <div className="text-[10px] text-muted-foreground dark:text-[#71767b]">
                Floor {formatShortCurrency(basePrice)} · max 3 bidders · mock only
              </div>
              <div className="mt-1 text-[10px] text-muted-foreground dark:text-[#71767b]">
                Ownerr does not handle payments. Deals happen off-platform.
              </div>
              <OwnershipTransferVisual
                startup={startup}
                sellerLabel={sellerLabel}
                buyerHandle={buyerHandle}
                buyerLabel={winnerLabel}
                progressFrac={progressFrac}
                mode={visualMode}
              />
              {doneBanner}
            </div>
            <div className="flex shrink-0 flex-wrap justify-end gap-1.5">{bidActions}</div>
          </div>
        </div>
      )}

      <Dialog open={placeOpen} onOpenChange={setPlaceOpen}>
        <DialogContent className="max-w-md font-mono sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Place bid · {startup.name}</DialogTitle>
            <DialogDescription>
              Bid as {currentUser?.name ?? 'your account'} above {formatShortCurrency(minNext - 1)}. Ownerr does not
              handle payments; this is a mock off-platform introduction flow.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-1">
            <div className="space-y-2">
              <Label>Buyer</Label>
              <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm font-semibold">
                {currentUser?.name ?? 'Login required'}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`bid-amt-${startup.slug}`}>Amount (USD)</Label>
              <Input
                id={`bid-amt-${startup.slug}`}
                inputMode="decimal"
                placeholder={`e.g. ${Math.ceil(minNext)}`}
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
              />
            </div>
            {placeError ? <p className="text-sm font-medium text-destructive">{placeError}</p> : null}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setPlaceOpen(false)}>
              Cancel
            </Button>
            <Button type="button" disabled={busy} onClick={() => void submitBid()}>
              {busy ? 'Saving…' : 'Submit bid'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="flex max-h-[min(92vh,760px)] max-w-lg flex-col font-mono sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Bids · {startup.name}</DialogTitle>
            <DialogDescription>
              Seller on listing: <span className="font-semibold text-foreground">{sellerLabel}</span> (unchanged in
              app data). After accept, approve each closing step — every approval is written to the timeline (mock, no
              payments). Winning buyer is tracked from the accepted bid only.
            </DialogDescription>
          </DialogHeader>

          <OwnershipTransferVisual
            startup={startup}
            sellerLabel={sellerLabel}
            buyerHandle={buyerHandle}
            buyerLabel={winnerLabel}
            progressFrac={progressFrac}
            mode={visualMode}
          />

          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
            {deal && inClosingPipeline ? <DealPipelineStepper stage={deal.stage} /> : null}
            {deal?.stage === 'PAYMENT_RELEASED' ? (
              <p className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-900 dark:text-emerald-100">
                <span className="inline-flex flex-wrap items-center gap-x-0.5 gap-y-1">
                  <span>Flow: Bid accepted</span>
                  <ChevronRight className="mx-0.5 h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden strokeWidth={2.5} />
                  <span>Escrow funded</span>
                  <ChevronRight className="mx-0.5 h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden strokeWidth={2.5} />
                  <span>Due diligence</span>
                  <ChevronRight className="mx-0.5 h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden strokeWidth={2.5} />
                  <span>Contracts signed</span>
                  <ChevronRight className="mx-0.5 h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden strokeWidth={2.5} />
                  <span>Assets transferred</span>
                  <ChevronRight className="mx-0.5 h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden strokeWidth={2.5} />
                  <span>Payment released.</span>
                </span>{' '}
                <span className="mt-1 block font-medium text-emerald-950/90 dark:text-emerald-50/95">
                  All steps recorded below.
                </span>
              </p>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-muted-foreground">
                Deal stage:{' '}
                <span className="font-bold text-foreground">{deal?.stage ? DEAL_STAGE_LABEL[deal.stage] : '—'}</span>
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-b border-border pb-2 dark:border-[#2f3336]">
              <Button
                type="button"
                size="sm"
                variant="destructive"
                className="font-bold"
                onClick={() => {
                  if (
                    !window.confirm(
                      'Reset all bids and deal state for this listing? History stays in the timeline.',
                    )
                  )
                    return;
                  void bidding.resetListing(startup.slug);
                }}
              >
                Reset bids
              </Button>
              {deal && inClosingPipeline && deal.stage !== 'PAYMENT_RELEASED' ? (
                <Button
                  type="button"
                  size="sm"
                  className="font-bold"
                  disabled={pipelineBusy}
                  onClick={() => void onApproveNext()}
                >
                  {pipelineBusy ? 'Saving…' : nextApprovalButtonLabel(deal.stage)}
                </Button>
              ) : null}
            </div>

            <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 md:grid-cols-2">
              <div className="flex min-h-0 flex-col rounded-lg border border-border dark:border-[#2f3336]">
                <div className="border-b border-border px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground dark:border-[#2f3336]">
                  Bids
                </div>
                <ScrollArea className="h-[220px] md:h-[260px]">
                  <div className="p-2">
                    {record.bids.length === 0 ? (
                      <p className="p-2 text-xs text-muted-foreground">No bids yet.</p>
                    ) : (
                      <ul className="space-y-2">
                        {[...record.bids]
                          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                          .map((b) => {
                            const isHigh =
                              b.status === 'ACTIVE' && high != null && b.amount === high;
                            return (
                              <li
                                key={b.id}
                                className={cn(
                                  'rounded-md border px-2 py-2 text-xs',
                                  isHigh
                                    ? 'border-emerald-500/50 bg-emerald-500/10 dark:border-emerald-500/40 dark:bg-emerald-500/10'
                                    : 'border-border dark:border-[#2f3336]',
                                )}
                              >
                                <div className="flex flex-wrap items-center justify-between gap-1">
                                  <span className="font-bold">{bidderDisplayName(b.userId)}</span>
                                  <span className="tabular-nums font-bold">{formatShortCurrency(b.amount)}</span>
                                </div>
                                <div className="mt-1 flex flex-wrap items-center justify-between gap-1 text-[10px] text-muted-foreground">
                                  <span className="uppercase">{b.status}</span>
                                  <span className="rounded-full border border-border px-2 py-0.5 text-[9px] font-bold">
                                    {b.relationshipStage}
                                  </span>
                                  {b.status === 'ACTIVE' && !dealBlocksNewBids(deal?.stage ?? null) ? (
                                    <span className="flex gap-1">
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        className="h-6 px-2 text-[10px] font-bold"
                                        onClick={() => void onAcceptBid(b.id)}
                                      >
                                        Accept
                                      </Button>
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        className="h-6 px-2 text-[10px] font-bold"
                                        onClick={() => void bidding.rejectBid(startup.slug, b.id)}
                                      >
                                        Reject
                                      </Button>
                                      {isOwner ? (
                                        <Select
                                          value={b.relationshipStage}
                                          onValueChange={(value) => void bidding.updateBidStage(startup.slug, b.id, value as Bid['relationshipStage'])}
                                        >
                                          <SelectTrigger className="h-6 w-[118px] px-2 text-[10px]">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="interested">Interested</SelectItem>
                                            <SelectItem value="contacted">Contacted</SelectItem>
                                            <SelectItem value="negotiating">Negotiating</SelectItem>
                                            <SelectItem value="closed">Closed</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      ) : null}
                                    </span>
                                  ) : null}
                                </div>
                              </li>
                            );
                          })}
                      </ul>
                    )}
                  </div>
                </ScrollArea>
              </div>

              <div className="flex min-h-0 flex-col rounded-lg border border-border dark:border-[#2f3336]">
                <div className="border-b border-border px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground dark:border-[#2f3336]">
                  Timeline
                </div>
                <ScrollArea className="h-[220px] md:h-[260px]">
                  <ol className="space-y-2 p-3">
                    {record.activityLog.length === 0 ? (
                      <li className="text-xs text-muted-foreground">No activity yet.</li>
                    ) : (
                      record.activityLog.map((log) => (
                        <li
                          key={log.id}
                          className="border-l-2 border-muted-foreground/30 pl-3 text-xs leading-snug text-foreground/90 dark:text-[#e7e9ea]"
                        >
                          <time className="block text-[10px] text-muted-foreground">
                            {new Date(log.timestamp).toLocaleString()}
                          </time>
                          {log.message}
                        </li>
                      ))
                    )}
                  </ol>
                </ScrollArea>
              </div>
            </div>

            {record.resetHistory.length > 0 ? (
              <p className="text-[10px] text-muted-foreground">
                Resets logged: {record.resetHistory.length} (see timeline for details)
              </p>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
