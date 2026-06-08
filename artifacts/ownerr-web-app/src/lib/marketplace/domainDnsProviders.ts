export type DomainDnsProviderId =
  | "cloudflare"
  | "godaddy"
  | "namecheap"
  | "squarespace"
  | "aws_route53"
  | "vercel"
  | "digitalocean"
  | "ionos"
  | "hostinger"
  | "other";

export type DomainDnsProvider = {
  id: DomainDnsProviderId;
  label: string;
  /** Short hint for the DNS "name" field at this host */
  hostFieldHint: (host: string, apex: string) => string;
  consoleUrl: (domain: string) => string | null;
};

function apexFromHost(host: string): string {
  const h = host.trim().toLowerCase().replace(/\.$/, "");
  const parts = h.split(".");
  if (parts.length <= 2) return h;
  return parts.slice(-2).join(".");
}

export const DOMAIN_DNS_PROVIDERS: DomainDnsProvider[] = [
  {
    id: "cloudflare",
    label: "Cloudflare",
    hostFieldHint: (host, apex) =>
      host === apex
        ? "Use @ or the root name for the zone"
        : `Use ${host.replace(`.${apex}`, "")} or full ${host}`,
    consoleUrl: () => "https://dash.cloudflare.com/login",
  },
  {
    id: "godaddy",
    label: "GoDaddy",
    hostFieldHint: (host, apex) =>
      host === apex ? "@ or leave host blank" : host.replace(`.${apex}`, ""),
    // dcc.godaddy.com deep links often hit Akamai WAF (errors.edgesuite.net); account portal is stable.
    consoleUrl: (domain) =>
      `https://account.godaddy.com/domain/${encodeURIComponent(domain)}/settings?subtab=dns`,
  },
  {
    id: "namecheap",
    label: "Namecheap",
    hostFieldHint: (host, apex) =>
      host === apex ? "@host" : host.replace(`.${apex}`, ""),
    consoleUrl: (domain) =>
      `https://ap.www.namecheap.com/domains/domaincontrolpanel/${encodeURIComponent(domain)}/advancedns`,
  },
  {
    id: "squarespace",
    label: "Squarespace Domains",
    hostFieldHint: (host, apex) => (host === apex ? "@" : host),
    consoleUrl: (domain) =>
      `https://account.squarespace.com/domains/managed/${encodeURIComponent(domain)}/dns/dns-settings`,
  },
  {
    id: "aws_route53",
    label: "AWS Route 53",
    hostFieldHint: (host, apex) =>
      host === apex ? "Leave name empty for apex in hosted zone" : host,
    consoleUrl: () => "https://console.aws.amazon.com/route53/v2/hostedzones",
  },
  {
    id: "vercel",
    label: "Vercel",
    hostFieldHint: (host, apex) =>
      host === apex ? "@" : host.replace(`.${apex}`, ""),
    consoleUrl: (domain) =>
      `https://vercel.com/${encodeURIComponent(domain)}/settings/domains`,
  },
  {
    id: "digitalocean",
    label: "DigitalOcean",
    hostFieldHint: (host, apex) => (host === apex ? "@" : host),
    consoleUrl: () => "https://cloud.digitalocean.com/networking/domains",
  },
  {
    id: "ionos",
    label: "IONOS",
    hostFieldHint: (host, apex) => (host === apex ? "@" : host),
    consoleUrl: () => "https://my.ionos.com/domains",
  },
  {
    id: "hostinger",
    label: "Hostinger",
    hostFieldHint: (host, apex) => (host === apex ? "@" : host),
    consoleUrl: () => "https://hpanel.hostinger.com/domains",
  },
  {
    id: "other",
    label: "Other / custom DNS",
    hostFieldHint: (host) => host,
    consoleUrl: () => null,
  },
];

export function getDomainDnsProvider(
  id: DomainDnsProviderId,
): DomainDnsProvider {
  return (
    DOMAIN_DNS_PROVIDERS.find((p) => p.id === id) ??
    DOMAIN_DNS_PROVIDERS.at(-1)!
  );
}

export function dnsHostFieldHint(
  host: string,
  providerId: DomainDnsProviderId,
): string {
  const apex = apexFromHost(host);
  return getDomainDnsProvider(providerId).hostFieldHint(host, apex);
}

const STORAGE_KEY = "ownerr_domain_dns_provider";

export function loadPreferredDnsProvider(): DomainDnsProviderId {
  if (typeof window === "undefined") return "other";
  const v = localStorage.getItem(STORAGE_KEY);
  if (v && DOMAIN_DNS_PROVIDERS.some((p) => p.id === v)) {
    return v as DomainDnsProviderId;
  }
  return "other";
}

export function savePreferredDnsProvider(id: DomainDnsProviderId): void {
  localStorage.setItem(STORAGE_KEY, id);
}

export const DOMAIN_VERIFY_RETURN_KEY = "ownerr_domain_verify_return";

export type DomainVerifyReturnPayload = {
  startupSlug: string;
  startedAt: number;
};

export function markDomainVerifyInProgress(startupSlug: string): void {
  const payload: DomainVerifyReturnPayload = {
    startupSlug,
    startedAt: Date.now(),
  };
  sessionStorage.setItem(DOMAIN_VERIFY_RETURN_KEY, JSON.stringify(payload));
}

export function readDomainVerifyReturn(): DomainVerifyReturnPayload | null {
  const raw = sessionStorage.getItem(DOMAIN_VERIFY_RETURN_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as DomainVerifyReturnPayload;
    if (!parsed.startupSlug || !parsed.startedAt) return null;
    if (Date.now() - parsed.startedAt > 4 * 60 * 60 * 1000) {
      sessionStorage.removeItem(DOMAIN_VERIFY_RETURN_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearDomainVerifyReturn(): void {
  sessionStorage.removeItem(DOMAIN_VERIFY_RETURN_KEY);
}
