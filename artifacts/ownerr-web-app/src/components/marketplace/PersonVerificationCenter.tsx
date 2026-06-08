import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Link } from "wouter";
import { BadgeCheck, Loader2 } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import { VerificationBadge } from "@/components/marketplace/VerificationBadge";
import {
  fetchPersonVerificationProfile,
  savePersonVerificationProfile,
  submitPersonVerificationProfile,
} from "@/lib/marketplace/personVerificationApi";
import { MARKETPLACE_ROUTES } from "@/routing/routeRegistry";
import { cn } from "@/lib/utils";

const COUNTRIES: { code: string; name: string }[] = [
  { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" },
  { code: "CA", name: "Canada" },
  { code: "AU", name: "Australia" },
  { code: "IN", name: "India" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "NL", name: "Netherlands" },
  { code: "SG", name: "Singapore" },
  { code: "AE", name: "United Arab Emirates" },
];

type Props = {
  deskRole: "buyer" | "seller";
};

export function PersonVerificationCenter({ deskRole }: Props) {
  const isBuyer = deskRole === "buyer";
  const { toast } = useToast();
  const qc = useQueryClient();
  const queryKey = ["person-verification", deskRole];

  const profileQuery = useQuery({
    queryKey,
    queryFn: () => fetchPersonVerificationProfile(deskRole),
  });

  const profile = profileQuery.data;
  const [fullName, setFullName] = useState("");
  const [country, setCountry] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [twitter, setTwitter] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.full_name ?? "");
    setCountry(profile.country_code ?? "");
    setLinkedin(profile.linkedin_url ?? "");
    setTwitter(profile.twitter_url ?? "");
    setEmail(profile.email ?? "");
    // Sync form when profile row changes, not on every refetch object identity
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
  }, [profile?.id]);

  const profilePayload = () => ({
    full_name: fullName.trim(),
    country_code: country,
    linkedin_url: linkedin.trim(),
    twitter_url: twitter.trim() || undefined,
    email: email.trim() || undefined,
  });

  const saveMut = useMutation({
    mutationFn: () => savePersonVerificationProfile(deskRole, profilePayload()),
    onSuccess: () => void qc.invalidateQueries({ queryKey }),
    onError: (e: Error) =>
      toast({
        title: "Could not save",
        description: e.message,
        variant: "destructive",
      }),
  });

  const submitMut = useMutation({
    mutationFn: async () => {
      await savePersonVerificationProfile(deskRole, profilePayload());
      return submitPersonVerificationProfile(deskRole);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey });
      toast({
        title: isBuyer ? "Verified Buyer" : "Verified Founder",
        description: isBuyer
          ? "Your buyer profile is verified."
          : "Your founder profile is verified. Company gates are in Companies.",
      });
    },
    onError: (e: Error) =>
      toast({
        title: "Verification",
        description: e.message,
        variant: "destructive",
      }),
  });

  const verified = profile?.verification_status === "verified";
  const badgeVariant = isBuyer ? "buyer" : "founder";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Person verification</h2>
          <p className="text-sm text-muted-foreground">
            {isBuyer
              ? "Confirm your name, country, and LinkedIn to get a Verified Buyer badge."
              : "One-time founder profile for listing gates. Domain, email, and revenue are per company under Companies."}
          </p>
        </div>
        {verified ? <VerificationBadge variant={badgeVariant} /> : null}
      </div>

      {profile?.verification_status === "rejected" &&
      profile.rejection_reason ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {profile.rejection_reason}
        </p>
      ) : null}

      <section className="rounded-xl border border-border bg-card p-4 sm:p-6 space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
          Profile
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="pv-name">Full name *</Label>
            <Input
              id="pv-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={verified}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pv-country">Country *</Label>
            <Select
              value={country}
              onValueChange={setCountry}
              disabled={verified}
            >
              <SelectTrigger id="pv-country">
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
              <SelectContent>
                {COUNTRIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="pv-email">Email</Label>
            <Input
              id="pv-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={verified}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="pv-linkedin">LinkedIn URL *</Label>
            <Input
              id="pv-linkedin"
              value={linkedin}
              onChange={(e) => setLinkedin(e.target.value)}
              placeholder="https://linkedin.com/in/…"
              disabled={verified}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="pv-x">X (Twitter) URL</Label>
            <Input
              id="pv-x"
              value={twitter}
              onChange={(e) => setTwitter(e.target.value)}
              placeholder="https://x.com/…"
              disabled={verified}
            />
          </div>
        </div>
        {!verified ? (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={saveMut.isPending || submitMut.isPending}
              onClick={() => saveMut.mutate()}
            >
              {saveMut.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              Save profile
            </Button>
            <Button
              type="button"
              className="btn-marketplace-primary font-bold"
              disabled={submitMut.isPending || profileQuery.isLoading}
              onClick={() => submitMut.mutate()}
            >
              {submitMut.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <BadgeCheck className="h-4 w-4" />
              )}
              Complete verification
            </Button>
          </div>
        ) : null}
      </section>

      {!isBuyer ? (
        <p className="text-sm text-muted-foreground">
          Listing gates (domain, business email, revenue) are per company in{" "}
          <Link
            href={MARKETPLACE_ROUTES.sellerCompanies}
            className="font-bold underline"
          >
            Companies
          </Link>
          .
        </p>
      ) : null}

      <LevelMeter
        level={profile?.verification_level ?? 0}
        verified={verified}
      />
    </div>
  );
}

function LevelMeter({ level, verified }: { level: number; verified: boolean }) {
  const steps = [
    { n: 0, label: "Email on file" },
    { n: 1, label: "Profile + LinkedIn verified" },
  ];
  const effective = verified ? Math.max(level, 1) : level;
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {steps.map((s) => (
        <li
          key={s.n}
          className={cn(
            "rounded-lg border px-3 py-2 text-xs",
            effective >= s.n
              ? "border-emerald-500/30 bg-emerald-500/5"
              : "border-border text-muted-foreground",
          )}
        >
          <span className="font-bold">Level {s.n}</span> — {s.label}
        </li>
      ))}
    </ul>
  );
}
