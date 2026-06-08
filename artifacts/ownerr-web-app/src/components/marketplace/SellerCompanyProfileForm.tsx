import { useEffect, useState } from "react";
import { Link } from "wouter";
import { MARKETPLACE_ROUTES } from "@/routing/routeRegistry";
import { useQueryClient } from "@tanstack/react-query";
import type { Category, MarketplaceListing } from "@/lib/marketplace/types";
import { PASTEL_COLORS } from "@/lib/mockData";
import { computeStartupScores } from "@/lib/startupScores";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { updateMarketplaceListing } from "@/lib/marketplace/updateListingApi";
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
import { invalidateSellerDeskQueries } from "@/lib/marketplace/invalidateSellerDeskQueries";
import { DeleteListingButton } from "@/components/marketplace/DeleteListingButton";
import { formatShortCurrency } from "@/lib/utils";
import type { ListingVerificationGates } from "@/lib/intelligence/listingVerificationApi";
import { verifiedRevenueAmountFromGates } from "@/lib/marketplace/verificationDesk";

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
  listing: MarketplaceListing;
  gates?: ListingVerificationGates | null;
};

export function SellerCompanyProfileForm({ listing, gates }: Props) {
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
    setName(listing.name);
    setFounderName(listing.founderDisplayName ?? "");
    setUsername(listing.listingUsername ?? "");
    setDescription(listing.description ?? "");
    setCategory(listing.category);
    setListForSale(Boolean(listing.forSale && listing.price));
    setAskingPriceRaw(listing.price ? String(listing.price) : "");
    setFoundedYearRaw(String(listing.foundedYear ?? new Date().getFullYear()));
  }, [listing]);

  async function submit() {
    const trimmed = name.trim();
    if (!trimmed) {
      toast({
        title: "Name required",
        description: "Enter a company name.",
        variant: "destructive",
      });
      return;
    }

    let price: number | undefined;
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
    }

    const foundedYear = Number(foundedYearRaw);
    const revenue = listing.revenue;
    const scoreInput = {
      slug: listing.slug,
      revenue,
      momGrowth: listing.momGrowth,
      forSale: listForSale,
      customers: listing.customers,
      multiple: listing.multiple,
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
        forSale: listForSale,
        price: listForSale ? price : undefined,
        founderDisplayName: founderName.trim() || listing.founderDisplayName,
        listingUsername: username.trim() || undefined,
        description: description.trim() || listing.description,
        monthlyRevenueSeries: listing.monthlyRevenueSeries?.length
          ? listing.monthlyRevenueSeries
          : [],
        logoColor: listing.logoColor ?? PASTEL_COLORS[0],
        foundedYear: Number.isFinite(foundedYear)
          ? foundedYear
          : listing.foundedYear,
        ...scores,
      };

      await updateMarketplaceListing(updated);
      toast({ title: "Profile saved", description: `${trimmed} was updated.` });
      invalidateSellerDeskQueries(queryClient);
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

  const verifiedRevenue = gates ? verifiedRevenueAmountFromGates(gates) : null;

  return (
    <div className="max-w-lg space-y-5">
      <p className="text-xs text-muted-foreground">
        Profile details are separate from verification. Verified revenue is set
        only after the revenue gate passes via provider sync
        {verifiedRevenue != null ? (
          <>
            {" "}
            — currently{" "}
            <span className="font-semibold text-foreground">
              {formatShortCurrency(verifiedRevenue)}
            </span>
          </>
        ) : (
          " — not verified yet"
        )}
        .{" "}
        <Link
          href={`${MARKETPLACE_ROUTES.sellerCompanyNew}?draft=${encodeURIComponent(listing.slug)}`}
          className="font-medium text-primary underline-offset-2 hover:underline"
        >
          Edit full seller intake
        </Link>
      </p>

      <div className="grid gap-2">
        <Label htmlFor="co-name">Company name</Label>
        <Input
          id="co-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="co-founder">Founder name</Label>
        <Input
          id="co-founder"
          value={founderName}
          onChange={(e) => setFounderName(e.target.value)}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="co-username">Username</Label>
        <Input
          id="co-username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
      </div>
      <div className="flex items-start gap-3 rounded-lg border p-3">
        <Checkbox
          id="co-sale"
          checked={listForSale}
          onCheckedChange={(v) => setListForSale(v === true)}
        />
        <div>
          <Label htmlFor="co-sale" className="cursor-pointer font-medium">
            For sale
          </Label>
          <p className="text-xs text-muted-foreground">
            Shown after publish when verified.
          </p>
        </div>
      </div>
      {listForSale ? (
        <div className="grid gap-2">
          <Label htmlFor="co-price">Asking price (USD)</Label>
          <Input
            id="co-price"
            value={askingPriceRaw}
            onChange={(e) => setAskingPriceRaw(e.target.value)}
            inputMode="decimal"
          />
        </div>
      ) : null}
      <div className="grid gap-2">
        <Label>Category</Label>
        <Select
          value={category}
          onValueChange={(v) => setCategory(v as Category)}
        >
          <SelectTrigger>
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
        <Label htmlFor="co-desc">Description</Label>
        <Input
          id="co-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="co-year">Founded year</Label>
        <Input
          id="co-year"
          value={foundedYearRaw}
          onChange={(e) => setFoundedYearRaw(e.target.value)}
          inputMode="numeric"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={() => void submit()} disabled={saving}>
          {saving ? "Saving…" : "Save profile"}
        </Button>
        <DeleteListingButton
          slug={listing.slug}
          listingName={listing.name}
          variant="destructive"
        />
      </div>
    </div>
  );
}
