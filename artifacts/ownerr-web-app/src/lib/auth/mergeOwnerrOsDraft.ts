import type { User } from '@supabase/supabase-js';
import type { CreateFounderInput } from '@/lib/founderTypes';
import type { FounderSubmissionRecord } from '@/lib/founderTypes';
import { clearReferralAttribution, getStoredReferralAttribution } from '@/lib/founderReferral';
import { submitFounder, trackReferral, loadFounderSubmissionsForUser } from '@/lib/founderService';
import { provisionOwnerrProduct } from '@/lib/products/provision';
import { syncOwnerrFounderRole } from '@/lib/auth/syncOwnerrFounderRole';
import { consumeOwnerrOsDraft, peekOwnerrOsDraft, type OwnerrOsDraft } from '@/lib/auth/ownerrOsDraft';
import { PRODUCT_ROUTES } from '@/routing/routeRegistry';

export function draftToCreateFounderInput(draft: OwnerrOsDraft): CreateFounderInput {
  const tagline =
    draft.ideaDescription.length > 120
      ? `${draft.ideaDescription.slice(0, 117).trim()}…`
      : draft.ideaDescription;
  return {
    founderName: draft.fullName,
    startupName: draft.startupName,
    tagline,
    description: draft.ideaDescription,
    category: draft.industry || 'Other',
  };
}

/** After Google auth: persist draft to founder_submissions, provision OWNERR OS. */
export async function mergeOwnerrOsDraftAfterAuth(user: User): Promise<{
  record: FounderSubmissionRecord | null;
  merged: boolean;
}> {
  const existingList = await loadFounderSubmissionsForUser(user.id);
  if (existingList.length > 0) {
    consumeOwnerrOsDraft();
    await provisionOwnerrProduct(user);
    await syncOwnerrFounderRole();
    return { record: existingList[0]!, merged: false };
  }

  const draft = peekOwnerrOsDraft();
  if (!draft) {
    await provisionOwnerrProduct(user);
    await syncOwnerrFounderRole();
    return { record: null, merged: false };
  }

  const referralCode =
    draft.referralCode ?? getStoredReferralAttribution()?.referralCode ?? undefined;

  const { record } = await submitFounder(draftToCreateFounderInput(draft));
  consumeOwnerrOsDraft();

  if (referralCode) {
    await trackReferral(referralCode, 'signup', getStoredReferralAttribution()?.sourcePlatform);
    clearReferralAttribution();
  }

  await provisionOwnerrProduct(user);
  await syncOwnerrFounderRole();

  return { record, merged: true };
}

export function resolvePostOwnerrAuthPath(
  record: FounderSubmissionRecord | null,
  merged: boolean,
): string {
  if (record || merged) return PRODUCT_ROUTES.ownerrOsDashboard;
  return PRODUCT_ROUTES.ownerrOsJoin;
}
