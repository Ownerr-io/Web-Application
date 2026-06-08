import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Category, MarketplaceListing } from "@/lib/marketplace/types";
import { PASTEL_COLORS } from "@/lib/mockData";
import { computeStartupScores } from "@/lib/startupScores";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { updateMarketplaceListing } from "@/lib/marketplace/updateListingApi";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Link } from "wouter";
import { MARKETPLACE_ROUTES } from "@/routing/routeRegistry";
import { invalidateSellerDeskQueries } from "@/lib/marketplace/invalidateSellerDeskQueries";
import { DeleteListingButton } from "@/components/marketplace/DeleteListingButton";

const CATEGORIES: Category[] = [
  "SaaS",
  "Mobile Apps",
  "Developer Tools",
  "Marketing",
  "Artificial Intelligence",
  "Education",
  "Content Creation",
  "Health",
  "Crypto & Web3",
  "Customer Support",
  "Social Media",
];

type Props = {
  listing: MarketplaceListing | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function invalidateSellerListings(qc: ReturnType<typeof useQueryClient>) {
  invalidateSellerDeskQueries(qc);
}

export function EditListingDialog({ listing, open, onOpenChange }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [founderName, setFounderName] = useState("");
  const [username, setUsername] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<Category>("SaaS");
  const [listForSale, setListForSale] = useState(false);
  const [askingPriceRaw, setAskingPriceRaw] = useState("");
  const [foundedYearRaw, setFoundedYearRaw] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !listing) return;
    setName(listing.name);
    setFounderName(listing.founderDisplayName ?? "");
    setUsername(listing.listingUsername ?? "");
    setDescription(listing.description ?? "");
    setCategory(listing.category);
    setListForSale(Boolean(listing.forSale && listing.price));
    setAskingPriceRaw(listing.price ? String(listing.price) : "");
    setFoundedYearRaw(String(listing.foundedYear ?? new Date().getFullYear()));
  }, [open, listing]);

  async function submit() {
    if (!listing) return;
    const trimmed = name.trim();
    if (!trimmed) {
      toast({
        title: "Name required",
        description: "Enter a company name.",
        variant: "destructive",
      });
      return;
    }
    const mrr = listing.revenue;
    if (!Number.isFinite(mrr) || mrr < 0) {
      toast({
        title: "Invalid revenue on listing",
        description:
          "Verified MRR comes from connected providers in your company workspace.",
        variant: "destructive",
      });
      return;
    }

    let price: number | undefined;
    let multiple: number | undefined;
    if (listForSale) {
      const ap = Number(askingPriceRaw.replace(/[^0-9.]/g, ""));
      if (!Number.isFinite(ap) || ap <= 0) {
        toast({
          title: "Asking price required",
          description: "Enter an asking price when listing for sale.",
          variant: "destructive",
        });
        return;
      }
      price = Math.round(ap);
      const arr = mrr * 12;
      multiple = arr > 0 ? Math.round((price / arr) * 10) / 10 : undefined;
    }

    const foundedYear = Number(foundedYearRaw);
    const revenue = Math.round(mrr);
    const peakMrr = Math.max(listing.peakMrr ?? revenue, revenue);
    const scoreInput = {
      slug: listing.slug,
      revenue,
      momGrowth: listing.momGrowth,
      forSale: listForSale,
      customers: listing.customers,
      multiple,
      ttmProfit: listing.ttmProfit,
      price,
    };
    const scores = computeStartupScores(scoreInput);

    if (!isSupabaseConfigured()) {
      toast({
        title: "Supabase required",
        description: "Configure Supabase to save changes.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const updated: MarketplaceListing = {
        ...listing,
        name: trimmed,
        category,
        revenue,
        peakMrr,
        forSale: listForSale,
        price: listForSale ? price : undefined,
        multiple: listForSale ? multiple : undefined,
        founderDisplayName: founderName.trim() || listing.founderDisplayName,
        listingUsername: username.trim() || undefined,
        description: description.trim() || listing.description,
        monthlyRevenueSeries:
          listing.monthlyRevenueSeries?.length && revenue === listing.revenue
            ? listing.monthlyRevenueSeries
            : [],
        logoColor: listing.logoColor ?? PASTEL_COLORS[0],
        foundedYear: Number.isFinite(foundedYear)
          ? foundedYear
          : listing.foundedYear,
        ...scores,
        businessScore: listing.businessScore ?? scores.businessScore,
        lendScore: listing.lendScore ?? scores.lendScore,
        acquisitionPower: listing.acquisitionPower ?? scores.acquisitionPower,
      };

      await updateMarketplaceListing(updated);
      toast({
        title: "Listing updated",
        description: `${trimmed} was saved.`,
      });
      invalidateSellerListings(queryClient);
      onOpenChange(false);
    } catch (e) {
      toast({
        title: "Could not save",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "flex max-h-[min(92dvh,calc(100dvh-1rem))] w-[calc(100vw-1.25rem)] max-w-lg flex-col gap-0 overflow-hidden p-0",
          "rounded-xl sm:w-full sm:max-w-lg",
        )}
      >
        <DialogHeader className="shrink-0 space-y-2 px-4 pb-2 pt-5 text-left sm:px-6 sm:pt-6">
          <DialogTitle className="text-base sm:text-xl">
            Edit listing
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Update your company profile. Revenue verification and integrations
            are managed in{" "}
            <Link
              href={
                listing
                  ? MARKETPLACE_ROUTES.sellerVerificationDetail(listing.slug)
                  : MARKETPLACE_ROUTES.sellerCompanies
              }
              className="font-semibold text-foreground underline"
            >
              company workspace
            </Link>
            .
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 sm:px-6">
          <div className="grid gap-4 pb-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-slug">Listing URL</Label>
              <Input
                id="edit-slug"
                value={listing ? `/startup/${listing.slug}` : ""}
                readOnly
                disabled
                className="font-mono text-sm"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Company name</Label>
              <Input
                id="edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="min-h-11 sm:min-h-10"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-founder">Founder name</Label>
              <Input
                id="edit-founder"
                value={founderName}
                onChange={(e) => setFounderName(e.target.value)}
                className="min-h-11 sm:min-h-10"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-username">Username</Label>
              <Input
                id="edit-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="min-h-11 sm:min-h-10"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-category">Category</Label>
              <Select
                value={category}
                onValueChange={(v) => setCategory(v as Category)}
              >
                <SelectTrigger id="edit-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Verified MRR</Label>
              <p className="text-sm text-muted-foreground">
                {listing
                  ? `$${listing.revenue.toLocaleString()} display · connect Stripe or another provider in verification to update verified revenue.`
                  : "—"}
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-founded">Founded year</Label>
              <Input
                id="edit-founded"
                value={foundedYearRaw}
                onChange={(e) => setFoundedYearRaw(e.target.value)}
                inputMode="numeric"
                className="min-h-11 sm:min-h-10"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description">Description</Label>
              <textarea
                id="edit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="flex items-start gap-3 rounded-lg border border-border p-3">
              <Checkbox
                id="edit-sale"
                checked={listForSale}
                onCheckedChange={(v) => setListForSale(v === true)}
              />
              <div className="grid gap-1">
                <Label htmlFor="edit-sale" className="cursor-pointer font-bold">
                  List for sale
                </Label>
                <p className="text-xs text-muted-foreground">
                  Show asking price on the marketplace listing.
                </p>
              </div>
            </div>
            {listForSale ? (
              <div className="grid gap-2">
                <Label htmlFor="edit-price">Asking price (USD)</Label>
                <Input
                  id="edit-price"
                  value={askingPriceRaw}
                  onChange={(e) => setAskingPriceRaw(e.target.value)}
                  inputMode="decimal"
                  className="min-h-11 sm:min-h-10"
                />
              </div>
            ) : null}
          </div>

          {listing ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/[0.04] p-4 space-y-2">
              <p className="text-sm font-semibold text-destructive">
                Danger zone
              </p>
              <p className="text-xs text-muted-foreground">
                Permanently remove this company from your desk and the
                marketplace.
              </p>
              <DeleteListingButton
                slug={listing.slug}
                listingName={listing.name}
                variant="destructive"
                size="sm"
                onDeleted={() => onOpenChange(false)}
              />
            </div>
          ) : null}
        </div>

        <DialogFooter className="shrink-0 gap-2 border-t border-border px-4 py-4 sm:px-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void submit()}
            disabled={saving || !listing}
          >
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
