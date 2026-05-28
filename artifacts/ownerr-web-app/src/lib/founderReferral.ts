const REF_KEY = "ownerr_ref_attribution";
const REF_SESSION_KEY = "ownerr_ref_session";

export type ReferralAttribution = {
  referralCode: string;
  capturedAt: number;
  sourcePlatform?: string;
};

export function captureReferralFromSearch(
  search: string,
): ReferralAttribution | null {
  const params = new URLSearchParams(
    search.startsWith("?") ? search : `?${search}`,
  );
  const ref = params.get("ref")?.trim();
  if (!ref) return null;
  const sourcePlatform =
    params.get("utm_source")?.trim() ||
    params.get("src")?.trim() ||
    detectPlatformFromReferrer();
  const payload: ReferralAttribution = {
    referralCode: ref,
    capturedAt: Date.now(),
    sourcePlatform: sourcePlatform || undefined,
  };
  try {
    sessionStorage.setItem(REF_SESSION_KEY, JSON.stringify(payload));
    localStorage.setItem(REF_KEY, JSON.stringify(payload));
  } catch {
    /* ignore quota */
  }
  return payload;
}

export function getStoredReferralAttribution(): ReferralAttribution | null {
  try {
    const raw =
      sessionStorage.getItem(REF_SESSION_KEY) ?? localStorage.getItem(REF_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ReferralAttribution;
  } catch {
    return null;
  }
}

export function clearReferralAttribution(): void {
  try {
    sessionStorage.removeItem(REF_SESSION_KEY);
    localStorage.removeItem(REF_KEY);
  } catch {
    /* ignore */
  }
}

function detectPlatformFromReferrer(): string | undefined {
  if (typeof document === "undefined") return undefined;
  const ref = document.referrer.toLowerCase();
  if (!ref) return undefined;
  if (ref.includes("linkedin")) return "linkedin";
  if (ref.includes("twitter") || ref.includes("x.com")) return "twitter";
  if (ref.includes("instagram")) return "instagram";
  if (ref.includes("whatsapp")) return "whatsapp";
  return "referrer";
}

export function buildReferralLink(origin: string, code: string): string {
  const base = origin.replace(/\/+$/, "");
  return `${base}/ownerr-os/join?ref=${encodeURIComponent(code)}`;
}

export function generateReferralCode(length = 8): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += alphabet[bytes[i]! % alphabet.length];
  }
  return out;
}
