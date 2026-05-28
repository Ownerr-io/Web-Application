const SHARE_CARD_FILE = "ownerr-os-share-card.jpg";

/** Root-relative URL for the share card (includes Vite `base` when set). */
export function publicAssetPath(fileName: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  const file = fileName.startsWith("/") ? fileName.slice(1) : fileName;
  return `${base}/${file}`;
}

export const OWNERR_OS_SHARE_CARD_PATH = publicAssetPath(SHARE_CARD_FILE);

export const OWNERR_OS_SHARE_CARD_FILE_NAME = SHARE_CARD_FILE;

export { OWNERR_OS_SOCIAL } from "@/lib/ownerr-os/social";

/** Public site origin for OG image URLs (must be crawlable in production). */
export function getPublicSiteOrigin(): string {
  const fromEnv = (
    import.meta.env.VITE_PUBLIC_SITE_URL as string | undefined
  )?.replace(/\/+$/, "");
  if (fromEnv) return fromEnv;
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}

export function getOwnerrOsShareCardUrl(): string {
  const origin = getPublicSiteOrigin();
  const path = OWNERR_OS_SHARE_CARD_PATH.startsWith("/")
    ? OWNERR_OS_SHARE_CARD_PATH
    : `/${OWNERR_OS_SHARE_CARD_PATH}`;
  return `${origin}${path}`;
}
