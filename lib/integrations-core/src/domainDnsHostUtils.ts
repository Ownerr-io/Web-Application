/** Pure hostname helpers (no Node DNS) — safe for browser and worker. */

export function dnsNameNorm(name: string): string {
  return name.trim().replace(/\.$/, "").toLowerCase();
}

export function apexFromHost(host: string): string {
  const h = dnsNameNorm(host);
  const parts = h.split(".").filter(Boolean);
  if (parts.length <= 2) return h;
  return parts.slice(-2).join(".");
}

/** Alternate hostname when TXT may have been placed on apex vs www. */
export function siblingVerificationHost(host: string): string | null {
  const h = dnsNameNorm(host);
  const parts = h.split(".").filter(Boolean);
  if (parts.length < 2) return null;
  if (parts[0] === "www" && parts.length >= 3) {
    return parts.slice(1).join(".");
  }
  if (parts.length === 2) {
    return `www.${h}`;
  }
  return null;
}

export function hostNameFieldOptions(verificationHost: string): {
  optionA: string;
  optionB: string;
} {
  const h = dnsNameNorm(verificationHost);
  const apex = apexFromHost(h);
  const isApex = h === apex;
  if (isApex) {
    return { optionA: "@", optionB: h };
  }
  const label = h.endsWith(`.${apex}`) ? h.slice(0, -(apex.length + 1)) : h;
  return { optionA: label || h, optionB: h };
}

export function dnsHostNameFieldGuidance(verificationHost: string): string {
  const { optionA, optionB } = hostNameFieldOptions(verificationHost);
  if (optionA === optionB) {
    return `Set the DNS host/name field to "${optionA}".`;
  }
  return `Set the DNS host/name field to "${optionA}" or "${optionB}" (whichever your DNS provider expects for this hostname).`;
}
