export const OWNERR_OS_SHARE_CARD_PATH = "/ownerr-os-share-card.jpeg";

export const OWNERR_OS_SOCIAL = {
  linkedin: "https://www.linkedin.com/company/ownerr/",
  instagram: "https://www.instagram.com/ownerr_os/",
  x: "https://x.com/OwnerrOS",
} as const;

/** Public site origin for OG image URLs (must be crawlable in production). */
export function getPublicSiteOrigin(): string {
  const fromEnv = (import.meta.env.VITE_PUBLIC_SITE_URL as string | undefined)?.replace(/\/+$/, "");
  if (fromEnv) return fromEnv;
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}

export function getOwnerrOsShareCardUrl(): string {
  return `${getPublicSiteOrigin()}${OWNERR_OS_SHARE_CARD_PATH}`;
}
