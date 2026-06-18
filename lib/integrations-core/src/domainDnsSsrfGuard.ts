import { dnsNameNorm } from "./domainDnsHostUtils.js";

const HOST_LABEL =
  /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/i;

const BLOCKED_HOST_SUFFIXES = [
  ".localhost",
  ".local",
  ".internal",
  ".corp",
  ".home",
  ".lan",
];

const BLOCKED_EXACT_HOSTS = new Set([
  "localhost",
  "metadata.google.internal",
  "metadata.goog",
  "instance-data",
]);

export class DomainVerificationHostRejectedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DomainVerificationHostRejectedError";
  }
}

function parseIpv4(octets: number[]): number | null {
  if (octets.length !== 4) return null;
  if (octets.some((n) => n < 0 || n > 255)) return null;
  return (
    ((octets[0]! << 24) >>> 0) +
    (octets[1]! << 16) +
    (octets[2]! << 8) +
    octets[3]!
  );
}

/** Returns true if IPv4 is non-routable / link-local / metadata-adjacent. */
export function isBlockedPublicIpv4(ip: string): boolean {
  const parts = ip.split(".").map((p) => Number.parseInt(p, 10));
  const n = parseIpv4(parts);
  if (n === null) return true;
  const a = (n >>> 24) & 0xff;
  const b = (n >>> 16) & 0xff;
  if (a === 0) return true;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a >= 224) return true;
  return false;
}

export function assertPublicVerificationHost(host: string): string {
  const h = dnsNameNorm(host);
  if (!h || h.length > 253) {
    throw new DomainVerificationHostRejectedError(
      "Invalid verification hostname.",
    );
  }
  if (h.includes(":") || h.includes("/") || h.includes("@")) {
    throw new DomainVerificationHostRejectedError(
      "Only public domain names are allowed for verification.",
    );
  }
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(h) && isBlockedPublicIpv4(h)) {
    throw new DomainVerificationHostRejectedError(
      "IP addresses cannot be used for domain verification.",
    );
  }
  if (BLOCKED_EXACT_HOSTS.has(h)) {
    throw new DomainVerificationHostRejectedError("Hostname is not allowed.");
  }
  for (const suffix of BLOCKED_HOST_SUFFIXES) {
    if (h === suffix.slice(1) || h.endsWith(suffix)) {
      throw new DomainVerificationHostRejectedError("Hostname is not allowed.");
    }
  }
  if (!HOST_LABEL.test(h)) {
    throw new DomainVerificationHostRejectedError(
      "Invalid DNS hostname format.",
    );
  }
  return h;
}

export function filterPublicResolverIps(ips: string[]): string[] {
  return ips.filter((ip) => !isBlockedPublicIpv4(ip));
}
