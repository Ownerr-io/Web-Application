import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import { Link2, ShieldCheck } from "lucide-react";
import type { Category } from "@/lib/marketplace/types";
import {
  DOMAIN_DNS_PROVIDERS,
  type DomainDnsProviderId,
} from "@/lib/marketplace/domainDnsProviders";
import {
  emptySellerIntake,
  SELLER_FOUNDER_ROLES,
  SELLER_INTAKE_CURRENCIES,
  SELLER_REASONS_FOR_SELLING,
  SELLER_REVENUE_MODELS,
  SELLER_TRAFFIC_SOURCES,
  type BusinessProofType,
  type SellerIntakePayload,
} from "@/lib/marketplace/sellerIntakeTypes";
import {
  fetchSellerIntakeBySlug,
  saveSellerIntake,
  uploadBusinessProofs,
} from "@/lib/marketplace/sellerIntakeApi";
import { invalidateSellerDeskQueries } from "@/lib/marketplace/invalidateSellerDeskQueries";
import { MARKETPLACE_ROUTES } from "@/routing/routeRegistry";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

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

function FieldHint({ children }: { children: string }) {
  return (
    <p className="text-[11px] leading-snug text-muted-foreground">{children}</p>
  );
}

function Section({
  title,
  step,
  children,
}: {
  title: string;
  step: number;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-4 sm:p-6 space-y-4">
      <div className="flex items-center gap-3 border-b border-border/60 pb-3">
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold tabular-nums text-primary"
          aria-hidden
        >
          {step}
        </span>
        <h2 className="text-base font-bold tracking-tight text-foreground">
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

const PROOF_LABELS: Record<BusinessProofType, string> = {
  analytics: "Analytics (JPG, PNG, PDF)",
  revenue: "Revenue proof (PDF, JPG, CSV)",
  accounting: "Accounting proof (PDF, CSV)",
  bank: "Bank statement (PDF, JPG)",
  other: "Other (PDF, JPG, ZIP)",
};

type Props = {
  className?: string;
};

export function SellerAddStartupWizard({ className }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { currentUser, isFounder, isAuthenticated } = useAuth();

  const draftSlug = useMemo(() => {
    const q = new URLSearchParams(
      search.startsWith("?") ? search.slice(1) : search,
    );
    return q.get("draft")?.trim() || "";
  }, [search]);

  const [intake, setIntake] = useState<SellerIntakePayload>(() =>
    emptySellerIntake(),
  );
  const [draftStartupId, setDraftStartupId] = useState<string | null>(null);
  const [proofs, setProofs] = useState<
    Partial<Record<BusinessProofType, File | null>>
  >({});
  const [loadingDraft, setLoadingDraft] = useState(Boolean(draftSlug));
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);

  useEffect(() => {
    if (!draftSlug) return;
    let cancelled = false;
    (async () => {
      try {
        const row = await fetchSellerIntakeBySlug(draftSlug);
        if (cancelled || !row) return;
        const { startupId, slug, ...rest } = row;
        setIntake({ ...rest, slug });
        setDraftStartupId(startupId);
      } catch (e) {
        if (!cancelled) {
          toast({
            title: "Could not load draft",
            description: e instanceof Error ? e.message : String(e),
            variant: "destructive",
          });
        }
      } finally {
        if (!cancelled) setLoadingDraft(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [draftSlug, toast]);

  useEffect(() => {
    if (currentUser?.email && !intake.founder_email) {
      setIntake((prev) => ({
        ...prev,
        founder_email: currentUser.email ?? "",
      }));
    }
  }, [currentUser?.email, intake.founder_email]);

  function patch(partial: Partial<SellerIntakePayload>) {
    setIntake((prev) => ({ ...prev, ...partial }));
  }

  async function saveDraft() {
    if (!intake.company_name.trim()) {
      toast({
        title: "Company name required",
        description: "Enter a company name to save a draft.",
        variant: "destructive",
      });
      return;
    }
    setSavingDraft(true);
    try {
      const result = await saveSellerIntake(
        { ...intake, slug: intake.slug ?? (draftSlug || undefined) },
        false,
      );
      setDraftStartupId(result.startupId);
      patch({ slug: result.slug });
      invalidateSellerDeskQueries(queryClient);
      toast({
        title: "Draft saved",
        description: "You can return anytime from Companies.",
      });
    } catch (e) {
      toast({
        title: "Could not save draft",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setSavingDraft(false);
    }
  }

  async function submitForValidation(e: React.FormEvent) {
    e.preventDefault();
    if (!isAuthenticated || !isFounder) {
      toast({
        title: "Founder desk required",
        description: "Sign in as a founder to list a company.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const payload: SellerIntakePayload = {
        ...intake,
        slug: intake.slug ?? (draftSlug || undefined),
      };
      const draft = await saveSellerIntake(payload, false);
      await uploadBusinessProofs(draft.startupId, proofs);
      const finalized = await saveSellerIntake(
        { ...payload, slug: draft.slug },
        true,
      );

      invalidateSellerDeskQueries(queryClient);
      toast({
        title: "Submitted for validation",
        description:
          "Self-reported details are saved. Complete the three verification checks next.",
      });
      setLocation(MARKETPLACE_ROUTES.sellerVerificationDetail(finalized.slug));
    } catch (err) {
      toast({
        title: "Could not submit",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingDraft) {
    return (
      <div className={cn("text-sm text-muted-foreground", className)}>
        Loading draft…
      </div>
    );
  }

  return (
    <form
      className={cn("flex w-full min-w-0 flex-col gap-6", className)}
      onSubmit={(ev) => void submitForValidation(ev)}
    >
      <div className="flex gap-3 rounded-xl border border-border bg-muted/30 p-4 text-sm leading-relaxed">
        <ShieldCheck
          className="mt-0.5 h-4 w-4 shrink-0 text-primary"
          aria-hidden
        />
        <p className="text-muted-foreground">
          <span className="font-medium text-foreground">
            Self-reported fields
          </span>{" "}
          save to your company profile. Domain, identity, and revenue are
          checked on the verification tab after submit.
        </p>
      </div>

      <Section title="Founder information" step={1}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="founder_name">Founder name</Label>
            <Input
              id="founder_name"
              value={intake.founder_name}
              onChange={(e) => patch({ founder_name: e.target.value })}
              placeholder="Jane Doe"
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="founder_email">Email</Label>
            <Input
              id="founder_email"
              type="email"
              value={intake.founder_email}
              onChange={(e) => patch({ founder_email: e.target.value })}
              placeholder="jane@example.com"
              required
            />
            <FieldHint>
              Used for listing notifications and verification.
            </FieldHint>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="founder_linkedin">LinkedIn (optional)</Label>
            <Input
              id="founder_linkedin"
              value={intake.founder_linkedin ?? ""}
              onChange={(e) => patch({ founder_linkedin: e.target.value })}
              placeholder="https://linkedin.com/in/username"
            />
          </div>
          <div className="grid gap-2">
            <Label>Role</Label>
            <Select
              value={intake.founder_role ?? ""}
              onValueChange={(v) => patch({ founder_role: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {SELLER_FOUNDER_ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Section>

      <Section title="Traffic & users" step={2}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="monthly_visitors">
              Monthly visitors (self-reported)
            </Label>
            <Input
              id="monthly_visitors"
              inputMode="numeric"
              value={intake.monthly_visitors ?? ""}
              onChange={(e) => patch({ monthly_visitors: e.target.value })}
              placeholder="25000"
            />
          </div>
          <div className="grid gap-2">
            <Label>Traffic source</Label>
            <Select
              value={intake.traffic_source ?? ""}
              onValueChange={(v) => patch({ traffic_source: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select source" />
              </SelectTrigger>
              <SelectContent>
                {SELLER_TRAFFIC_SOURCES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="analytics_platform">Analytics platform</Label>
            <Input
              id="analytics_platform"
              value={intake.analytics_platform ?? ""}
              onChange={(e) => patch({ analytics_platform: e.target.value })}
              placeholder="Google Analytics, Plausible, …"
            />
          </div>
        </div>
      </Section>

      <Section title="Domain & DNS (declaration)" step={3}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="declared_domain">Domain name</Label>
            <Input
              id="declared_domain"
              value={intake.declared_domain}
              onChange={(e) => patch({ declared_domain: e.target.value })}
              placeholder="yourstartup.com"
              required
            />
            <FieldHint>Verified with a DNS TXT record after submit.</FieldHint>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="domain_registrar">Domain registrar</Label>
            <Input
              id="domain_registrar"
              value={intake.domain_registrar ?? ""}
              onChange={(e) => patch({ domain_registrar: e.target.value })}
              placeholder="GoDaddy, Cloudflare, …"
            />
          </div>
          <div className="grid gap-2">
            <Label>DNS provider</Label>
            <Select
              value={intake.dns_provider ?? ""}
              onValueChange={(v) =>
                patch({ dns_provider: v as DomainDnsProviderId })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent>
                {DOMAIN_DNS_PROVIDERS.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ns1">Nameserver 1 (optional)</Label>
            <Input
              id="ns1"
              value={intake.nameserver_1 ?? ""}
              onChange={(e) => patch({ nameserver_1: e.target.value })}
              placeholder="ns1.example.com"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ns2">Nameserver 2 (optional)</Label>
            <Input
              id="ns2"
              value={intake.nameserver_2 ?? ""}
              onChange={(e) => patch({ nameserver_2: e.target.value })}
              placeholder="ns2.example.com"
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground flex items-start gap-1.5">
          <Link2 className="h-3.5 w-3.5 shrink-0 mt-0.5" aria-hidden />
          After submit, add the TXT record on the verification tab. DNS must
          pass before publish.
        </p>
        <div className="flex items-start gap-3 rounded-lg border border-dashed p-3">
          <Checkbox
            id="dns_ack"
            checked={Boolean(intake.dns_record_acknowledged)}
            onCheckedChange={(v) =>
              patch({ dns_record_acknowledged: v === true })
            }
          />
          <Label
            htmlFor="dns_ack"
            className="text-sm font-normal leading-snug cursor-pointer"
          >
            I understand I will add the Ownerr TXT record at my DNS provider
            before going live.
          </Label>
        </div>
      </Section>

      <Section title="Open source / product API (optional)" step={4}>
        <div className="flex items-center gap-3">
          <Checkbox
            id="api_available"
            checked={Boolean(intake.api_available)}
            onCheckedChange={(v) => patch({ api_available: v === true })}
          />
          <Label htmlFor="api_available" className="cursor-pointer">
            API available
          </Label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="api_docs">API documentation URL</Label>
            <Input
              id="api_docs"
              value={intake.api_documentation_url ?? ""}
              onChange={(e) => patch({ api_documentation_url: e.target.value })}
              placeholder="https://docs.yourstartup.com"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="api_base">API base URL</Label>
            <Input
              id="api_base"
              value={intake.api_base_url ?? ""}
              onChange={(e) => patch({ api_base_url: e.target.value })}
              placeholder="https://api.yourstartup.com"
            />
          </div>
          <div className="grid gap-2">
            <Label>Access type</Label>
            <Select
              value={intake.api_access_type ?? ""}
              onValueChange={(v) =>
                patch({
                  api_access_type: v as SellerIntakePayload["api_access_type"],
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Public / private / limited" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">Public</SelectItem>
                <SelectItem value="private">Private</SelectItem>
                <SelectItem value="limited">Limited</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Section>

      <Section title="Accounting (optional)" step={5}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="accounting_software">Accounting software</Label>
            <Input
              id="accounting_software"
              value={intake.accounting_software ?? ""}
              onChange={(e) => patch({ accounting_software: e.target.value })}
              placeholder="Zoho Books, QuickBooks, …"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="tax_id">Tax ID / GST (optional)</Label>
            <Input
              id="tax_id"
              value={intake.tax_id ?? ""}
              onChange={(e) => patch({ tax_id: e.target.value })}
              placeholder="Stored securely; not shown to buyers"
            />
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="accounting_api">Accounting API URL</Label>
            <Input
              id="accounting_api"
              value={intake.accounting_api_url ?? ""}
              onChange={(e) => patch({ accounting_api_url: e.target.value })}
              placeholder="https://api.yourstartup.com/accounting"
            />
          </div>
        </div>
      </Section>

      <Section title="Category" step={6}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label>Category</Label>
            <Select
              value={intake.industry as Category}
              onValueChange={(v) => patch({ industry: v as Category })}
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
            <Label htmlFor="sub_category">Sub category</Label>
            <Input
              id="sub_category"
              value={intake.sub_category ?? ""}
              onChange={(e) => patch({ sub_category: e.target.value })}
              placeholder="B2B analytics, …"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="business_model">Business model</Label>
            <Input
              id="business_model"
              value={intake.business_model ?? ""}
              onChange={(e) => patch({ business_model: e.target.value })}
              placeholder="SaaS, marketplace, eCommerce"
            />
          </div>
          <div className="grid gap-2">
            <Label>Currency</Label>
            <Select
              value={intake.currency}
              onValueChange={(v) => patch({ currency: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SELLER_INTAKE_CURRENCIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Section>

      <Section title="Startup pitch" step={7}>
        <div className="grid gap-2">
          <Label htmlFor="company_name">Company / startup name</Label>
          <Input
            id="company_name"
            value={intake.company_name}
            onChange={(e) => patch({ company_name: e.target.value })}
            placeholder="Acme Analytics"
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="one_line_pitch">One-line pitch</Label>
          <Input
            id="one_line_pitch"
            value={intake.one_line_pitch}
            onChange={(e) => patch({ one_line_pitch: e.target.value })}
            placeholder="Short, exciting pitch"
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="description">Detailed description</Label>
          <Textarea
            id="description"
            rows={5}
            value={intake.description}
            onChange={(e) => patch({ description: e.target.value })}
            placeholder="Product, traction, customers, growth, reason for selling"
            required
          />
        </div>
      </Section>

      <Section title="Business proof (optional uploads)" step={8}>
        <p className="text-xs text-muted-foreground">
          Files support trust review only — not required to publish and not
          processed with doc OCR.
        </p>
        <div className="grid gap-3">
          {(Object.keys(PROOF_LABELS) as BusinessProofType[]).map((type) => (
            <div key={type} className="grid gap-1.5">
              <Label htmlFor={`proof-${type}`}>{PROOF_LABELS[type]}</Label>
              <Input
                id={`proof-${type}`}
                type="file"
                accept=".jpg,.jpeg,.png,.pdf,.csv,.xlsx,.xls"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  setProofs((prev) => ({ ...prev, [type]: file }));
                }}
              />
            </div>
          ))}
        </div>
        {draftStartupId ? (
          <p className="text-xs text-muted-foreground">
            Draft id: {draftStartupId.slice(0, 8)}…
          </p>
        ) : null}
      </Section>

      <Section title="Revenue (self-reported)" step={9}>
        <p className="text-xs text-muted-foreground">
          Verified MRR comes from Stripe (or connected providers) on the
          verification tab — not from these fields.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="mrr">Monthly revenue (USD)</Label>
            <Input
              id="mrr"
              inputMode="decimal"
              value={intake.reported_monthly_revenue_usd ?? ""}
              onChange={(e) =>
                patch({ reported_monthly_revenue_usd: e.target.value })
              }
              placeholder="15000"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="profit">Monthly profit (USD)</Label>
            <Input
              id="profit"
              inputMode="decimal"
              value={intake.reported_monthly_profit_usd ?? ""}
              onChange={(e) =>
                patch({ reported_monthly_profit_usd: e.target.value })
              }
              placeholder="1500"
            />
          </div>
          <div className="grid gap-2">
            <Label>Revenue model</Label>
            <Select
              value={intake.revenue_model ?? ""}
              onValueChange={(v) => patch({ revenue_model: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent>
                {SELLER_REVENUE_MODELS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="revenue_source">Revenue source</Label>
            <Input
              id="revenue_source"
              value={intake.revenue_source ?? ""}
              onChange={(e) => patch({ revenue_source: e.target.value })}
              placeholder="Stripe, Razorpay, PayPal"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="gross_margin">Gross margin (%)</Label>
            <Input
              id="gross_margin"
              inputMode="decimal"
              value={intake.gross_margin_pct ?? ""}
              onChange={(e) => patch({ gross_margin_pct: e.target.value })}
              placeholder="45"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="revenue_since">Revenue since</Label>
            <Input
              id="revenue_since"
              type="date"
              value={intake.revenue_since ?? ""}
              onChange={(e) => patch({ revenue_since: e.target.value })}
            />
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="revenue_api">Revenue API URL (optional)</Label>
            <Input
              id="revenue_api"
              value={intake.revenue_api_url ?? ""}
              onChange={(e) => patch({ revenue_api_url: e.target.value })}
              placeholder="https://api.yourstartup.com/revenue"
            />
            <FieldHint>
              For automated revenue sync when your API is ready.
            </FieldHint>
          </div>
        </div>
      </Section>

      <Section title="Tech stack" step={10}>
        <div className="grid gap-4 sm:grid-cols-2">
          {(
            [
              ["tech_frontend", "Frontend", "React, Next.js"],
              ["tech_backend", "Backend", "Node.js, Laravel"],
              ["tech_database", "Database", "PostgreSQL, MongoDB"],
              ["tech_hosting", "Hosting / cloud", "AWS, DigitalOcean"],
            ] as const
          ).map(([key, label, ph]) => (
            <div key={key} className="grid gap-2">
              <Label htmlFor={key}>{label}</Label>
              <Input
                id={key}
                value={intake[key] ?? ""}
                onChange={(e) => patch({ [key]: e.target.value })}
                placeholder={ph}
              />
            </div>
          ))}
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="tech_other">Other tools</Label>
            <Input
              id="tech_other"
              value={intake.tech_other ?? ""}
              onChange={(e) => patch({ tech_other: e.target.value })}
              placeholder="Stripe, Redis, Firebase"
            />
          </div>
        </div>
      </Section>

      <Section title="Additional information" step={11}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="asking_price">Asking price (USD)</Label>
            <Input
              id="asking_price"
              inputMode="decimal"
              value={intake.asking_price_usd}
              onChange={(e) => patch({ asking_price_usd: e.target.value })}
              placeholder="950000"
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="founded_year">Founded year</Label>
            <Input
              id="founded_year"
              inputMode="numeric"
              value={intake.founded_year ?? ""}
              onChange={(e) => patch({ founded_year: e.target.value })}
              placeholder={String(new Date().getFullYear())}
            />
          </div>
          <div className="grid gap-2">
            <Label>Reason for selling</Label>
            <Select
              value={intake.reason_for_selling ?? ""}
              onValueChange={(v) => patch({ reason_for_selling: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select reason" />
              </SelectTrigger>
              <SelectContent>
                {SELLER_REASONS_FOR_SELLING.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="transition">Transition support</Label>
            <Input
              id="transition"
              value={intake.transition_support ?? ""}
              onChange={(e) => patch({ transition_support: e.target.value })}
              placeholder="e.g. 1 month"
            />
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="legal">Legal status</Label>
            <Input
              id="legal"
              value={intake.legal_status ?? ""}
              onChange={(e) => patch({ legal_status: e.target.value })}
              placeholder="Private limited, LLC, …"
            />
          </div>
        </div>
      </Section>

      <div className="flex flex-col-reverse gap-2 border-t border-border pt-5 sm:flex-row sm:justify-end sm:gap-3">
        <Button
          type="button"
          variant="outline"
          disabled={savingDraft || submitting}
          onClick={() => void saveDraft()}
        >
          {savingDraft ? "Saving…" : "Save draft"}
        </Button>
        <Button type="submit" disabled={submitting} className="font-bold">
          {submitting ? "Submitting…" : "Submit for validation"}
        </Button>
      </div>
    </form>
  );
}
