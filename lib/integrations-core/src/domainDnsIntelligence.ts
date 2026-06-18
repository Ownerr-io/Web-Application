import { lookup, Resolver, resolveNs, resolveTxt } from "node:dns/promises";
import {
  apexFromHost,
  dnsHostNameFieldGuidance,
  dnsNameNorm,
  siblingVerificationHost,
} from "./domainDnsHostUtils.js";
import {
  assertPublicVerificationHost,
  DomainVerificationHostRejectedError,
  filterPublicResolverIps,
} from "./domainDnsSsrfGuard.js";

export type DomainDiagnosticStatus =
  | "DOMAIN_TXT_NOT_FOUND"
  | "DOMAIN_TOKEN_MISMATCH"
  | "DOMAIN_FOUND_ON_DIFFERENT_HOST"
  | "DOMAIN_PROPAGATING"
  | "DOMAIN_NAMESERVER_MISMATCH"
  | "DOMAIN_VERIFIED"
  | "VERIFICATION_ENGINE_OFFLINE"
  | "VERIFICATION_QUEUE_DELAY";

export type DomainDnsDiagnostic = {
  status: DomainDiagnosticStatus;
  severity: "info" | "warning" | "error";
  title: string;
  description: string;
  next_action: string;
  queried_host: string;
  expected_token: string;
  found_records: string[];
  nameservers: string[];
  checked_at: string;
  sibling_host?: string | null;
  authoritative_found_records?: string[];
  public_found_records?: string[];
};

export {
  apexFromHost,
  dnsHostNameFieldGuidance,
  dnsNameNorm,
  hostNameFieldOptions,
  siblingVerificationHost,
} from "./domainDnsHostUtils.js";

const TOKEN_PREFIX = "ownerr-verification=";

function tokenMatches(txt: string, expectedToken: string): boolean {
  const expectedNorm = expectedToken.trim();
  const t = txt.trim();
  return (
    t === expectedNorm ||
    t.includes(expectedNorm) ||
    t.replace(/\s+/g, "") === expectedNorm.replace(/\s+/g, "")
  );
}

function extractOwnerrTokens(records: string[]): string[] {
  return records.filter((r) => r.includes(TOKEN_PREFIX));
}

/** RFC 7208 — detect email SPF TXT without vendor-specific lists. */
function isSpfTxtRecord(record: string): boolean {
  return /^v=spf1/i.test(record.trim());
}

function nameserverGuidance(nameservers: string[]): string {
  if (nameservers.length === 0) return "";
  return ` Authoritative nameservers: ${nameservers.join(", ")}. Add the TXT in the DNS zone served by those nameservers.`;
}

function verificationFailureNextAction(
  base: string,
  verificationHost: string,
  nameservers: string[],
): string {
  return `${base} ${dnsHostNameFieldGuidance(verificationHost)}${nameserverGuidance(nameservers)}`;
}

async function resolveNsHostnames(apex: string): Promise<string[]> {
  try {
    const ns = await resolveNs(apex);
    return ns.map((n) => dnsNameNorm(n));
  } catch {
    return [];
  }
}

async function nameserverIps(nsHostnames: string[]): Promise<string[]> {
  const ips: string[] = [];
  for (const host of nsHostnames) {
    try {
      const { address } = await lookup(host, { family: 4 });
      if (address) ips.push(address);
    } catch {
      /* skip unreachable NS */
    }
  }
  return ips;
}

async function resolveTxtRecords(
  host: string,
  resolverIps?: string[],
): Promise<string[]> {
  const hostNorm = dnsNameNorm(host);
  if (resolverIps?.length) {
    const resolver = new Resolver();
    resolver.setServers(resolverIps);
    const records = await resolver.resolveTxt(hostNorm);
    return records.map((r) => r.join("").trim());
  }
  const records = await resolveTxt(hostNorm);
  return records.map((r) => r.join("").trim());
}

export type DomainDnsProbeResult = {
  pass: boolean;
  host: string;
  expected: string;
  method: "txt" | "cname";
  evidence: Record<string, unknown>;
  diagnostic: DomainDnsDiagnostic;
};

function cnameMatches(actual: string, expected: string): boolean {
  const a = dnsNameNorm(actual);
  const e = dnsNameNorm(expected);
  if (!e) return false;
  return a === e || a.endsWith(`.${e}`) || a.includes(e);
}

