import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Users, Sparkles } from 'lucide-react';

import {
  CLAIM_SPOTS_TOTAL,
  claimSpotsBaseRoster,
  type ClaimSpotEntry,
  type ClaimSpotRole,
} from '@/lib/claimSpotsMockData';
import { addClaimSpotEntryDB, getClaimSpotEntriesDB } from '@/lib/db';
import { cn, founderAvatarUrl } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const CLAIM_TABLE_PAGE_SIZE = 50;

function roleLabel(role: ClaimSpotRole) {
  return role === 'founder' ? 'Founder' : 'Investor';
}

function formatClaimedAt(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function ClaimSpotsPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [idbClaims, setIdbClaims] = useState<ClaimSpotEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [claimOpen, setClaimOpen] = useState(false);
  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<ClaimSpotRole>('founder');
  const [tagline, setTagline] = useState('');
  const [tablePage, setTablePage] = useState(1);

  const refreshClaims = useCallback(async () => {
    const rows = await getClaimSpotEntriesDB();
    rows.sort((a, b) => new Date(b.claimedAt).getTime() - new Date(a.claimedAt).getTime());
    setIdbClaims(rows);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await refreshClaims();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshClaims]);

  const tableRows = useMemo(() => {
    return [...idbClaims, ...claimSpotsBaseRoster];
  }, [idbClaims]);

  const tableTotalPages = Math.max(1, Math.ceil(tableRows.length / CLAIM_TABLE_PAGE_SIZE));

  useEffect(() => {
    setTablePage((p) => Math.min(p, tableTotalPages));
  }, [tableTotalPages]);

  const paginatedTableRows = useMemo(() => {
    const start = (tablePage - 1) * CLAIM_TABLE_PAGE_SIZE;
    return tableRows.slice(start, start + CLAIM_TABLE_PAGE_SIZE);
  }, [tableRows, tablePage]);

  const tableRangeStart = tableRows.length === 0 ? 0 : (tablePage - 1) * CLAIM_TABLE_PAGE_SIZE + 1;
  const tableRangeEnd = Math.min(tablePage * CLAIM_TABLE_PAGE_SIZE, tableRows.length);

  const baseCount = claimSpotsBaseRoster.length;
  const totalClaimedShown = baseCount + idbClaims.length;
  const pct = Math.min(100, Math.round((totalClaimedShown / CLAIM_SPOTS_TOTAL) * 100));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = name.trim();
    const rawHandle = handle.trim().replace(/^@+/, '');
    const trimmedEmail = email.trim();
    if (!trimmedName || !rawHandle || !trimmedEmail) {
      toast({
        variant: 'destructive',
        title: 'Missing fields',
        description: 'Add your name, a handle (e.g. janedoe), and an email.',
      });
      return;
    }

    setSubmitting(true);
    try {
      const entry: ClaimSpotEntry = {
        id: `user-claim-${globalThis.crypto?.randomUUID?.() ?? String(Date.now())}`,
        name: trimmedName,
        handle: rawHandle,
        avatarUrl: founderAvatarUrl(rawHandle),
        email: trimmedEmail,
        role,
        claimedAt: new Date().toISOString(),
        tagline: tagline.trim() || undefined,
      };
      await addClaimSpotEntryDB(entry);
      await refreshClaims();
      setName('');
      setHandle('');
      setEmail('');
      setTagline('');
      setRole('founder');
      setClaimOpen(false);
      toast({
        title: 'Spot claimed',
        description: 'You are listed at the top of the roster (saved in this browser).',
      });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Could not save',
        description: err instanceof Error ? err.message : 'Try again.',
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="w-full min-w-0 pb-8">
      <div className="mb-6 rounded-xl border border-dashed border-emerald-500/40 bg-emerald-500/5 p-4 sm:mb-8 sm:p-5 dark:border-emerald-500/25 dark:bg-emerald-950/20">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-emerald-600/15 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200">
            <Sparkles className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-balance text-xl font-bold tracking-tight text-foreground sm:text-2xl dark:text-white">
              First {CLAIM_SPOTS_TOTAL} founders &amp; investors
            </h1>
            <p className="mt-2 text-pretty text-sm leading-relaxed text-muted-foreground dark:text-zinc-400">
              Roster of who claimed a free listing spot. Use{' '}
              <span className="font-semibold text-foreground dark:text-white">Claim your spot</span> to add yourself;
              claims are saved in IndexedDB in this browser.
            </p>
            <div className="mt-4 flex flex-col gap-4 sm:max-w-2xl sm:flex-row sm:items-end sm:justify-between">
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="flex justify-between text-xs font-bold text-muted-foreground dark:text-emerald-200/90">
                  <span>
                    {totalClaimedShown} / {CLAIM_SPOTS_TOTAL}
                  </span>
                  <span>claimed (incl. your saves)</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted dark:bg-emerald-950/80">
                  <div
                    className="h-full rounded-full bg-emerald-600 dark:bg-emerald-400"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={claimOpen} onOpenChange={setClaimOpen}>
        <DialogContent
          className={cn(
            'max-h-[min(88dvh,calc(100dvh-1rem))] w-[calc(100vw-1.25rem)] max-w-lg overflow-x-hidden overflow-y-auto overscroll-y-contain rounded-xl p-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))] pt-5 sm:max-h-[min(90vh,640px)] sm:w-full sm:p-6',
          )}
        >
          <DialogHeader className="space-y-2 pr-10 text-left sm:pr-12">
            <DialogTitle className="text-base leading-snug sm:text-lg">Claim your spot</DialogTitle>
            <DialogDescription className="text-pretty text-left text-xs leading-relaxed sm:text-sm">
              Choose founder or investor. Your row appears at the top of the roster after you submit (stored in this
              browser).
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={onSubmit} className="grid min-w-0 gap-4">
            <div className="grid min-w-0 gap-4 sm:grid-cols-2">
              <div className="min-w-0 space-y-2">
                <Label htmlFor="claim-name">Name</Label>
                <Input
                  id="claim-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Alex Rivera"
                  autoComplete="name"
                  className="min-h-11 sm:min-h-10"
                />
              </div>
              <div className="min-w-0 space-y-2">
                <Label htmlFor="claim-handle">Handle</Label>
                <Input
                  id="claim-handle"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  placeholder="alexr"
                  autoComplete="username"
                  className="min-h-11 sm:min-h-10"
                />
              </div>
              <div className="min-w-0 space-y-2 sm:col-span-2">
                <Label htmlFor="claim-email">Email</Label>
                <Input
                  id="claim-email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex@example.com"
                  autoComplete="email"
                  className="min-h-11 sm:min-h-10"
                />
              </div>
              <div className="min-w-0 space-y-2 sm:col-span-2">
                <Label htmlFor="claim-role">Role</Label>
                <Select value={role} onValueChange={(v) => setRole(v as ClaimSpotRole)}>
                  <SelectTrigger id="claim-role" className="h-11 min-h-11 sm:h-9 sm:min-h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent sideOffset={6}>
                    <SelectItem value="founder">Founder</SelectItem>
                    <SelectItem value="investor">Investor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-0 space-y-2 sm:col-span-2">
                <Label htmlFor="claim-tagline">Tagline (optional)</Label>
                <Input
                  id="claim-tagline"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder="Building in public"
                  className="min-h-11 sm:min-h-10"
                />
              </div>
            </div>
            <DialogFooter className="mt-1 flex w-full min-w-0 flex-row flex-wrap justify-end gap-2 sm:mt-0 sm:justify-end">
              <Button type="button" variant="outline" className="min-h-10 shrink-0" onClick={() => setClaimOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="min-h-10 shrink-0" disabled={submitting}>
                {submitting ? 'Saving…' : 'Submit claim'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <section className="mb-4" aria-labelledby="claim-roster-heading">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 pr-1">
            <h2
              id="claim-roster-heading"
              className="flex flex-wrap items-center gap-2 text-lg font-bold sm:text-xl"
            >
              <Users className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
              Who claimed a spot
            </h2>
            <p className="mt-1 break-words text-sm text-muted-foreground">
              {loading
                ? 'Loading roster…'
                : `${tableRows.length} rows — ${baseCount} seeded + ${idbClaims.length} from this browser.`}
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="shrink-0"
            onClick={() => setClaimOpen(true)}
          >
            Claim your spot
          </Button>
        </div>
      </section>

      <div className="overflow-hidden rounded-xl border border-border bg-card dark:border-[#2f3336] dark:bg-[#121212]">
        <ul className="divide-y divide-border md:hidden" role="list">
          {paginatedTableRows.map((entry) => (
            <li key={entry.id}>
              <div
                role="link"
                tabIndex={0}
                className="cursor-pointer px-3 py-3.5 transition-colors hover:bg-muted/60 active:bg-muted/80 dark:hover:bg-zinc-800/50"
                onClick={() => setLocation(`/founder/${encodeURIComponent(entry.handle)}`)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setLocation(`/founder/${encodeURIComponent(entry.handle)}`);
                  }
                }}
              >
                <div className="flex gap-3">
                  <img
                    src={founderAvatarUrl(entry.handle)}
                    alt=""
                    width={40}
                    height={40}
                    loading="lazy"
                    decoding="async"
                    className="h-10 w-10 shrink-0 rounded-full border border-border bg-muted object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <span className="font-semibold text-sky-700 underline-offset-2 dark:text-sky-400">
                        {entry.name}
                      </span>
                      <span className="font-mono text-xs text-muted-foreground">@{entry.handle}</span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <span className="text-xs text-muted-foreground">{entry.email}</span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          'inline-flex shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                          entry.role === 'founder'
                            ? 'bg-emerald-500/15 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200'
                            : 'bg-sky-500/15 text-sky-900 dark:bg-sky-500/20 dark:text-sky-100',
                        )}
                      >
                        {roleLabel(entry.role)}
                      </span>
                      <span className="text-xs text-muted-foreground">{formatClaimedAt(entry.claimedAt)}</span>
                    </div>
                    {entry.tagline ? (
                      <p className="mt-2 line-clamp-2 text-xs leading-snug text-muted-foreground">{entry.tagline}</p>
                    ) : null}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14"> </TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Handle</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Claimed</TableHead>
                <TableHead className="hidden lg:table-cell">Tagline</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedTableRows.map((entry) => (
                <TableRow
                  key={entry.id}
                  role="link"
                  tabIndex={0}
                  className="cursor-pointer hover:bg-muted/60 dark:hover:bg-zinc-800/50"
                  onClick={() => setLocation(`/founder/${encodeURIComponent(entry.handle)}`)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setLocation(`/founder/${encodeURIComponent(entry.handle)}`);
                    }
                  }}
                >
                  <TableCell className="w-14">
                    <img
                      src={founderAvatarUrl(entry.handle)}
                      alt=""
                      width={40}
                      height={40}
                      loading="lazy"
                      decoding="async"
                      className="h-10 w-10 rounded-full border border-border bg-muted object-cover"
                    />
                  </TableCell>
                  <TableCell className="font-semibold text-foreground dark:text-white">
                    <span className="text-sky-700 underline-offset-2 hover:underline dark:text-sky-400">
                      {entry.name}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-[8rem] truncate font-mono text-xs text-muted-foreground md:max-w-[10rem] lg:max-w-none">
                    @{entry.handle}
                  </TableCell>
                  <TableCell className="max-w-[8rem] truncate font-mono text-xs text-muted-foreground md:max-w-[10rem] lg:max-w-none">
                    {entry.email}
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        'inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                        entry.role === 'founder'
                          ? 'bg-emerald-500/15 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200'
                          : 'bg-sky-500/15 text-sky-900 dark:bg-sky-500/20 dark:text-sky-100',
                      )}
                    >
                      {roleLabel(entry.role)}
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {formatClaimedAt(entry.claimedAt)}
                  </TableCell>
                  <TableCell className="hidden max-w-[240px] truncate text-sm text-muted-foreground lg:table-cell">
                    {entry.tagline ?? '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="flex flex-col gap-3 border-t border-border px-3 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-[#2f3336]">
          <p className="min-w-0 break-words text-sm text-muted-foreground sm:pr-4">
            {tableRows.length === 0
              ? 'No rows'
              : `Showing ${tableRangeStart}–${tableRangeEnd} of ${tableRows.length} · Page ${tablePage} of ${tableTotalPages}`}
          </p>
          <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto sm:shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={tablePage <= 1}
              onClick={() => setTablePage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={tablePage >= tableTotalPages}
              onClick={() => setTablePage((p) => Math.min(tableTotalPages, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}