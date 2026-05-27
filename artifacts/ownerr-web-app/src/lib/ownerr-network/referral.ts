const REF_KEY = "ownerr_network_ref_attribution";
const REF_SESSION_KEY = "ownerr_network_ref_session";

export type OwnerrNetworkReferralAttribution = {
  referralCode: string;
  capturedAt: number;
  sourcePlatform?: string;
};

export function captureOwnerrNetworkReferralFromSearch(
  search: string,
): OwnerrNetworkReferralAttribution | null {
  const params = new URLSearchParams(search.startsWith("?") ? search : `?${search}`);
  const ref = params.get("ref")?.trim();
  if (!ref) return null;
  const sourcePlatform =
    params.get("utm_source")?.trim() || params.get("src")?.trim() || undefined;
  const payload: OwnerrNetworkReferralAttribution = {
    referralCode: ref,
    capturedAt: Date.now(),
    sourcePlatform,
  };
  try {
    sessionStorage.setItem(REF_SESSION_KEY, JSON.stringify(payload));
    localStorage.setItem(REF_KEY, JSON.stringify(payload));
  } catch {
    /* quota */
  }
  return payload;
}

export function getStoredOwnerrNetworkReferral(): OwnerrNetworkReferralAttribution | null {
  try {
    const raw =
      sessionStorage.getItem(REF_SESSION_KEY) ?? localStorage.getItem(REF_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as OwnerrNetworkReferralAttribution;
  } catch {
    return null;
  }
}

export function clearOwnerrNetworkReferral(): void {
  try {
    sessionStorage.removeItem(REF_SESSION_KEY);
    localStorage.removeItem(REF_KEY);
  } catch {
    /* ignore */
  }
}

export function buildOwnerrNetworkReferralLink(origin: string, code: string): string {
  const base = origin.replace(/\/+$/, "");
  return `${base}/products/ownerr-network?ref=${encodeURIComponent(code)}`;
}
