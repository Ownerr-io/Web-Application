import type { Startup } from '@/lib/mockData';
import { ensureStartupScores } from '@/lib/startupScores';

export const USER_STARTUPS_STORAGE_KEY = 'ownerr-user-startups';
export const USER_STARTUPS_CHANGED_EVENT = 'ownerr-user-startups-changed';

export function loadUserStartups(): Startup[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(USER_STARTUPS_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Startup[];
  } catch {
    return [];
  }
}

export function saveUserStartups(list: Startup[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(USER_STARTUPS_STORAGE_KEY, JSON.stringify(list));
  window.dispatchEvent(new Event(USER_STARTUPS_CHANGED_EVENT));
}

export function addUserStartup(startup: Startup) {
  const next = [startup, ...loadUserStartups()];
  saveUserStartups(next);
}

export function mergeWithUserStartups(base: Startup[]): Startup[] {
  const extra = typeof window === 'undefined' ? [] : loadUserStartups();
  return [...extra.map(ensureStartupScores), ...base.map(ensureStartupScores)];
}
