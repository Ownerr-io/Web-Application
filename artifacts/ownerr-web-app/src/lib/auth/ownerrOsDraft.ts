const STORAGE_KEY = 'ownerr_os_draft';

export type OwnerrOsDraft = {
  fullName: string;
  startupName: string;
  industry: string;
  ideaDescription: string;
  referralCode?: string;
  updatedAt: number;
};

export function persistOwnerrOsDraft(draft: Omit<OwnerrOsDraft, 'updatedAt'>): void {
  if (typeof window === 'undefined') return;
  try {
    const payload: OwnerrOsDraft = { ...draft, updatedAt: Date.now() };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
}

export function peekOwnerrOsDraft(): OwnerrOsDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw) as OwnerrOsDraft;
    if (!o.fullName?.trim() || !o.startupName?.trim() || !o.ideaDescription?.trim()) return null;
    return {
      fullName: o.fullName.trim(),
      startupName: o.startupName.trim(),
      industry: (o.industry ?? '').trim() || 'Other',
      ideaDescription: o.ideaDescription.trim(),
      referralCode: o.referralCode?.trim() || undefined,
      updatedAt: o.updatedAt ?? Date.now(),
    };
  } catch {
    return null;
  }
}

export function consumeOwnerrOsDraft(): OwnerrOsDraft | null {
  const draft = peekOwnerrOsDraft();
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }
  return draft;
}

export function clearOwnerrOsDraft(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function isOwnerrOsDraftComplete(draft: OwnerrOsDraft | null): boolean {
  if (!draft) return false;
  return (
    draft.fullName.length >= 2 &&
    draft.startupName.length >= 2 &&
    draft.ideaDescription.length >= 12
  );
}
