import { useState } from 'react';
import type { Category, Startup } from '@/lib/mockData';
import { PASTEL_COLORS, generateMonthlyRevenue } from '@/lib/mockData';
import { computeStartupScores } from '@/lib/startupScores';
import { addUserStartupDB } from '@/lib/db';
import { buildMarketplaceListingFromStartup, upsertMarketplaceListing } from '@/lib/mockMarketplaceService';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { ExternalLink } from 'lucide-react';
import { useMockSession } from '@/context/MockSessionContext';

function slugify(name: string) {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `${base || 'startup'}-${Date.now().toString(36)}`;
}

const CATEGORIES: Category[] = [
  'SaaS',
  'Mobile Apps',
  'Developer Tools',
  'Marketing',
  'Artificial Intelligence',
  'Education',
  'Content Creation',
  'Health',
  'Crypto & Web3',
  'Customer Support',
  'Social Media',
];

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function AddStartupDialog({ open, onOpenChange }: Props) {
  const { toast } = useToast();
  const { currentUser, isFounder, isAuthenticated, openAuthDialog } = useMockSession();
  const [name, setName] = useState('');
  const [founderName, setFounderName] = useState('');
  const [username, setUsername] = useState('');
  const [mrrRaw, setMrrRaw] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<Category>('SaaS');
  const [stripeKey, setStripeKey] = useState('');
  const [listForSale, setListForSale] = useState(false);
  const [askingPriceRaw, setAskingPriceRaw] = useState('');
  const [revenueVerified, setRevenueVerified] = useState(false);
  const [revenueProvider, setRevenueProvider] = useState<'Stripe' | 'RevenueCat'>('Stripe');
  const [domainVerified, setDomainVerified] = useState(false);
  const [trafficVerified, setTrafficVerified] = useState(false);

  function reset() {
    setName('');
    setFounderName('');
    setUsername('');
    setMrrRaw('');
    setDescription('');
    setCategory('SaaS');
    setStripeKey('');
    setListForSale(false);
    setAskingPriceRaw('');
    setRevenueVerified(false);
    setRevenueProvider('Stripe');
    setDomainVerified(false);
    setTrafficVerified(false);
  }

  async function submit() {
    if (!isAuthenticated || !currentUser) {
      onOpenChange(false);
      openAuthDialog();
      return;
    }
    if (!isFounder) {
      toast({
        title: 'Founder mode required',
        description: 'Switch to a founder persona to create or manage a listing.',
        variant: 'destructive',
      });
      return;
    }
    const trimmed = name.trim();
    if (!trimmed) {
      toast({ title: 'Name required', description: 'Enter a startup name.', variant: 'destructive' });
      return;
    }
    const mrr = Number(mrrRaw.replace(/[^0-9.]/g, ''));
    if (!Number.isFinite(mrr) || mrr < 0) {
      toast({ title: 'Invalid MRR', description: 'Enter a valid monthly revenue number.', variant: 'destructive' });
      return;
    }

    let price: number | undefined;
    let multiple: number | undefined;
    if (listForSale) {
      const ap = Number(askingPriceRaw.replace(/[^0-9.]/g, ''));
      if (!Number.isFinite(ap) || ap <= 0) {
        toast({
          title: 'Asking price required',
          description: 'Enter an asking price when listing for sale.',
          variant: 'destructive',
        });
        return;
      }
      price = Math.round(ap);
      const arr = mrr * 12;
      multiple = arr > 0 ? Math.round((price / arr) * 10) / 10 : undefined;
    }

    const slug = slugify(trimmed);
    const founderHandle = currentUser.id;
    const peakMrr = Math.round(mrr * (1.08 + Math.random() * 0.12));

    const revenue = Math.round(mrr);
    const ttmProfit = listForSale ? Math.round(mrr * 6) : undefined;
    const scoreInput = {
      slug,
      revenue,
      momGrowth: 0,
      forSale: listForSale,
      customers: 0,
      multiple,
      ttmProfit,
      price,
    };
    const startup: Startup = {
      slug,
      name: trimmed,
      category,
      revenue,
      peakMrr,
      forSale: listForSale,
      price,
      multiple,
      founderHandle,
      founderDisplayName: founderName.trim() || currentUser.name,
      listingUsername: username.trim() || undefined,
      description: description.trim() || 'Added via ownerr.io',
      monthlyRevenueSeries: generateMonthlyRevenue(revenue),
      logoColor: PASTEL_COLORS[Math.floor(Math.random() * PASTEL_COLORS.length)],
      foundedYear: new Date().getFullYear(),
      customers: 0,
      momGrowth: 0,
      ttmProfit,
      revenueVerified,
      revenueProvider: revenueVerified ? revenueProvider : null,
      domainVerified,
      trafficVerified,
      trafficMonthlyVisitors: trafficVerified ? Math.max(200, Math.round(Math.random() * 5000)) : null,
      trafficTrend: trafficVerified ? (Math.random() > 0.3 ? 'up' : 'flat') : null,
      ...computeStartupScores(scoreInput),
    };

    await addUserStartupDB(startup);
    await upsertMarketplaceListing(
      buildMarketplaceListingFromStartup(startup, {
        ownerUserId: currentUser.id,
        createdAt: new Date().toISOString(),
      }),
    );
    if (stripeKey.trim()) {
      toast({
        title: 'Startup added',
        description: `${trimmed} is on the leaderboard. (Your Stripe key was not stored.)`,
      });
    } else {
      toast({ title: 'Startup added', description: `${trimmed} is on the leaderboard.` });
    }
    reset();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'flex max-h-[min(92dvh,calc(100dvh-1rem))] w-[calc(100vw-1.25rem)] max-w-lg flex-col gap-0 overflow-hidden p-0',
          'rounded-xl sm:w-full sm:max-w-lg',
          'pb-[max(0px,env(safe-area-inset-bottom,0px))]',
        )}
      >
        <DialogHeader className="shrink-0 space-y-2 px-4 pb-2 pt-5 pr-11 text-left sm:px-6 sm:pb-2 sm:pt-6 sm:pr-12">
          <DialogTitle className="text-base leading-snug sm:text-xl">Add your startup</DialogTitle>
          <DialogDescription className="text-pretty text-xs leading-relaxed text-foreground/90 sm:text-base sm:leading-snug">
            Showcase your verified revenue to{' '}
            <span className="font-bold text-foreground">120,000+ monthly visitors</span> and get a{' '}
            <span className="font-bold text-foreground">54+ DR dofollow backlink</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain px-4 sm:px-6">
          <div className="grid min-w-0 gap-5 pb-4 pr-0.5 sm:pr-1">
            {!isFounder ? (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-900 dark:text-amber-100">
                {!isAuthenticated
                  ? 'Login to create a mock founder listing.'
                  : 'Buyer accounts can browse and bid, but only founder accounts can create or edit listings in this mock.'}
              </div>
            ) : null}
            <div className="rounded-xl border border-border bg-muted/40 p-4 space-y-4">
              <div className="flex items-start gap-3">
                <div
                  className="h-10 w-10 rounded-lg bg-[#635BFF] flex items-center justify-center text-white text-xs font-black shrink-0 shadow-sm"
                  aria-hidden
                >
                  S
                </div>
                <div className="min-w-0 space-y-0.5">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0">
                    <span className="font-bold">Stripe</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#635BFF] bg-[#635BFF]/10 px-1.5 py-0.5 rounded">
                      Stripe
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Verify revenue with a read-only key. We never store your key in this browser build unless you
                    submit the form—use a restricted key in production.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="as-stripe-key" className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Restricted key
                </Label>
                <Input
                  id="as-stripe-key"
                  type="password"
                  autoComplete="off"
                  value={stripeKey}
                  onChange={(e) => setStripeKey(e.target.value)}
                  placeholder="rk_live_..."
                  className="min-h-11 font-mono text-sm sm:min-h-10"
                />
                <a
                  href="https://dashboard.stripe.com/apikeys/create"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#635BFF] hover:underline"
                >
                  Click here to create a read-only API key
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <ul className="text-xs text-muted-foreground space-y-1.5 list-disc pl-4">
                  <li>Scroll down and click &quot;Create key&quot;.</li>
                  <li>Don&apos;t change the permissions on the template.</li>
                  <li>Don&apos;t delete the key or we can&apos;t refresh revenue.</li>
                </ul>
              </div>
            </div>

            <div className="grid min-w-0 gap-2">
              <Label htmlFor="as-username">Username</Label>
              <Input
                id="as-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="your_handle"
                autoComplete="username"
                className="min-h-11 sm:min-h-10"
              />
            </div>

            <div className="grid min-w-0 gap-2">
              <Label htmlFor="as-name">Startup name</Label>
              <Input
                id="as-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Acme Analytics"
                autoComplete="organization"
                className="min-h-11 sm:min-h-10"
              />
            </div>
            <div className="grid min-w-0 gap-2">
              <Label htmlFor="as-founder">Founder name</Label>
              <Input
                id="as-founder"
                value={founderName}
                onChange={(e) => setFounderName(e.target.value)}
                placeholder="Jane Doe"
                autoComplete="name"
                className="min-h-11 sm:min-h-10"
              />
            </div>
            <div className="grid min-w-0 gap-2">
              <Label htmlFor="as-mrr">MRR (USD)</Label>
              <Input
                id="as-mrr"
                value={mrrRaw}
                onChange={(e) => setMrrRaw(e.target.value)}
                placeholder="12000"
                inputMode="decimal"
                className="min-h-11 sm:min-h-10"
              />
            </div>

            <div className="flex items-start gap-3 rounded-lg border border-border p-3 bg-card">
              <Checkbox
                id="as-sale"
                checked={listForSale}
                onCheckedChange={(v) => setListForSale(v === true)}
              />
              <div className="grid gap-1.5 leading-none">
                <Label htmlFor="as-sale" className="font-bold cursor-pointer">
                  List for sale
                </Label>
                <p className="text-xs text-muted-foreground">
                  Show the FOR SALE badge and asking price on your listing.
                </p>
              </div>
            </div>

            {listForSale && (
              <div className="grid min-w-0 gap-2">
                <Label htmlFor="as-price">Asking price (USD)</Label>
                <Input
                  id="as-price"
                  value={askingPriceRaw}
                  onChange={(e) => setAskingPriceRaw(e.target.value)}
                  placeholder="250000"
                  inputMode="decimal"
                  className="min-h-11 sm:min-h-10"
                />
              </div>
            )}

            <div className="rounded-xl border border-border bg-muted/40 p-4 space-y-3">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Verification</p>
              <div className="flex items-start gap-3">
                <Checkbox
                  id="as-rev-verified"
                  checked={revenueVerified}
                  onCheckedChange={(v) => setRevenueVerified(v === true)}
                />
                <div className="grid gap-1 leading-none">
                  <Label htmlFor="as-rev-verified" className="font-bold cursor-pointer">
                    Verify revenue
                  </Label>
                  <p className="text-xs text-muted-foreground">Shows a verified revenue badge on your listing.</p>
                </div>
              </div>
              {revenueVerified && (
                <div className="grid min-w-0 gap-2 pl-7">
                  <Label>Provider</Label>
                  <Select value={revenueProvider} onValueChange={(v) => setRevenueProvider(v as 'Stripe' | 'RevenueCat')}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Stripe">Stripe</SelectItem>
                      <SelectItem value="RevenueCat">RevenueCat</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="flex items-start gap-3">
                <Checkbox
                  id="as-domain-verified"
                  checked={domainVerified}
                  onCheckedChange={(v) => setDomainVerified(v === true)}
                />
                <div className="grid gap-1 leading-none">
                  <Label htmlFor="as-domain-verified" className="font-bold cursor-pointer">
                    Verify domain
                  </Label>
                  <p className="text-xs text-muted-foreground">Shows a verified domain badge.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Checkbox
                  id="as-traffic-verified"
                  checked={trafficVerified}
                  onCheckedChange={(v) => setTrafficVerified(v === true)}
                />
                <div className="grid gap-1 leading-none">
                  <Label htmlFor="as-traffic-verified" className="font-bold cursor-pointer">
                    Verify traffic
                  </Label>
                  <p className="text-xs text-muted-foreground">Shows a verified traffic badge with mock visitor data.</p>
                </div>
              </div>
            </div>

            <div className="grid min-w-0 gap-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as Category)}>
                <SelectTrigger className="h-11 min-h-11 sm:h-9 sm:min-h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent sideOffset={6}>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid min-w-0 gap-2">
              <Label htmlFor="as-desc">Description (optional)</Label>
              <Input
                id="as-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="One-liner about the product"
                className="min-h-11 sm:min-h-10"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="mt-0 flex w-full shrink-0 flex-row flex-wrap justify-end gap-2 border-t border-border bg-muted/20 px-4 py-4 sm:px-6 sm:py-4 sm:justify-end">
          <Button type="button" variant="outline" className="min-h-10 shrink-0" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={submit} className="min-h-10 shrink-0 font-bold">
            Add startup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}