export async function probeDomainVerification(input: {
  host: string;
  expected: string;
  method: "txt" | "cname";
}): Promise<DomainDnsProbeResult> {
  let hostNorm: string;
  try {
    hostNorm = assertPublicVerificationHost(input.host);
  } catch (e) {
    const msg =
      e instanceof DomainVerificationHostRejectedError
        ? e.message
        : "Invalid verification hostname.";
    const checkedAt = new Date().toISOString();
    return {
      pass: false,
      host: dnsNameNorm(input.host),
      expected: input.expected.trim(),
      method: input.method,
      evidence: { error: msg, diagnostic_status: "DOMAIN_TXT_NOT_FOUND" },
      diagnostic: {
        status: "DOMAIN_TXT_NOT_FOUND",
        severity: "error",
        title: "Invalid hostname",
        description: msg,
        next_action: "Enter a public domain you control (e.g. example.com).",
        queried_host: dnsNameNorm(input.host),
        expected_token: input.expected.trim(),
        found_records: [],
        nameservers: [],
        checked_at: checkedAt,
      },
    };
  }
  const expected = input.expected.trim();
  const apex = apexFromHost(hostNorm);
  const checkedAt = new Date().toISOString();
  const nameservers = await resolveNsHostnames(apex);
  const nsIps = filterPublicResolverIps(await nameserverIps(nameservers));

  let pass = false;
  let publicRecords: string[] = [];
  let authoritativeRecords: string[] = [];
  let cnames: string[] = [];
  let error: string | undefined;
  const sibling = siblingVerificationHost(hostNorm);

  try {
    if (input.method === "txt") {
      publicRecords = await resolveTxtRecords(hostNorm);
      if (nsIps.length) {
        try {
          authoritativeRecords = await resolveTxtRecords(hostNorm, nsIps);
        } catch {
          authoritativeRecords = [];
        }
      }
      pass = publicRecords.some((txt) => tokenMatches(txt, expected));
      if (!pass && authoritativeRecords.length) {
        pass = authoritativeRecords.some((txt) => tokenMatches(txt, expected));
      }
    } else {
      const { resolveCname } = await import("node:dns/promises");
      try {
        cnames = (await resolveCname(hostNorm)).map(dnsNameNorm);
      } catch (cnameErr) {
        const code =
          cnameErr && typeof cnameErr === "object" && "code" in cnameErr
            ? String((cnameErr as { code: string }).code)
            : "";
        if (code !== "ENODATA" && code !== "ENOTFOUND") {
          throw cnameErr;
        }
      }
      pass = cnames.some((c) => cnameMatches(c, expected));
      publicRecords = cnames;
    }
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
    pass = false;
  }

  let siblingRecords: string[] = [];
  let siblingMatch = false;
  if (!pass && sibling && input.method === "txt") {
    try {
      siblingRecords = await resolveTxtRecords(sibling);
      siblingMatch = siblingRecords.some((txt) => tokenMatches(txt, expected));
    } catch {
      siblingRecords = [];
    }
  }

  const diagnostic = buildDomainDiagnostic({
    pass,
    verificationHost: hostNorm,
    expectedToken: expected,
    publicRecords: input.method === "txt" ? publicRecords : cnames,
    authoritativeRecords,
    nameservers,
    siblingHost: sibling,
    siblingRecords,
    siblingMatch,
    checkedAt,
    error,
  });

  const evidence: Record<string, unknown> = {
    method: input.method,
    host: hostNorm,
    host_queried: hostNorm,
    expected_record: expected,
    per_record: input.method === "txt" ? publicRecords : undefined,
    records: input.method === "txt" ? publicRecords.join(" ") : undefined,
    txt_match: input.method === "txt" ? pass : undefined,
    cnames: input.method === "cname" ? cnames : undefined,
    nameservers,
    authoritative_txt: authoritativeRecords,
    public_txt: publicRecords,
    sibling_host: sibling,
    sibling_txt: siblingRecords,
    diagnostic_status: diagnostic.status,
    error,
  };

  return {
    pass,
    host: hostNorm,
    expected,
    method: input.method,
    evidence,
    diagnostic,
  };
}

