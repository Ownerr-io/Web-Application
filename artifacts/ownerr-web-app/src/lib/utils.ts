import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number): string {
  return `$${Math.round(value).toLocaleString("en-US")}`;
}

export function formatShortCurrency(value: number): string {
  if (!Number.isFinite(value)) return '—';
  const abs = Math.abs(value);
  if (abs >= 1e12) {
    const t = value / 1e12;
    return `$${t % 1 === 0 ? t.toFixed(0) : t.toFixed(1)}T`;
  }
  if (abs >= 1e9) {
    const b = value / 1e9;
    return `$${b % 1 === 0 ? b.toFixed(0) : b.toFixed(1)}B`;
  }
  if (abs >= 1_000_000) {
    const m = value / 1_000_000;
    return `$${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}M`;
  }
  if (abs >= 1_000) {
    const k = value / 1_000;
    return `$${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}k`;
  }
  return `$${Math.round(value)}`;
}

const DICEBEAR = "https://api.dicebear.com/9.x";

/** Founder / investor face avatars — same style as the `/claim` roster (not startup logos). */
export function founderAvatarUrl(seed: string): string {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}`;
}

/**
 * Avatars for the feed: founder face when we know them, otherwise a stable shape
 * from startup name or post text (mock slugs like `mock-0` often have no Startup row).
 */
export function feedPostAvatarUrl(
  founder: { avatarSeed: string } | undefined,
  post: { startupName: string; startupSlug: string },
  startup: { name: string } | undefined,
): string {
  if (founder) {
    return founderAvatarUrl(founder.avatarSeed);
  }
  const seed = startup?.name ?? post.startupName ?? post.startupSlug;
  return `${DICEBEAR}/shapes/svg?seed=${encodeURIComponent(seed)}`;
}

export function dicebearShapesSvg(seed: string): string {
  return `${DICEBEAR}/shapes/svg?seed=${encodeURIComponent(seed)}`;
}

export function notionistsAvatarUrl(seed: string): string {
  return founderAvatarUrl(seed);
}
