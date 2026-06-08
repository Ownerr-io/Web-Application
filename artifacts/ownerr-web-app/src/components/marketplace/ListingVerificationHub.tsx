import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "wouter";
import {
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import {
  beginDomainVerification,
  connectProviderApiKey,
  fetchDomainVerificationPending,
  fetchLatestDomainDnsCheck,
  fetchStartupIdBySlug,
  listStartupIntegrationConnections,
  listVerificationProviders,
  requestIntegrationSync,
} from "@/lib/intelligence/integrationApi";
import { normalizeVerificationDomain } from "@/lib/marketplace/normalizeVerificationDomain";
import {
  clearDomainVerifyReturn,
  dnsHostFieldHint,
  DOMAIN_DNS_PROVIDERS,
  getDomainDnsProvider,
  loadPreferredDnsProvider,
  markDomainVerifyInProgress,
  readDomainVerifyReturn,
  savePreferredDnsProvider,
  type DomainDnsProviderId,
} from "@/lib/marketplace/domainDnsProviders";
import {
  fetchLatestAiInsights,
  fetchLatestValuationReport,
  generateAiInsights,
  generateValuationReport,
  publishValuationReport,
} from "@/lib/intelligence/valuationApi";
import { fetchStartupTrustPublic } from "@/lib/intelligence/trustApi";
import {
  fetchListingVerificationSnapshotBySlug,
  refreshListingGatesFromEvidence,
  invokeSyncWorkerProcessJobs,
  submitBusinessEmail,
  submitListingForVerification,
  type ListingVerificationGates,
} from "@/lib/intelligence/listingVerificationApi";
import { MARKETPLACE_ROUTES } from "@/routing/routeRegistry";
import {
  formatVerifiedRevenueDisplay,
  getRevenueProviderUiMeta,
  groupRevenueProvidersForConnect,
  mergeProviderConfigSchema,
  revenueMetricLabel,
} from "@/lib/marketplace/revenueProviderUi";
import { invalidateSellerDeskQueries } from "@/lib/marketplace/invalidateSellerDeskQueries";
import { fetchSellerIntakeBySlug } from "@/lib/marketplace/sellerIntakeApi";
import {
  countVerifiedGates,
  formatValidateAllToast,
  gateBadgeClass,
  gateNeedsSellerAction,
  gateStatusTone,
  gatesTotal,
  LISTING_LIFECYCLE_LABEL,
} from "@/lib/marketplace/verificationDesk";
import { VerificationGateSummary } from "@/components/marketplace/VerificationGateSummary";
import { cn } from "@/lib/utils";

type Props = { startupSlug: string };

function VerifiedBanner({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-2 rounded-md border border-emerald-500/25 bg-emerald-500/[0.06] px-3 py-2 text-xs text-emerald-800 dark:text-emerald-300">
      <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" aria-hidden />
      <div>{children}</div>
    </div>
  );
}

function GateShell({
  step,
  title,
  status,
  children,
}: {
  step: number;
  title: string;
  status: string;
  children: ReactNode;
}) {
  const tone = gateStatusTone(status);
  return (
    <section
      className={cn(
        "rounded-lg border p-4 space-y-3",
        tone === "ok" && "border-emerald-500/25 bg-emerald-500/[0.03]",
        tone === "bad" && "border-destructive/30 bg-destructive/[0.03]",
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-bold">
            {step}
          </span>
          <h4 className="font-semibold text-sm">{title}</h4>
        </div>
        <span
          className={cn(
            "rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize",
            gateBadgeClass(tone),
          )}
        >
          {status.replace(/_/g, " ")}
        </span>
      </div>
      {children}
    </section>
  );
}

export function ListingVerificationHub({ startupSlug }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [providerSlug, setProviderSlug] = useState("stripe");
  const [apiKey, setApiKey] = useState("");
  const [externalId, setExternalId] = useState("");
  const [domain, setDomain] = useState("");
  const [dnsProviderId, setDnsProviderId] = useState<DomainDnsProviderId>(() =>
    loadPreferredDnsProvider(),
  );
  const [domainGuidedActive, setDomainGuidedActive] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [dnsHint, setDnsHint] = useState<{
    host: string;
    expectedRecord: string;
    method: string;
    domain: string;
  } | null>(null);

  const { data: startupId } = useQuery({
    queryKey: ["startup-id", startupSlug],
    queryFn: () => fetchStartupIdBySlug(startupSlug),
  });

  const {
    data: snapshot,
    isLoading: snapshotLoading,
    refetch: refetchSnapshot,
  } = useQuery({
    queryKey: ["listing-verification-snapshot", startupSlug],
    queryFn: () => fetchListingVerificationSnapshotBySlug(startupSlug),
    refetchInterval: (q) =>
      q.state.data?.listing_lifecycle === "verification_in_progress"
        ? 5000
        : false,
  });

  const { data: trust } = useQuery({
    queryKey: ["startup-trust", startupSlug],
    queryFn: () => fetchStartupTrustPublic(startupSlug),
  });

  const { data: providers = [] } = useQuery({
    queryKey: ["verification-providers"],
    queryFn: listVerificationProviders,
  });

  const { data: connectionRows = [] } = useQuery({
    queryKey: ["startup-integration-connections", startupId],
    queryFn: () =>
      startupId
        ? listStartupIntegrationConnections(startupId)
        : Promise.resolve([]),
    enabled: !!startupId,
  });

  const { data: valuation } = useQuery({
    queryKey: ["valuation-report", startupId],
    queryFn: () =>
      startupId ? fetchLatestValuationReport(startupId) : Promise.resolve(null),
    enabled: !!startupId && advancedOpen,
  });

  const { data: insights } = useQuery({
    queryKey: ["ai-insights", startupId],
    queryFn: () =>
      startupId ? fetchLatestAiInsights(startupId) : Promise.resolve(null),
    enabled: !!startupId && advancedOpen,
  });

  const { data: pendingDomainChallenge } = useQuery({
    queryKey: ["domain-verification-pending", startupId],
    queryFn: () =>
      startupId
        ? fetchDomainVerificationPending(startupId)
        : Promise.resolve(null),
    enabled: !!startupId && snapshot?.gates.domain_status !== "verified",
  });

  const { data: sellerIntake } = useQuery({
    queryKey: ["seller-intake", startupSlug],
    queryFn: () => fetchSellerIntakeBySlug(startupSlug),
    enabled: !!startupSlug,
  });

  const { data: lastDomainDnsCheck } = useQuery({
    queryKey: ["domain-dns-check-latest", startupId],
    queryFn: () =>
      startupId ? fetchLatestDomainDnsCheck(startupId) : Promise.resolve(null),
    enabled: !!startupId && snapshot?.gates.domain_status !== "verified",
    retry: false,
  });

  useEffect(() => {
    const vd = snapshot?.gates.verified_domain;
    if (vd && !domain) setDomain(vd);
  }, [snapshot?.gates.verified_domain, domain]);

  useEffect(() => {
    const declared = sellerIntake?.declared_domain?.trim();
    if (declared && !domain) setDomain(declared);
    const provider = sellerIntake?.dns_provider;
    if (provider && provider !== "other") {
      setDnsProviderId(provider as DomainDnsProviderId);
    }
  }, [sellerIntake?.declared_domain, sellerIntake?.dns_provider, domain]);

  useEffect(() => {
    if (!pendingDomainChallenge || snapshot?.gates.domain_status === "verified")
      return;
    setDnsHint({
      host: pendingDomainChallenge.host,
      expectedRecord: pendingDomainChallenge.expectedRecord,
      method: pendingDomainChallenge.method,
      domain: pendingDomainChallenge.domain,
    });
    setDomain((current) => current || pendingDomainChallenge.domain);
  }, [pendingDomainChallenge, snapshot?.gates.domain_status]);

  const submittedDraftRef = useRef(false);
  useEffect(() => {
    if (!startupSlug || submittedDraftRef.current || !snapshot) return;
    if (snapshot.listing_lifecycle === "draft") {
      submittedDraftRef.current = true;
      void submitListingForVerification(startupSlug)
        .then(() => refetchSnapshot())
        .catch(() => undefined);
    }
  }, [startupSlug, snapshot, refetchSnapshot]);

  function invalidateAll() {
    invalidateSellerDeskQueries(qc);
    void refetchSnapshot();
    void qc.invalidateQueries({ queryKey: ["startup-trust", startupSlug] });
    void qc.invalidateQueries({
      queryKey: ["startup-integration-connections", startupId],
    });
    void qc.invalidateQueries({
      queryKey: ["domain-verification-pending", startupId],
    });
    void qc.invalidateQueries({
      queryKey: ["domain-dns-check-latest", startupId],
    });
  }

  function afterChange() {
    invalidateAll();
    if (startupId) {
      void refreshListingGatesFromEvidence(startupId).catch(() => undefined);
    }
  }

  const validateAllMut = useMutation({
    mutationFn: async () => {
      if (!startupId) throw new Error("Startup not found");

      const lc = snapshot?.listing_lifecycle;
      if (
        lc === "draft" ||
        lc === "verification_required" ||
        lc === "verification_failed"
      ) {
        await submitListingForVerification(startupSlug);
      }
      await refreshListingGatesFromEvidence(startupId);
      for (const conn of connectionRows) {
        await requestIntegrationSync(conn.id);
      }
      const workerResult = await invokeSyncWorkerProcessJobs(startupId);
      await new Promise((r) => setTimeout(r, 1200));
      await refreshListingGatesFromEvidence(startupId);
      const after = await fetchListingVerificationSnapshotBySlug(startupSlug);
      return { workerResult, after };
    },
    onSuccess: async (result) => {
      if (result?.workerResult && !result.workerResult.ok) {
        toast({
          title: "Sync worker offline",
          description: result.workerResult.message,
          variant: "destructive",
        });
      }
      await refetchSnapshot();
      invalidateAll();
      const fresh =
        result?.after ??
        (await fetchListingVerificationSnapshotBySlug(startupSlug));
      if (fresh) {
        const msg = formatValidateAllToast(fresh.gates);
        toast({
          title: msg.title,
          description: msg.description,
          variant:
            msg.title === "Some checks failed" ? "destructive" : "default",
        });
      }
    },
    onError: (e: Error) =>
      toast({
        title: "Validation failed",
        description: e.message,
        variant: "destructive",
      }),
  });

  const connectMut = useMutation({
    mutationFn: async () => {
      if (!startupId) throw new Error("Startup not found");
      return connectProviderApiKey({
        startupId,
        providerSlug,
        apiKey,
        externalAccountId: externalId || undefined,
      });
    },
    onSuccess: () => {
      toast({ title: "Provider connected", description: "Sync queued." });
      setApiKey("");
      afterChange();
    },
    onError: (e: Error) =>
      toast({
        title: "Connect failed",
        description: e.message,
        variant: "destructive",
      }),
  });

  const domainMut = useMutation({
    mutationFn: async (method: "txt" | "cname") => {
      if (!startupId) throw new Error("Startup not found");
      const normalized = normalizeVerificationDomain(domain);
      if (normalized.length < 4 || !normalized.includes(".")) {
        throw new Error(
          "Enter a valid domain (e.g. clykur.com or ww.clykur.com)",
        );
      }
      return beginDomainVerification({ startupId, domain: normalized, method });
    },
    onSuccess: async (res) => {
      setDomain(res.domain ?? normalizeVerificationDomain(domain));
      setDnsHint({
        host: res.host,
        expectedRecord: res.expectedRecord,
        method: res.method,
        domain: res.domain ?? normalizeVerificationDomain(domain),
      });
      toast({
        title: "DNS record ready",
        description:
          "Add it at your DNS host, wait for propagation, then Validate all checks.",
      });
      afterChange();
      if (startupId) {
        try {
          await invokeSyncWorkerProcessJobs(startupId);
        } catch {
          /* worker optional until user validates */
        }
      }
    },
    onError: (e: Error) =>
      toast({
        title: "Domain setup failed",
        description: e.message,
        variant: "destructive",
      }),
  });

  const domainGuidedMut = useMutation({
    mutationFn: async () => {
      if (!startupId) throw new Error("Startup not found");
      const normalized = normalizeVerificationDomain(domain);
      if (normalized.length < 4 || !normalized.includes(".")) {
        throw new Error(
          "Enter a valid domain (e.g. clykur.com or www.clykur.com)",
        );
      }
      savePreferredDnsProvider(dnsProviderId);
      let hint = dnsHint;
      if (!hint || hint.domain !== normalized) {
        const res = await beginDomainVerification({
          startupId,
          domain: normalized,
          method: "txt",
        });
        hint = {
          host: res.host,
          expectedRecord: res.expectedRecord,
          method: res.method,
          domain: res.domain ?? normalized,
        };
        setDnsHint(hint);
        setDomain(hint.domain);
      }
      const provider = getDomainDnsProvider(dnsProviderId);
      const consoleUrl = provider.consoleUrl(normalized);
      markDomainVerifyInProgress(startupSlug);
      setDomainGuidedActive(true);
      return { hint, consoleUrl, providerLabel: provider.label };
    },
    onSuccess: async ({ hint, consoleUrl, providerLabel }) => {
      toast({
        title: "Add TXT at " + providerLabel,
        description: consoleUrl
          ? "We opened your DNS console in a new tab. Add the TXT record, save, then return here — we will re-check automatically."
          : "Add the TXT record at your DNS host, then click Validate all checks.",
      });
      if (consoleUrl) {
        const opened = window.open(consoleUrl, "_blank", "noopener,noreferrer");
        if (!opened && dnsProviderId === "godaddy") {
          toast({
            title: "Open GoDaddy manually",
            description:
              "Sign in at account.godaddy.com → your domain → DNS, then add the TXT record.",
            variant: "destructive",
          });
        }
      }
      if (dnsProviderId === "godaddy") {
        toast({
          title: "GoDaddy tip",
          description:
            "If you see an Akamai error page, use account.godaddy.com → Domains → DNS instead of the old dcc link.",
        });
      }
      try {
        await navigator.clipboard.writeText(hint.expectedRecord);
        toast({
          title: "TXT copied",
          description: "Paste this as the TXT record value.",
        });
      } catch {
        /* clipboard optional */
      }
      afterChange();
      if (startupId) {
        try {
          await invokeSyncWorkerProcessJobs(startupId);
        } catch {
          /* optional */
        }
      }
    },
    onError: (e: Error) =>
      toast({
        title: "Domain guide failed",
        description: e.message,
        variant: "destructive",
      }),
  });

  const domainReturnCheckedRef = useRef(false);
  const lastAutoValidateRef = useRef(0);
  useEffect(() => {
    if (typeof window === "undefined" || !startupId) return;
    if (snapshot?.gates.domain_status === "verified") return;
    const pending = readDomainVerifyReturn();
    if (!pending || pending.startupSlug !== startupSlug) return;
    setDomainGuidedActive(true);

    const onFocus = () => {
      if (validateAllMut.isPending) return;
      const now = Date.now();
      if (now - lastAutoValidateRef.current < 45_000) return;
      lastAutoValidateRef.current = now;
      void validateAllMut.mutateAsync().then((result) => {
        if (result?.after?.gates?.domain_status === "verified") {
          clearDomainVerifyReturn();
          setDomainGuidedActive(false);
        }
      });
    };

    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [startupId, startupSlug, snapshot?.gates.domain_status, validateAllMut]);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !startupId ||
      domainReturnCheckedRef.current
    )
      return;
    const params = new URLSearchParams(window.location.search);
    const from = params.get("from");
    if (from !== "domain") return;
    domainReturnCheckedRef.current = true;
    params.delete("from");
    const qs = params.toString();
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${qs ? `?${qs}` : ""}`,
    );
    clearDomainVerifyReturn();
    void validateAllMut.mutateAsync();
    toast({
      title: "Checking DNS",
      description: "Running validate-all after your DNS provider visit.",
    });
  }, [startupId, validateAllMut, toast]);

  const valuationMut = useMutation({
    mutationFn: async () => {
      if (!startupId) throw new Error("Startup not found");
      const id = await generateValuationReport(startupId);
      await publishValuationReport(id);
    },
    onSuccess: () =>
      void qc.invalidateQueries({ queryKey: ["valuation-report", startupId] }),
  });

  const aiMut = useMutation({
    mutationFn: async () => {
      if (!startupId) throw new Error("Startup not found");
      return generateAiInsights(startupId);
    },
    onSuccess: () =>
      void qc.invalidateQueries({ queryKey: ["ai-insights", startupId] }),
  });

  const revenueProviderGroups = groupRevenueProvidersForConnect(providers);
  const connectableRevenueProviders = revenueProviderGroups.flatMap((g) =>
    g.items.filter((i) => i.authType === "api_key"),
  );
  const selectedRevenueMeta =
    mergeProviderConfigSchema(
      providerSlug,
      providers.find((p) => p.slug === providerSlug)?.config_schema,
    ) ?? getRevenueProviderUiMeta(providerSlug);

  const gates = snapshot?.gates;
  const verifiedCount = gates ? countVerifiedGates(gates) : 0;
  const total = gatesTotal();
  const domainConn = connectionRows.find((c) => c.providerSlug === "domain");
  const revenueConnections = connectionRows.filter(
    (c) =>
      c.providerSlug !== "domain" &&
      (providers.find((p) => p.slug === c.providerSlug)?.category ===
        "revenue" ||
        Boolean(
          providers.find((p) => p.slug === c.providerSlug)?.config_schema
            ?.satisfies_revenue_gate,
        )),
  );
  const hasRevenueConnection = revenueConnections.length > 0;
  const activeRevenueMeta = gates?.revenue_source_provider
    ? getRevenueProviderUiMeta(gates.revenue_source_provider)
    : revenueConnections[0]
      ? mergeProviderConfigSchema(
          revenueConnections[0].providerSlug,
          providers.find((p) => p.slug === revenueConnections[0]!.providerSlug)
            ?.config_schema,
        )
      : undefined;
  const lc = snapshot?.listing_lifecycle;

  if (snapshotLoading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-xl border p-12 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading verification status…
      </div>
    );
  }

  if (!snapshot || !gates) {
    return (
      <p className="text-sm text-muted-foreground">
        Could not load verification status. Try Validate all checks or reload
        the page.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-muted/10 p-4 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Listing verification
            </p>
            <p className="text-xl font-semibold">
              {LISTING_LIFECYCLE_LABEL[lc ?? "draft"]}
            </p>
            <p className="mt-1 text-sm text-muted-foreground max-w-xl">
              Complete each check once. Verified steps stay saved — only failed
              or incomplete steps need action. Buyers see your listing only
              after all three checks pass.
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Trust score{" "}
              <span className="font-mono font-semibold text-foreground">
                {trust?.score ?? 0}
              </span>{" "}
              ({trust?.level ?? "unverified"})
            </p>
          </div>
          <Button
            size="lg"
            disabled={validateAllMut.isPending || !startupId}
            onClick={() => validateAllMut.mutate()}
          >
            {validateAllMut.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Validate all checks
          </Button>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-xs font-medium">
            <span>
              {verifiedCount}/{total} gates verified
            </span>
            {gates.fraud_risk && gates.fraud_risk !== "clear" ? (
              <span className="text-amber-700 dark:text-amber-400">
                Fraud scan: {gates.fraud_risk.replace(/_/g, " ")}
              </span>
            ) : null}
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-brand-lime transition-all duration-500"
              style={{ width: `${(verifiedCount / total) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <VerificationGateSummary gates={gates} />

      <GateShell
        step={1}
        title="Founder verification (person)"
        status={gates.identity_status}
      >
        {gates.identity_status === "verified" ? (
          <VerifiedBanner>
            Founder person verification complete. Manage profile in Verification
            desk.
          </VerifiedBanner>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">
              Complete one-time founder verification (name, country, LinkedIn)
              under Verification in the sidebar — no government ID required.
            </p>
            <Button variant="secondary" asChild>
              <Link href={MARKETPLACE_ROUTES.sellerPersonVerification}>
                Open founder verification
              </Link>
            </Button>
          </>
        )}
      </GateShell>

      <GateShell step={2} title="Domain ownership" status={gates.domain_status}>
        {gates.domain_status === "verified" ? (
          <VerifiedBanner>
            Domain verified:{" "}
            <span className="font-mono">{gates.verified_domain ?? domain}</span>
          </VerifiedBanner>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">
              Choose where you manage DNS, enter your site domain, then we open
              that console and copy the TXT token. When you return to this tab
              we run <strong>Validate all</strong> automatically. (You still add
              the TXT record once — DNS hosts do not allow us to do that without
              their API.)
            </p>
            <div className="flex flex-col gap-3 max-w-md">
              <Select
                value={dnsProviderId}
                onValueChange={(v) =>
                  setDnsProviderId(v as DomainDnsProviderId)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Where is DNS managed?" />
                </SelectTrigger>
                <SelectContent>
                  {DOMAIN_DNS_PROVIDERS.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="clykur.com or www.clykur.com"
                className="font-mono"
                value={domain}
                onChange={(e) => {
                  setDomain(e.target.value);
                  setDnsHint(null);
                }}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                disabled={
                  !domain || domainGuidedMut.isPending || domainMut.isPending
                }
                onClick={() => domainGuidedMut.mutate()}
              >
                {domainGuidedMut.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ExternalLink className="mr-2 h-4 w-4" />
                )}
                Open DNS provider & verify
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={!domain || domainMut.isPending}
                onClick={() => domainMut.mutate("txt")}
              >
                Get TXT instructions only
              </Button>
            </div>
            {domainGuidedActive ? (
              <p className="text-xs text-emerald-800 dark:text-emerald-300 max-w-lg">
                Waiting for you to add TXT and return to this tab — we will
                re-check DNS when you focus this window.
              </p>
            ) : null}
            {dnsHint ? (
              <div className="rounded-md border bg-muted/30 p-3 text-xs space-y-2 max-w-lg">
                <p className="text-muted-foreground">
                  At{" "}
                  <strong>{getDomainDnsProvider(dnsProviderId).label}</strong>,
                  add a <strong>TXT</strong> record for{" "}
                  <span className="font-mono font-semibold text-foreground">
                    {dnsHint.host}
                  </span>
                  :
                </p>
                <div className="font-mono space-y-1 break-all">
                  <p>Type: TXT</p>
                  <p>
                    Host / name: {dnsHint.host}{" "}
                    <span className="text-muted-foreground font-sans">
                      ({dnsHostFieldHint(dnsHint.host, dnsProviderId)})
                    </span>
                  </p>
                  <p>Value: {dnsHint.expectedRecord}</p>
                </div>
              </div>
            ) : null}
            {lastDomainDnsCheck ? (
              <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-xs space-y-1 max-w-lg">
                <p className="font-semibold text-foreground">
                  Last DNS check (worker)
                </p>
                <p className="text-muted-foreground">
                  {lastDomainDnsCheck.checkedAt
                    ? new Date(lastDomainDnsCheck.checkedAt).toLocaleString()
                    : "—"}{" "}
                  · status:{" "}
                  <span className="font-mono">{lastDomainDnsCheck.status}</span>
                </p>
                {lastDomainDnsCheck.host ? (
                  <p className="font-mono break-all">
                    Queried: {lastDomainDnsCheck.host}
                  </p>
                ) : null}
                {lastDomainDnsCheck.cnames?.length ? (
                  <p className="font-mono break-all">
                    CNAME found: {lastDomainDnsCheck.cnames.join(", ")}
                  </p>
                ) : null}
                {lastDomainDnsCheck.txtRecords &&
                lastDomainDnsCheck.txtRecords.length === 0 ? (
                  <p className="text-muted-foreground">
                    No TXT records found at this host yet.
                  </p>
                ) : null}
                {lastDomainDnsCheck.txtRecords?.length ? (
                  <p className="font-mono break-all">
                    TXT found: {lastDomainDnsCheck.txtRecords.join(" | ")}
                  </p>
                ) : null}
                {(lastDomainDnsCheck.expected ?? dnsHint?.expectedRecord) ? (
                  <p className="font-mono break-all text-muted-foreground">
                    Expected TXT:{" "}
                    {lastDomainDnsCheck.expected ?? dnsHint?.expectedRecord}
                  </p>
                ) : null}
                {lastDomainDnsCheck.error ? (
                  <p className="text-destructive">{lastDomainDnsCheck.error}</p>
                ) : null}
                {lastDomainDnsCheck.status === "fail" &&
                lastDomainDnsCheck.host?.startsWith("_ownerr.") ? (
                  <p className="text-amber-800 dark:text-amber-300">
                    This check used an old CNAME setup. Click{" "}
                    <strong>Get TXT instructions</strong>, add the TXT on{" "}
                    <span className="font-mono">{domain || "your domain"}</span>
                    , then Validate all checks again.
                  </p>
                ) : null}
                {lastDomainDnsCheck.status === "fail" &&
                !lastDomainDnsCheck.host?.startsWith("_ownerr.") &&
                (lastDomainDnsCheck.expected ?? dnsHint?.expectedRecord) ? (
                  <p className="text-amber-800 dark:text-amber-300">
                    Add the TXT value exactly at your DNS provider, wait a few
                    minutes, then Validate all checks again.
                  </p>
                ) : null}
              </div>
            ) : gates.domain_status === "pending" && dnsHint ? (
              <p className="text-xs text-muted-foreground max-w-lg">
                No DNS check recorded yet. Add the record above, then click{" "}
                <strong>Validate all checks</strong>.
              </p>
            ) : null}
            {gates.domain_status === "failed" ||
            gates.domain_status === "pending" ? (
              <p className="text-xs text-muted-foreground">
                {gates.domain_status === "failed"
                  ? "Last DNS check did not match. Confirm the TXT/CNAME value exactly matches above (allow a few minutes for DNS), then Validate all checks."
                  : "After adding DNS, click Validate all checks to refresh verification."}
                {domainConn?.last_error ? (
                  <span className="block mt-1 text-destructive">
                    {domainConn.last_error}
                  </span>
                ) : null}
              </p>
            ) : null}
          </>
        )}
      </GateShell>

      <BusinessEmailGate
        step={3}
        startupId={startupId}
        gates={gates}
        onSent={() => void validateAllMut.mutateAsync()}
      />

      <GateShell
        step={4}
        title="Revenue (provider sync)"
        status={gates.revenue_status}
      >
        {gates.revenue_status === "verified" ? (
          <VerifiedBanner>
            Revenue verified
            {gates.verified_revenue_amount != null &&
            gates.verified_revenue_amount > 0 ? (
              <>
                {" "}
                —{" "}
                {formatVerifiedRevenueDisplay(
                  gates.verified_revenue_amount,
                  gates.revenue_currency,
                  activeRevenueMeta,
                )}
                {gates.revenue_source_provider ? (
                  <span className="text-muted-foreground">
                    {" "}
                    via{" "}
                    {activeRevenueMeta?.displayName ??
                      gates.revenue_source_provider}
                  </span>
                ) : null}
              </>
            ) : null}
            .
          </VerifiedBanner>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">
              {hasRevenueConnection
                ? `Your ${activeRevenueMeta?.displayName ?? "revenue"} connection is active. Run Validate all checks to refresh ${revenueMetricLabel(activeRevenueMeta)}. Evidence must sync within the last 30 days.`
                : "Connect a revenue source once (subscription, payments, commerce, accounting, or banking). Verified amount must come from sync — not manual entry."}
            </p>
            {selectedRevenueMeta?.connectDescription ? (
              <p className="text-xs text-muted-foreground">
                {selectedRevenueMeta.connectDescription}
              </p>
            ) : null}
            {connectionRows.length > 0 ? (
              <ul className="text-xs space-y-1">
                {revenueConnections.map((c) => (
                  <li key={c.id} className="text-muted-foreground">
                    <span className="font-medium text-foreground capitalize">
                      {mergeProviderConfigSchema(
                        c.providerSlug,
                        providers.find((p) => p.slug === c.providerSlug)
                          ?.config_schema,
                      )?.displayName ?? c.providerName}
                    </span>
                    {" · "}
                    {c.health_status}
                    {c.last_sync_at
                      ? ` · ${new Date(c.last_sync_at).toLocaleString()}`
                      : ""}
                    {c.last_error ? (
                      <span className="block text-destructive">
                        {c.last_error}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}
            {gates.revenue_status === "partial" ? (
              <p className="text-xs text-amber-800 dark:text-amber-300">
                {selectedRevenueMeta?.partialHint ??
                  activeRevenueMeta?.partialHint ??
                  "Provider connected but verified revenue is still $0, or sync is older than 30 days. Re-run Validate all after new activity in your connected account."}
              </p>
            ) : null}
            {gateNeedsSellerAction(gates.revenue_status) &&
            (!hasRevenueConnection || gates.revenue_status === "failed") ? (
              <form
                className="max-w-md space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (apiKey && !connectMut.isPending) connectMut.mutate();
                }}
              >
                {!hasRevenueConnection ? (
                  <>
                    <Select
                      value={providerSlug}
                      onValueChange={setProviderSlug}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Revenue source" />
                      </SelectTrigger>
                      <SelectContent>
                        {revenueProviderGroups.map((group) => (
                          <div key={group.class}>
                            <p className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                              {group.label}
                            </p>
                            {group.items
                              .filter((i) => i.authType === "api_key")
                              .map((i) => (
                                <SelectItem key={i.slug} value={i.slug}>
                                  {i.displayName}
                                </SelectItem>
                              ))}
                          </div>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedRevenueMeta?.requiresExternalAccount ? (
                      <Input
                        placeholder={
                          selectedRevenueMeta.externalAccountLabel ??
                          "External account ID"
                        }
                        className="font-mono text-sm"
                        value={externalId}
                        onChange={(e) => setExternalId(e.target.value)}
                      />
                    ) : null}
                    <Input
                      type="password"
                      name="integration_api_key"
                      autoComplete="off"
                      placeholder={
                        selectedRevenueMeta?.apiKeyPlaceholder ??
                        "API key (encrypted server-side)"
                      }
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                    />
                    {selectedRevenueMeta?.apiKeyHint ? (
                      <p className="text-xs text-muted-foreground">
                        {selectedRevenueMeta.apiKeyHint}
                      </p>
                    ) : null}
                    <Button
                      type="submit"
                      disabled={
                        !apiKey ||
                        connectMut.isPending ||
                        (selectedRevenueMeta?.requiresExternalAccount &&
                          !externalId.trim())
                      }
                    >
                      Connect & sync
                    </Button>
                    {connectableRevenueProviders.length <
                    revenueProviderGroups.flatMap((g) => g.items).length ? (
                      <p className="text-xs text-muted-foreground">
                        OAuth providers (Shopify, PayPal, QuickBooks, etc.)
                        connect from Settings when OAuth is enabled for your
                        workspace.
                      </p>
                    ) : null}
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    To switch providers, connect a different revenue source or
                    contact support to disconnect the current integration.
                  </p>
                )}
              </form>
            ) : null}
          </>
        )}
      </GateShell>

      <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between">
            Valuation & AI insights (optional)
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform",
                advancedOpen && "rotate-180",
              )}
            />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 pt-2">
          <div className="rounded-lg border p-4 space-y-2">
            <h4 className="text-sm font-medium">Valuation</h4>
            {valuation ? (
              <p className="text-sm text-muted-foreground">
                {valuation.currency} {valuation.low_amount?.toLocaleString()} –{" "}
                {valuation.high_amount?.toLocaleString()}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">No valuation yet.</p>
            )}
            <Button
              size="sm"
              onClick={() => valuationMut.mutate()}
              disabled={valuationMut.isPending}
            >
              Generate valuation
            </Button>
          </div>
          <div className="rounded-lg border p-4 space-y-2">
            <h4 className="text-sm font-medium">AI insights</h4>
            <Button
              size="sm"
              variant="outline"
              onClick={() => aiMut.mutate()}
              disabled={aiMut.isPending}
            >
              Run analysis
            </Button>
            {insights ? (
              <p className="text-sm text-muted-foreground">
                Analysis complete. Use this input alongside your financials when
                positioning the listing.
              </p>
            ) : null}
          </div>
        </CollapsibleContent>
      </Collapsible>

      <p className="text-[10px] text-muted-foreground">
        Required gates: founder person · domain · business email · revenue (MRR{" "}
        {" > "} 0). Auto-publish when all pass.
      </p>
    </div>
  );
}

function BusinessEmailGate({
  step,
  startupId,
  gates,
  onSent,
}: {
  step: number;
  startupId: string | null | undefined;
  gates: ListingVerificationGates;
  onSent: () => void;
}) {
  const { toast } = useToast();
  const [email, setEmail] = useState(gates.business_email ?? "");
  const [devLink, setDevLink] = useState<string | null>(null);
  const mut = useMutation({
    mutationFn: async () => {
      if (!startupId) throw new Error("Startup not found");
      return submitBusinessEmail(startupId, email);
    },
    onSuccess: (result) => {
      if (result.devLink && import.meta.env.DEV) {
        setDevLink(result.devLink);
        toast({
          title: "Verification link ready",
          description:
            "Email delivery is not configured locally. Use the link below.",
        });
      } else if (result.devLink) {
        setDevLink(null);
        toast({
          title: "Could not send email",
          description:
            "We could not deliver the verification email. Try again or contact support.",
          variant: "destructive",
        });
      } else {
        setDevLink(null);
        toast({
          title: "Check your inbox",
          description: `We sent a magic link to ${result.email}.`,
        });
      }
      onSent();
    },
    onError: (e: Error) =>
      toast({
        title: "Business email",
        description: e.message,
        variant: "destructive",
      }),
  });

  return (
    <GateShell
      step={step}
      title="Business email"
      status={gates.business_email_status}
    >
      {gates.business_email_status === "verified" ? (
        <VerifiedBanner>
          Work email verified:{" "}
          <span className="font-mono">{gates.business_email}</span>
        </VerifiedBanner>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            Use an address on your verified domain (e.g.
            founder@yourdomain.com). Consumer domains like Gmail are blocked.
          </p>
          <form
            className="flex max-w-md flex-col gap-2 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              mut.mutate();
            }}
          >
            <Input
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Button
              type="submit"
              disabled={!email.trim() || mut.isPending || !startupId}
            >
              Send magic link
            </Button>
          </form>
          {devLink && import.meta.env.DEV ? (
            <div className="mt-3 rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-xs">
              <p className="font-bold text-foreground">
                Verification link (local only)
              </p>
              <a
                href={devLink}
                className="mt-1 block break-all font-mono text-brand-orange underline"
                target="_blank"
                rel="noreferrer"
              >
                {devLink}
              </a>
            </div>
          ) : null}
        </>
      )}
    </GateShell>
  );
}