function buildDomainDiagnostic(input: {
  pass: boolean;
  verificationHost: string;
  expectedToken: string;
  publicRecords: string[];
  authoritativeRecords: string[];
  nameservers: string[];
  siblingHost: string | null;
  siblingRecords: string[];
  siblingMatch: boolean;
  checkedAt: string;
  error?: string;
}): DomainDnsDiagnostic {
  const base = {
    queried_host: input.verificationHost,
    expected_token: input.expectedToken,
    found_records: input.publicRecords,
    nameservers: input.nameservers,
    checked_at: input.checkedAt,
    authoritative_found_records: input.authoritativeRecords,
    public_found_records: input.publicRecords,
    sibling_host: input.siblingHost,
  };

  if (input.pass) {
    return {
      ...base,
      status: "DOMAIN_VERIFIED",
      severity: "info",
      title: "Domain verified",
      description: "DNS shows the correct verification TXT at this hostname.",
      next_action: "No action needed.",
    };
  }

  if (input.siblingMatch && input.siblingHost) {
    return {
      ...base,
      status: "DOMAIN_FOUND_ON_DIFFERENT_HOST",
      severity: "warning",
      title: "TXT found on a different hostname",
      description: `We found your verification TXT on ${input.siblingHost}, but you are verifying ${input.verificationHost}.`,
      next_action: `Either add the same TXT on ${input.verificationHost}, or change your verification target to ${input.siblingHost} (coming soon: one-click switch).`,
      sibling_host: input.siblingHost,
      found_records: input.siblingRecords,
    };
  }

  const authHasToken = extractOwnerrTokens(input.authoritativeRecords);
  const pubHasToken = extractOwnerrTokens(input.publicRecords);
  const staleOnAuth = authHasToken.some(
    (t) => !tokenMatches(t, input.expectedToken),
  );
  const staleOnPub = pubHasToken.some(
    (t) => !tokenMatches(t, input.expectedToken),
  );
  if (staleOnAuth || staleOnPub) {
    return {
      ...base,
      status: "DOMAIN_TOKEN_MISMATCH",
      severity: "error",
      title: "Verification token does not match",
      description:
        "We found an Ownerr verification TXT, but the value does not match this listing. You may have an old token from a previous attempt.",
      next_action: `Replace the TXT value with exactly: ${input.expectedToken}`,
      found_records: [...authHasToken, ...pubHasToken],
    };
  }

  const authMatch = input.authoritativeRecords.some((t) =>
    tokenMatches(t, input.expectedToken),
  );
  const pubEmpty = input.publicRecords.length === 0;
  if (input.authoritativeRecords.length > 0 && authMatch && pubEmpty) {
    return {
      ...base,
      status: "DOMAIN_PROPAGATING",
      severity: "info",
      title: "DNS is propagating",
      description:
        "Authoritative DNS already has your TXT record, but public resolvers have not picked it up yet.",
      next_action:
        "Wait a few minutes and check again — no need to change the record.",
      found_records: input.authoritativeRecords,
    };
  }

  const authOwnerr = extractOwnerrTokens(input.authoritativeRecords);
  const hasOtherTxtOnly =
    (input.authoritativeRecords.length > 0 || input.publicRecords.length > 0) &&
    authOwnerr.length === 0 &&
    extractOwnerrTokens(input.publicRecords).length === 0 &&
    !authMatch;

  if (hasOtherTxtOnly) {
    const records =
      input.authoritativeRecords.length > 0
        ? input.authoritativeRecords
        : input.publicRecords;
    const hasSpf = records.some(isSpfTxtRecord);
    return {
      ...base,
      status: "DOMAIN_TXT_NOT_FOUND",
      severity: "error",
      title: hasSpf
        ? "Verification TXT missing (other TXT records present)"
        : "TXT record not found",
      description: input.error
        ? `DNS lookup error: ${input.error}`
        : hasSpf
          ? `We see existing TXT at ${input.verificationHost} (including email/SPF records), but not your Ownerr verification token. Add a separate TXT row — do not replace existing records.`
          : `We see other TXT records at ${input.verificationHost}, but not your verification token.`,
      next_action: verificationFailureNextAction(
        `Add a TXT record with value exactly: ${input.expectedToken}. Keep existing TXT records.`,
        input.verificationHost,
        input.nameservers,
      ),
      found_records: records,
    };
  }

  return {
    ...base,
    status: "DOMAIN_TXT_NOT_FOUND",
    severity: "error",
    title: "TXT record not found",
    description: input.error
      ? `DNS lookup error: ${input.error}`
      : "No matching TXT record was found at this hostname.",
    next_action: verificationFailureNextAction(
      "Confirm the TXT value, then wait for DNS propagation and check again.",
      input.verificationHost,
      input.nameservers,
    ),
  };
}

export function diagnosticFromEngineOffline(
  checkedAt: string,
): DomainDnsDiagnostic {
  return {
    status: "VERIFICATION_ENGINE_OFFLINE",
    severity: "warning",
    title: "Verification engine unavailable",
    description:
      "We could not run a DNS check right now. Your DNS may already be correct.",
    next_action:
      "Try again in a few minutes, or contact support with Copy diagnostic.",
    queried_host: "",
    expected_token: "",
    found_records: [],
    nameservers: [],
    checked_at: checkedAt,
  };
}

export function diagnosticFromQueueDelay(input: {
  pendingJobs: number;
  checkedAt: string;
  verificationHost: string;
  expectedToken: string;
}): DomainDnsDiagnostic {
  return {
    status: "VERIFICATION_QUEUE_DELAY",
    severity: "info",
    title: "Verification queue is busy",
    description: `There are ${input.pendingJobs} jobs ahead in the queue. Your DNS check may take a little longer than usual.`,
    next_action:
      "Wait a moment and check again — no need to change your DNS record.",
    queried_host: input.verificationHost,
    expected_token: input.expectedToken,
    found_records: [],
    nameservers: [],
    checked_at: input.checkedAt,
  };
}
