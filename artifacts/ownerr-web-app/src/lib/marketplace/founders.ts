import type { Founder, Startup } from '@/lib/marketplace/types';

export function buildFoundersFromStartups(startups: Startup[]): Founder[] {
  const map = new Map<string, Founder>();
  for (const s of startups) {
    const handle = s.founderHandle;
    const existing = map.get(handle);
    if (existing) {
      existing.startupSlugs.push(s.slug);
      continue;
    }
    map.set(handle, {
      handle,
      name: s.founderDisplayName ?? handle,
      twitter: `@${handle}`,
      avatarSeed: handle,
      bio: s.description.slice(0, 120),
      startupSlugs: [s.slug],
      skills: [s.category],
      lookingForCofounder: false,
    });
  }
  return [...map.values()];
}
